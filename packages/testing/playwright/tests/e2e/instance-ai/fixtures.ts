import { promises as fs } from 'fs';
import type { Expectation } from 'mockserver-client';
import { join } from 'path';

import { test as base, expect as baseExpect } from '../../../fixtures/base';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';
const HAS_REAL_API_KEY = !!process.env.ANTHROPIC_API_KEY;
const EXPECTATIONS_DIR = './expectations';
const INSTANCE_AGENT_SYSTEM_PROMPT_ANCHOR = 'You are the n8n Instance Agent';
export const SKIP_PROXY_SETUP_ANNOTATION = 'skip-proxy-setup';
const SYSTEM_PROMPT_ANCHORS = [
	INSTANCE_AGENT_SYSTEM_PROMPT_ANCHOR,
	'You are the n8n Workflow Planner',
	'You are an expert n8n workflow builder',
	'You generate a short descriptive title for a conversation',
] as const;
const SUB_AGENT_INITIAL_PROMPT_ANCHORS = [
	'You are the n8n Workflow Planner',
	'You are an expert n8n workflow builder',
] as const;
const LEGACY_SYSTEM_ARRAY_PREFIX =
	/\\\[\\\{"type":"text","text":"(?=You are the n8n Instance Agent)/g;
const LEGACY_SYSTEM_STRING_PREFIX = '[{"type":"text","text":"';
const BODY_REGEX_WILDCARD = '[\\s\\S]*';
const ID_VALUE_PLACEHOLDER = '__INSTANCE_AI_ID_VALUE__';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

type TestInfoWithSlug = {
	title: string;
	annotations: Array<{ type: string; description?: string }>;
};

export function getInstanceAiTestSlug(testInfo: TestInfoWithSlug): string {
	const expectationSlug = testInfo.annotations.find(
		(annotation) => annotation.type === 'expectation-slug' && annotation.description,
	)?.description;

	return expectationSlug ?? slugify(testInfo.title);
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

type AnthropicMessage = {
	role?: unknown;
	content?: unknown;
};

type AnthropicContentBlock = {
	type?: unknown;
	text?: unknown;
	content?: unknown;
	name?: unknown;
	input?: unknown;
};

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPlannedTaskFollowUpType(value: string): string | undefined {
	for (const type of ['checkpoint', 'synthesize']) {
		if (value.includes(`planned-task-follow-up type=${type}`)) return type;
		if (value.includes(`planned-task-follow-up type="${type}"`)) return type;
		if (value.includes(`planned-task-follow-up type=\\"${type}\\"`)) return type;
		if (value.includes(`planned-task-follow-up type=\\\\"${type}\\\\"`)) return type;
	}

	return undefined;
}

function getLooselyUnescapedValue(value: string): string {
	let result = value;
	for (let i = 0; i < 4; i++) {
		const next = result.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
		if (next === result) break;
		result = next;
	}

	return result;
}

function getPlannedTaskFollowUpId(value: string): string | undefined {
	const normalized = getLooselyUnescapedValue(value);
	const match = normalized.match(/"id"\s*:\s*"([^"]+)"/);
	return match?.[1];
}

function getPlannedTaskFollowUpAnchor(value: string, type: string): string {
	const tagAnchor = escapeRegex(
		JSON.stringify(`<planned-task-follow-up type="${type}">`).slice(1, -1),
	);
	const taskId = getPlannedTaskFollowUpId(value);
	if (!taskId) return tagAnchor;

	return `${tagAnchor}[\\s\\S]{0,2000}${escapeRegex(taskId)}`;
}

function asContentBlocks(content: unknown): AnthropicContentBlock[] {
	if (typeof content === 'string') return [{ type: 'text', text: content }];
	if (!Array.isArray(content)) return [];
	return content.filter(
		(block): block is AnthropicContentBlock =>
			typeof block === 'object' && block !== null && !Array.isArray(block),
	);
}

function getStableTextAnchor(text: string): string | undefined {
	const trimmed = text
		.replace(/<current-datetime>[\s\S]*?<\/current-datetime>/g, '')
		.replace(/<user-timezone>[\s\S]*?<\/user-timezone>/g, '')
		.replace(/\b(ID|id):\s*[A-Za-z0-9_-]{8,}\b/g, `$1: ${ID_VALUE_PLACEHOLDER}`)
		.replace(/"([A-Za-z]*[Ii]d)"\s*:\s*"[^"]+"/g, `"$1":"${ID_VALUE_PLACEHOLDER}"`)
		.replace(/"([A-Za-z]*[Ii]d)"\s*:\s*\d+/g, `"$1":${ID_VALUE_PLACEHOLDER}`)
		.trimStart();
	if (!trimmed) return undefined;

	const plannedTaskFollowUpType = getPlannedTaskFollowUpType(trimmed);
	if (plannedTaskFollowUpType) {
		return getPlannedTaskFollowUpAnchor(trimmed, plannedTaskFollowUpType);
	}

	return escapeRegex(JSON.stringify(trimmed.slice(0, 120)).slice(1, -1)).replaceAll(
		ID_VALUE_PLACEHOLDER,
		'[A-Za-z0-9_-]+',
	);
}

function getStableToolInputAnchor(input: Record<string, unknown>): string | undefined {
	for (const key of ['action', 'toolName', 'format', 'query']) {
		const value = input[key];
		if (typeof value === 'string') {
			return `"${key}"\\s*:\\s*"${escapeRegex(value)}"`;
		}
	}

	const attachmentIndex = input.attachmentIndex;
	if (typeof attachmentIndex === 'number') {
		return `"attachmentIndex"\\s*:\\s*${attachmentIndex}`;
	}

	return undefined;
}

function getToolUseAnchor(block: AnthropicContentBlock, role?: unknown): string | undefined {
	if (block.type !== 'tool_use' || typeof block.name !== 'string') return undefined;

	const roleMatcher = role === 'assistant' ? '"role"\\s*:\\s*"assistant"[\\s\\S]{0,1500}' : '';
	const toolNameMatcher = `${roleMatcher}"type"\\s*:\\s*"tool_use"[\\s\\S]{0,300}"name"\\s*:\\s*"${escapeRegex(block.name)}"`;
	const input = block.input;
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return toolNameMatcher;
	}

	const stableInputAnchor = getStableToolInputAnchor(input as Record<string, unknown>);
	if (!stableInputAnchor) return toolNameMatcher;

	return `${toolNameMatcher}[\\s\\S]{0,800}${stableInputAnchor}`;
}

function parseJsonString(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

function getStableToolResultText(content: unknown): string | undefined {
	if (typeof content !== 'string') {
		return content === undefined ? undefined : getStableToolResultText(JSON.stringify(content));
	}

	const parsed = parseJsonString(content);
	if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
		const record = parsed as Record<string, unknown>;
		const workflows = record.workflows;
		if (Array.isArray(workflows)) {
			const workflowNames = workflows
				.map((workflow) =>
					typeof workflow === 'object' && workflow !== null && !Array.isArray(workflow)
						? Reflect.get(workflow, 'name')
						: undefined,
				)
				.filter((name): name is string => typeof name === 'string' && name.length > 0);
			if (workflowNames.length > 0) {
				return `"name":"${workflowNames[0]}"`;
			}
		}

		for (const key of ['approved', 'denied', 'success']) {
			if (typeof record[key] === 'boolean') {
				return `"${key}":${record[key]}`;
			}
		}
		for (const key of ['workflowName', 'fileName', 'title', 'status', 'name']) {
			const value = record[key];
			if (typeof value === 'string' && value.length > 0) {
				return `"${key}":"${value}"`;
			}
		}
		const result = record.result;
		if (typeof result === 'string' && result.length > 0) {
			return result;
		}
	}

	return content;
}

function getToolResultAnchor(block: AnthropicContentBlock, role?: unknown): string | undefined {
	if (block.type !== 'tool_result') return undefined;

	const roleMatcher = role === 'user' ? '"role"\\s*:\\s*"user"[\\s\\S]{0,1500}' : '';
	const toolResultMatcher = `${roleMatcher}"type"\\s*:\\s*"tool_result"`;
	const content = getStableToolResultText(block.content);
	if (!content) return toolResultMatcher;

	const textAnchor = getStableTextAnchor(content);
	return textAnchor ? `${toolResultMatcher}[\\s\\S]{0,2000}${textAnchor}` : toolResultMatcher;
}

function getLatestMessageAnchor(messages: AnthropicMessage[] | undefined): string | undefined {
	if (!messages) return undefined;

	for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
		const blocks = asContentBlocks(messages[messageIndex]?.content);
		for (let blockIndex = blocks.length - 1; blockIndex >= 0; blockIndex--) {
			const block = blocks[blockIndex];
			const toolResultAnchor = getToolResultAnchor(block, messages[messageIndex]?.role);
			if (toolResultAnchor) return toolResultAnchor;

			if (block.type === 'text' && typeof block.text === 'string') {
				const textAnchor = getStableTextAnchor(block.text);
				if (textAnchor) return textAnchor;
			}

			const toolUseAnchor = getToolUseAnchor(block, messages[messageIndex]?.role);
			if (toolUseAnchor) return toolUseAnchor;
		}
	}

	return undefined;
}

function findSystemPromptAnchorIndex(system: string): number {
	return SYSTEM_PROMPT_ANCHORS.reduce<number>((nearest, anchor) => {
		const index = system.indexOf(anchor);
		if (index < 0) return nearest;
		return nearest < 0 ? index : Math.min(nearest, index);
	}, -1);
}

function createAnthropicBodyMatcher(raw: string): { type: 'REGEX'; regex: string } | undefined {
	const parsed = JSON.parse(raw) as {
		system?: string | unknown[];
		messages?: AnthropicMessage[];
	};

	const system =
		typeof parsed.system === 'string'
			? parsed.system
			: Array.isArray(parsed.system)
				? JSON.stringify(parsed.system)
				: undefined;
	if (!system) return undefined;

	const anchorIndex = findSystemPromptAnchorIndex(system);
	const systemSnippetStart = anchorIndex >= 0 ? anchorIndex : 0;
	const systemSnippet = escapeRegex(system.slice(systemSnippetStart, systemSnippetStart + 80));
	const latestAnchor = getLatestMessageAnchor(parsed.messages);
	const isSubAgentRequest = SUB_AGENT_INITIAL_PROMPT_ANCHORS.some((anchor) =>
		system.includes(anchor),
	);
	const shouldUseSystemOnlyMatcher =
		isSubAgentRequest && latestAnchor !== undefined && !latestAnchor.includes('"type"\\s*');
	const latestMessageAnchor = shouldUseSystemOnlyMatcher ? undefined : latestAnchor;
	const matcher = latestMessageAnchor
		? `${systemSnippet}[\\s\\S]*${latestMessageAnchor}`
		: systemSnippet;

	return {
		type: 'REGEX',
		regex: `[\\s\\S]*${matcher}[\\s\\S]*`,
	};
}

type BodyMatcher = {
	type?: unknown;
	regex?: unknown;
	subString?: unknown;
	[key: string]: unknown;
};

function isBodyMatcher(body: unknown): body is BodyMatcher {
	return typeof body === 'object' && body !== null && !Array.isArray(body);
}

function isToolTraceEvent(event: unknown): boolean {
	if (typeof event !== 'object' || event === null || Array.isArray(event)) return false;

	const kind = Reflect.get(event, 'kind');
	return kind === 'tool-call' || kind === 'tool-suspend' || kind === 'tool-resume';
}

function getTraceEventKey(event: unknown): string | undefined {
	if (typeof event !== 'object' || event === null || Array.isArray(event)) return undefined;

	const agentRole = Reflect.get(event, 'agentRole');
	const toolName = Reflect.get(event, 'toolName');
	if (typeof agentRole !== 'string' || typeof toolName !== 'string') return undefined;

	return `${agentRole}:${toolName}`;
}

function hasUnpairedToolResume(events: unknown[]): boolean {
	const suspendedTools = new Set<string>();

	for (const event of events) {
		if (typeof event !== 'object' || event === null || Array.isArray(event)) continue;

		const kind = Reflect.get(event, 'kind');
		const key = getTraceEventKey(event);
		if (!key) continue;

		if (kind === 'tool-suspend') {
			suspendedTools.add(key);
		} else if (kind === 'tool-resume' && !suspendedTools.has(key)) {
			return true;
		}
	}

	return false;
}

function stripRecordedSystemPromptAnchor(regex: string): string {
	const anchorIndex = SYSTEM_PROMPT_ANCHORS.reduce<number>((nearest, anchor) => {
		const index = regex.indexOf(anchor);
		if (index < 0) return nearest;
		if (nearest < 0) return index;
		return Math.min(nearest, index);
	}, -1);

	if (anchorIndex < 0) return regex;

	const latestTurnAnchorIndex = regex.indexOf(BODY_REGEX_WILDCARD, anchorIndex);
	if (latestTurnAnchorIndex < 0) return regex;

	return `${BODY_REGEX_WILDCARD}${regex.slice(latestTurnAnchorIndex + BODY_REGEX_WILDCARD.length)}`;
}

function loosenRecordedInstanceAiPromptMatcher(expectation: Expectation): Expectation {
	const body = (expectation.httpRequest as { body?: unknown } | undefined)?.body;
	if (!isBodyMatcher(body)) return expectation;

	if (body.type === 'REGEX' && typeof body.regex === 'string') {
		let regex = body.regex.replaceAll('<id>', '[A-Za-z0-9_-]+');

		const subAgentSystemAnchor = SUB_AGENT_INITIAL_PROMPT_ANCHORS.find((anchor) =>
			regex.includes(anchor),
		);
		if (subAgentSystemAnchor && !regex.includes('"type"\\s*:\\s*"tool_use"')) {
			body.regex = `[\\s\\S]*${escapeRegex(subAgentSystemAnchor)}[\\s\\S]*`;
			return expectation;
		}

		if (regex.includes('<planned-task-follow-up')) {
			const plannedTaskFollowUpType = getPlannedTaskFollowUpType(regex);
			body.regex = plannedTaskFollowUpType
				? `[\\s\\S]*${getPlannedTaskFollowUpAnchor(regex, plannedTaskFollowUpType)}[\\s\\S]*`
				: '[\\s\\S]*<planned-task-follow-up[\\s\\S]*';
			return expectation;
		}

		regex = regex.replace(LEGACY_SYSTEM_ARRAY_PREFIX, '');
		body.regex = stripRecordedSystemPromptAnchor(regex);
	}

	const stringMatcher = body['string'];
	if (
		body.type === 'STRING' &&
		typeof stringMatcher === 'string' &&
		stringMatcher.startsWith(`${LEGACY_SYSTEM_STRING_PREFIX}${INSTANCE_AGENT_SYSTEM_PROMPT_ANCHOR}`)
	) {
		body['string'] = INSTANCE_AGENT_SYSTEM_PROMPT_ANCHOR;
		body.subString = true;
	}

	return expectation;
}

function isAnthropicMessagesExpectation(expectation: Expectation): boolean {
	const request = expectation.httpRequest as { path?: unknown } | undefined;
	return request?.path === '/v1/messages';
}

function getExpectationBodyText(expectation: Expectation): string | undefined {
	const body = (expectation.httpRequest as { body?: unknown } | undefined)?.body;
	if (typeof body === 'string') return body;
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;

	const bodyRecord = body as Record<string, unknown>;
	for (const key of ['string', 'regex']) {
		const value = bodyRecord[key];
		if (typeof value === 'string') return value;
	}

	const json = bodyRecord.json;
	return json === undefined ? undefined : JSON.stringify(json);
}

function isConversationTitleExpectation(expectation: Expectation): boolean {
	return (
		getExpectationBodyText(expectation)?.includes(
			'You generate a short descriptive title for a conversation',
		) === true
	);
}

function isReplayableAnthropicMessagesExpectation(expectation: Expectation): boolean {
	return (
		isAnthropicMessagesExpectation(expectation) && !isConversationTitleExpectation(expectation)
	);
}

function prioritizeSequentialExpectation(expectation: Expectation, fileName: string): Expectation {
	const sequence = Number.parseInt(fileName.slice(0, 4), 10);
	if (Number.isFinite(sequence)) {
		expectation.priority = 10_000 - sequence;
	}
	return expectation;
}

type InstanceAiFixtures = {
	anthropicApiKey: string;
	instanceAiProxySetup: undefined;
};

async function safeFetch(input: string, init: RequestInit = {}): Promise<Response | undefined> {
	try {
		return await fetch(input, { ...init, signal: AbortSignal.timeout(30_000) });
	} catch {
		return undefined;
	}
}

async function fetchOrThrow(
	input: string,
	init: RequestInit = {},
	description: string,
): Promise<Response> {
	const response = await safeFetch(input, init);
	if (!response) {
		throw new Error(`Instance AI test setup failed: ${description}`);
	}
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Instance AI test setup failed: ${description} (${response.status}) ${body}`);
	}
	return response;
}

function getIdleState(body: unknown): boolean | undefined {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;

	const data = Reflect.get(body, 'data');
	if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
		const idle = Reflect.get(data, 'idle');
		if (typeof idle === 'boolean') return idle;
	}

	const idle = Reflect.get(body, 'idle');
	return typeof idle === 'boolean' ? idle : undefined;
}

async function waitForInstanceAiIdle(backendUrl: string, testSlug: string): Promise<void> {
	const deadline = Date.now() + 120_000;

	while (Date.now() < deadline) {
		const response = await fetchOrThrow(
			`${backendUrl}/rest/instance-ai/test/idle`,
			{},
			`waiting for ${testSlug} to become idle`,
		);
		const body = (await response.json()) as unknown;
		if (getIdleState(body) === true) return;

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(
		`Instance AI test setup failed: timed out waiting for ${testSlug} to become idle`,
	);
}

export const instanceAiTestConfig = {
	timezoneId: 'America/New_York',
	capability: {
		// Instance AI does not support multi-main yet (implementation deferred):
		// agent-triggered manual executions fail on the multi-main offload path
		// (the worker job processor reads execution.data.manualData while
		// execution.data is undefined). Pin the stack to a single main so the
		// multi-main CI project still runs this suite against a supported
		// topology. Drop this override when multi-main support lands.
		mains: 1,
		services: ['proxy', 'sandbox'],
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: ANTHROPIC_API_KEY,
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_TIMEOUT: '600000',
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

			const skipsProxySetup = testInfo.annotations.some(
				(annotation) => annotation.type === SKIP_PROXY_SETUP_ANNOTATION,
			);
			if (skipsProxySetup) {
				await use(undefined);
				return;
			}
			const services = n8nContainer.services;
			const testSlug = getInstanceAiTestSlug(testInfo);
			const folder = `instance-ai/${testSlug}`;

			// Wipe instance-ai threads, per-thread in-memory state, background tasks,
			// and user workflows before clearing the proxy so cleanup traffic from a
			// previous test cannot be captured into this test's recording.
			await fetchOrThrow(
				`${backendUrl}/rest/instance-ai/test/reset`,
				{ method: 'POST' },
				'resetting test state',
			);
			await waitForInstanceAiIdle(backendUrl, testSlug);

			await services.proxy.reset();

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

			// Recording mode: real API key, not CI → proxy forwards to real API,
			// backend records tool I/O. Replay mode: load existing expectations
			// and trace events so the proxy serves recorded responses and the
			// backend remaps tool IDs.
			const isRecording = !process.env.CI && HAS_REAL_API_KEY;

			if (!isRecording) {
				const traceEvents = await loadTraceFile(folder);
				await services.proxy.loadExpectations(folder, {
					sequential: true,
					repeatLastResponse: false,
					filter: isReplayableAnthropicMessagesExpectation,
					transform: (expectation, fileName) =>
						prioritizeSequentialExpectation(
							loosenRecordedInstanceAiPromptMatcher(expectation),
							fileName,
						),
				});

				await fetchOrThrow(
					`${backendUrl}/rest/instance-ai/test/tool-trace`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							slug: testSlug,
							...(traceEvents.length > 0 ? { events: traceEvents } : {}),
						}),
					},
					`loading trace for ${testSlug}`,
				);
			} else {
				await fetchOrThrow(
					`${backendUrl}/rest/instance-ai/test/tool-trace`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ slug: testSlug }),
					},
					`activating trace for ${testSlug}`,
				);
			}

			await use(undefined);

			// Persist strictly on 'passed': a skipped test also satisfies
			// status === expectedStatus, and persisting for it clears the
			// expectations dir (clearDir) with no traffic to rewrite — silently
			// deleting the recordings of every quarantined/fixme'd test in the run.
			const shouldPersistRecording =
				!process.env.CI && HAS_REAL_API_KEY && testInfo.status === 'passed';

			if (shouldPersistRecording) {
				await waitForInstanceAiIdle(backendUrl, testSlug);

				const traceResponse = await fetchOrThrow(
					`${backendUrl}/rest/instance-ai/test/tool-trace/${testSlug}`,
					{},
					`fetching trace for ${testSlug}`,
				);
				const body = (await traceResponse.json()) as { data?: { events?: unknown[] } };
				const events = body?.data?.events ?? [];

				if (events.some(isToolTraceEvent) && hasUnpairedToolResume(events)) {
					throw new Error(
						`Refusing to persist invalid Instance AI recording "${testSlug}": trace contains a tool-resume without a preceding tool-suspend.`,
					);
				}

				await services.proxy.recordExpectations(folder, {
					clearDir: true,
					pathOrRequestDefinition: { path: '/v1/messages' },
					filter: isReplayableAnthropicMessagesExpectation,
					transform: (expectation) => {
						const response = expectation.httpResponse as {
							headers?: Record<string, string[]>;
						};

						if (response?.headers) {
							delete response.headers['anthropic-organization-id'];
						}

						// Keep a minimal body matcher so the proxy can distinguish
						// between agent type and stable turn context without matching
						// volatile tool output such as workflow and execution IDs.
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
									const bodyMatcher = createAnthropicBodyMatcher(raw);
									if (bodyMatcher) {
										request.body = bodyMatcher as unknown as typeof request.body;
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

				if (events.length > 0) {
					await writeTraceFile(folder, events);
				}
			}

			await safeFetch(`${backendUrl}/rest/instance-ai/test/tool-trace/${testSlug}`, {
				method: 'DELETE',
			});
		},
		{ auto: true },
	],
});

export const expect = baseExpect;
