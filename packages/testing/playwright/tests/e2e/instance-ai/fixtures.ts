import { promises as fs } from 'fs';
import { join } from 'path';

import { test as base, expect as baseExpect } from '../../../fixtures/base';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';
const HAS_REAL_API_KEY = !!process.env.ANTHROPIC_API_KEY;
const EXPECTATIONS_DIR = './expectations';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

async function loadTraceFile(folder: string): Promise<unknown[]> {
	const filePath = join(EXPECTATIONS_DIR, folder, 'trace.jsonl');
	try {
		const content = await fs.readFile(filePath, 'utf8');
		return content
			.split('\n')
			.filter((line) => line.trim().length > 0)
			.map((line) => JSON.parse(line) as unknown);
	} catch {
		return [];
	}
}

async function writeTraceFile(folder: string, events: unknown[]): Promise<void> {
	const targetDir = join(EXPECTATIONS_DIR, folder);
	await fs.mkdir(targetDir, { recursive: true });
	const filePath = join(targetDir, 'trace.jsonl');
	const jsonl = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
	await fs.writeFile(filePath, jsonl);
}

type InstanceAiFixtures = {
	anthropicApiKey: string;
	instanceAiProxySetup: undefined;
};

export const instanceAiTestConfig = {
	timezoneId: 'America/New_York',
	capability: {
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: ANTHROPIC_API_KEY,
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_TRACE_REPLAY: 'true',
		},
	},
} as const;

export const test = base.extend<InstanceAiFixtures>({
	anthropicApiKey: async ({}, use) => {
		await use(ANTHROPIC_API_KEY);
	},

	instanceAiProxySetup: [
		async ({ services, backendUrl }, use, testInfo) => {
			const testSlug = slugify(testInfo.title);
			const folder = `instance-ai/${testSlug}`;

			await services.proxy.clearAllExpectations();

			// Load tool trace for ID remapping
			const traceEvents = await loadTraceFile(folder);

			// With a real API key and no trace file yet: recording mode.
			// Skip loading old expectations so the proxy forwards to the real API.
			// With trace file or no API key: replay mode — load expectations.
			const isRecording = !process.env.CI && HAS_REAL_API_KEY && traceEvents.length === 0;
			if (!isRecording) {
				await services.proxy.loadExpectations(folder, {
					sequential: true,
				});
			}

			// Activate the test slug (and optionally load trace events for replay)
			try {
				await fetch(`${backendUrl}/rest/instance-ai/test/tool-trace`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						slug: testSlug,
						...(traceEvents.length > 0 ? { events: traceEvents } : {}),
					}),
				});
			} catch {
				// Trace endpoint may not be available
			}

			await use(undefined);

			if (!process.env.CI && HAS_REAL_API_KEY) {
				await services.proxy.recordExpectations(folder, {
					clearDir: true,
					transform: (expectation) => {
						const response = expectation.httpResponse as {
							headers?: Record<string, string[]>;
						};

						if (response?.headers) {
							delete response.headers['anthropic-organization-id'];
						}

						// Strip request body entirely — matching uses method+path only.
						// Sequential ordering (remainingTimes: 1) handles disambiguation.
						const request = expectation.httpRequest as {
							body?: unknown;
						};
						if (request) {
							delete request.body;
						}

						return expectation;
					},
				});

				// Save tool trace events (slug-scoped)
				try {
					const traceResponse = await fetch(
						`${backendUrl}/rest/instance-ai/test/tool-trace/${testSlug}`,
					);
					if (traceResponse.ok) {
						const body = (await traceResponse.json()) as { data?: { events?: unknown[] } };
						const events = body?.data?.events ?? [];
						if (events.length > 0) {
							await writeTraceFile(folder, events);
						}
					}
				} catch {
					// Trace endpoint may not be available — skip silently
				}
			}

			// Clear trace events for this test
			try {
				await fetch(`${backendUrl}/rest/instance-ai/test/tool-trace/${testSlug}`, {
					method: 'DELETE',
				});
			} catch {
				// Trace endpoint may not be available
			}
		},
		{ auto: true },
	],
});

export const expect = baseExpect;
