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
			// Prevent community-node-types requests to api-staging.n8n.io
			// from polluting proxy recordings
			N8N_VERIFIED_PACKAGES_ENABLED: 'false',
		},
	},
} as const;

export const test = base.extend<InstanceAiFixtures>({
	anthropicApiKey: async ({}, use) => {
		await use(ANTHROPIC_API_KEY);
	},

	instanceAiProxySetup: [
		async ({ n8nContainer, backendUrl }, use, testInfo) => {
			// Local-build mode (no Docker container) — skip all proxy setup.
			// LLM calls go straight to Anthropic, no recording or replay.
			if (!n8nContainer) {
				await use(undefined);
				return;
			}
			const services = n8nContainer.services;
			const testSlug = slugify(testInfo.title);
			const folder = `instance-ai/${testSlug}`;

			await services.proxy.clearAllExpectations();

			// Install a success response for Slack's `users.profile.get` — the
			// backend's `POST /credentials/test` endpoint calls this when testing
			// a Slack API credential. Seed tokens in these tests are intentionally
			// fake, so hitting the real Slack API returns `invalid_auth` and the
			// frontend's `buildNodeCredentials` then drops the credential from
			// the apply payload (see `getEffectiveCredTestResult` in
			// `useCredentialTesting.ts`). By registering this mock FIRST (before
			// `loadExpectations`), mockserver's FIFO matching serves it ahead of
			// any stale recorded Slack response.
			await services.proxy.createExpectation({
				httpRequest: { method: 'GET', path: '/api/users.profile.get' },
				httpResponse: {
					statusCode: 200,
					headers: { 'Content-Type': ['application/json'] },
					body: JSON.stringify({
						ok: true,
						profile: {
							real_name: 'E2E Test User',
							email: 'e2e@example.test',
						},
					}),
				},
				times: { unlimited: true },
			});

			// Wipe instance-ai threads, per-thread in-memory state, background tasks,
			// and user workflows so the orchestrator's `list-workflows` tool can't see
			// leftovers from a prior test and contaminate this test's recorded responses.
			try {
				await fetch(`${backendUrl}/rest/instance-ai/test/reset`, { method: 'POST' });
			} catch {
				// Endpoint may not be available
			}

			// Recording mode: real API key, not CI → proxy forwards to real API,
			// backend records tool I/O. Replay mode: load existing expectations
			// and trace events so the proxy serves recorded responses and the
			// backend remaps tool IDs.
			const isRecording = !process.env.CI && HAS_REAL_API_KEY;

			if (!isRecording) {
				const traceEvents = await loadTraceFile(folder);
				await services.proxy.loadExpectations(folder, {
					sequential: true,
				});

				// Load trace events for replay ID remapping
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
			} else {
				// In recording mode, just activate the slug (no trace events to load)
				try {
					await fetch(`${backendUrl}/rest/instance-ai/test/tool-trace`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ slug: testSlug }),
					});
				} catch {
					// Trace endpoint may not be available
				}
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

						// Keep a minimal body matcher so the proxy can distinguish
						// between different LLM call types (title gen vs orchestrator
						// vs sub-agent) which may arrive in different order during replay.
						const request = expectation.httpRequest as {
							// eslint-disable-next-line id-denylist -- `string` is MockServer's body matcher field name
							body?: { type?: string; string?: string; json?: Record<string, unknown> };
						};
						if (request?.body) {
							const raw =
								request.body['string'] ??
								(request.body.json ? JSON.stringify(request.body.json) : undefined);
							if (raw) {
								try {
									const parsed = JSON.parse(raw) as { system?: string | unknown[] };
									// Extract a short substring from the system prompt to
									// distinguish title-generation from orchestrator from sub-agent.
									const system =
										typeof parsed.system === 'string'
											? parsed.system
											: Array.isArray(parsed.system)
												? JSON.stringify(parsed.system)
												: undefined;
									if (system) {
										const snippet = system.slice(0, 80);
										request.body = {
											type: 'STRING',
											// eslint-disable-next-line id-denylist -- `string` is MockServer's body matcher field name
											string: snippet,
											subString: true,
										} as unknown as typeof request.body;
									} else {
										delete request.body;
									}
								} catch {
									delete request.body;
								}
							} else {
								delete request.body;
							}
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
