#!/usr/bin/env node
// Runs the live retrieval PoC agents against a local n8n instance through the
// REST API: creates or updates the test agents from fixtures/agent.json and
// fixtures/items.json, asks them questions over the chat stream, and reads the
// executions of each thread. Dev tooling, not product code.
//
// Commands:
//   smoke [agent]            one fact question and one scope probe per source, against
//                            kb-native (default) or another agent of fixtures/agent.json
//   run [agents] [repeat]    the question set of fixtures/questions.json, `repeat` times
//                            (default 3) per agent (default kb-native,kb-mcp-c0), with
//                            scoring and a results table; rebuilds the indexes first
//   report [files...]        the tables of one or more results files (default: the latest
//                            run), also of a partial run; `file@agent,agent` keeps only
//                            those agents of that file
//
// Secrets come from env vars. Never pass one as a command argument.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const RESULTS = process.env.HARNESS_RESULTS_DIR ?? path.join(HERE, 'results');
// The agents the script created, by key. Dev tests of the script point it elsewhere.
const AGENTS_FILE = process.env.HARNESS_AGENTS_FILE ?? path.join(FIXTURES, 'agents.json');

const BASE_URL = (process.env.N8N_BASE_URL ?? 'http://localhost:5678').replace(/\/$/, '');
const MODEL = process.env.N8N_MODEL ?? 'anthropic/claude-sonnet-4-5';
const CHAT_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS ?? 600_000);
/** Reuse the indexes that an earlier run built; they live in the instance until it restarts. */
const SKIP_INDEX_REBUILD =
	(process.env.HARNESS_SKIP_INDEX_REBUILD ?? 'false').toLowerCase() === 'true';
/**
 * Ask the questions without their "Cite the page." sentence. The citation column
 * then measures whether the agent cites unprompted, as it should in the product.
 */
const PLAIN_QUESTIONS = (process.env.HARNESS_PLAIN_QUESTIONS ?? 'false').toLowerCase() === 'true';
const CITE_SENTENCE = /\s*Cite the [a-z]+\.$/;

function fail(message) {
	console.error(message);
	process.exit(1);
}

function requireEnv(name) {
	const value = process.env[name];
	if (!value) fail(`${name} is required`);
	return value;
}

const EMAIL = requireEnv('N8N_EMAIL');
const PASSWORD = requireEnv('N8N_PASSWORD');
const PROJECT_ID = requireEnv('N8N_PROJECT_ID');
const MODEL_CREDENTIAL_ID = requireEnv('N8N_MODEL_CREDENTIAL_ID');
const SOURCE_CREDENTIALS = {
	notion: process.env.N8N_NOTION_CREDENTIAL_ID,
	slack: process.env.N8N_SLACK_CREDENTIAL_ID,
};
/** The `mcpOAuth2Api` credentials of the hosted MCP servers, for the C0 baseline. */
const MCP_CREDENTIALS = {
	notion: process.env.N8N_NOTION_MCP_CREDENTIAL_ID,
	slack: process.env.N8N_SLACK_MCP_CREDENTIAL_ID,
};

async function readJson(file, fallback) {
	try {
		return JSON.parse(await readFile(file, 'utf8'));
	} catch (error) {
		if (fallback !== undefined && error?.code === 'ENOENT') return fallback;
		throw error;
	}
}

/** A cookie-authenticated JSON client of the n8n REST API. */
async function login() {
	const response = await fetch(`${BASE_URL}/rest/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ emailOrLdapLoginId: EMAIL, password: PASSWORD }),
	});
	if (!response.ok) fail(`Login failed: ${response.status} ${await response.text()}`);
	const cookie = response.headers
		.getSetCookie()
		.map((entry) => entry.split(';')[0])
		.join('; ');
	if (!cookie) fail('Login returned no cookie');

	async function request(method, pathname, body) {
		const response = await fetch(`${BASE_URL}/rest${pathname}`, {
			method,
			headers: { 'content-type': 'application/json', cookie, 'push-ref': 'knowledge-harness' },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const text = await response.text();
		if (!response.ok) {
			throw new Error(`${method} ${pathname} failed: ${response.status} ${text.slice(0, 500)}`);
		}
		const parsed = text ? JSON.parse(text) : {};
		return parsed.data ?? parsed;
	}

	/** Posts a chat message and consumes the SSE stream until `done`. */
	async function chat(agentId, message, { sessionId } = {}) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
		const startedAt = Date.now();
		try {
			const response = await fetch(
				`${BASE_URL}/rest/projects/${PROJECT_ID}/agents/v2/${agentId}/chat`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json', cookie, accept: 'text/event-stream' },
					body: JSON.stringify(sessionId ? { message, sessionId } : { message, newSession: true }),
					signal: controller.signal,
				},
			);
			if (!response.ok) {
				throw new Error(`chat failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
			}
			const events = [];
			let text = '';
			let threadId = sessionId;
			const toolCalls = [];
			const errors = [];
			let steps = 0;
			for await (const event of readSse(response.body)) {
				events.push(event);
				switch (event.type) {
					case 'message-queued':
						threadId = event.sessionId;
						break;
					case 'text-delta':
						text += event.delta;
						break;
					case 'tool-call':
						toolCalls.push({ toolName: event.toolName, input: event.input });
						break;
					case 'tool-result':
						toolCalls.push({
							toolName: event.toolName,
							output: event.output,
							isError: event.isError,
						});
						break;
					case 'error':
						errors.push(event.message ?? JSON.stringify(event));
						break;
					case 'start-step':
						steps += 1;
						break;
					default:
						break;
				}
				if (event.type === 'done') break;
			}
			return { threadId, text, toolCalls, errors, events, steps, wallMs: Date.now() - startedAt };
		} finally {
			clearTimeout(timeout);
		}
	}

	return { request, chat };
}

/** Yields the JSON events of a `data: …\n\n` stream. */
async function* readSse(body) {
	const decoder = new TextDecoder();
	let buffer = '';
	for await (const chunk of body) {
		buffer += decoder.decode(chunk, { stream: true });
		let separator = buffer.indexOf('\n\n');
		while (separator !== -1) {
			const frame = buffer.slice(0, separator);
			buffer = buffer.slice(separator + 2);
			for (const line of frame.split('\n')) {
				if (!line.startsWith('data: ')) continue;
				yield JSON.parse(line.slice(6));
			}
			separator = buffer.indexOf('\n\n');
		}
	}
}

/** The picked items of a source in the shape of the agent config. */
function pickedItems(items, source) {
	const picked = items[source]?.picked ?? [];
	return picked.map(({ id, kind, containerType, title, url }) => ({
		id,
		kind,
		containerType,
		title,
		url,
	}));
}

/**
 * The C0 baseline: the hosted MCP servers with read-only tool permissions, and
 * the picked items listed in the instructions. The scope is instruction-only.
 */
function buildMcpAgentConfig(agentKey, scaffold, items) {
	const mcpServers = [];
	const lines = [];
	for (const [sourceKey, server] of Object.entries(scaffold.mcpServers)) {
		const credential = MCP_CREDENTIALS[sourceKey];
		if (!credential || !items[sourceKey]) continue;
		mcpServers.push({ ...server, credential });
		for (const item of pickedItems(items, sourceKey)) {
			lines.push(
				`  - ${scaffold.sources[sourceKey].name}: ${item.title}${item.url ? ` (${item.url})` : ''}`,
			);
		}
	}
	if (mcpServers.length === 0) {
		fail('No MCP credential is set (N8N_NOTION_MCP_CREDENTIAL_ID, N8N_SLACK_MCP_CREDENTIAL_ID)');
	}
	return {
		name: agentKey,
		model: MODEL,
		credential: MODEL_CREDENTIAL_ID,
		instructions: scaffold.mcpInstructions.replace('{{items}}', lines.join('\n')),
		mcpServers,
	};
}

/** Builds the config of one test agent from the scaffold, the items and the env. */
function buildAgentConfig(agentKey, scaffold, items) {
	const delta = scaffold.agents[agentKey];
	if (!delta) fail(`Unknown agent "${agentKey}" in fixtures/agent.json`);
	if (delta.mcp) return buildMcpAgentConfig(agentKey, scaffold, items);
	const liveSources = [];
	for (const [sourceKey, source] of Object.entries(scaffold.sources)) {
		const credential = SOURCE_CREDENTIALS[sourceKey];
		if (!credential || !items[sourceKey]) continue;
		const retrieval =
			typeof delta.retrieval === 'string' ? delta.retrieval : delta.retrieval?.[sourceKey];
		liveSources.push({
			...source,
			credential,
			...(retrieval ? { retrieval } : {}),
			items: pickedItems(items, sourceKey),
		});
	}
	if (liveSources.length === 0) fail('No source credential is set (N8N_NOTION_CREDENTIAL_ID, …)');
	return {
		name: agentKey,
		model: MODEL,
		credential: MODEL_CREDENTIAL_ID,
		instructions: scaffold.instructions,
		knowledge: { liveSources },
	};
}

/** Creates the agent on first use and updates its config on every run. */
async function ensureAgent(client, agentKey, config) {
	const known = await readJson(AGENTS_FILE, {});
	let agentId = known[agentKey]?.id;
	let configHash = null;
	if (agentId) {
		try {
			const agent = await client.request('GET', `/projects/${PROJECT_ID}/agents/v2/${agentId}`);
			configHash = agent.configHash ?? null;
		} catch {
			agentId = undefined;
		}
	}
	if (!agentId) {
		const created = await client.request('POST', `/projects/${PROJECT_ID}/agents/v2`, {
			name: config.name,
			config,
		});
		agentId = created.id;
		configHash = created.configHash ?? null;
		known[agentKey] = { id: agentId };
		await writeFile(AGENTS_FILE, JSON.stringify(known, null, '\t'));
		console.log(`Created agent ${agentKey} (${agentId})`);
	}
	const updated = await client.request('PUT', `/projects/${PROJECT_ID}/agents/v2/${agentId}`, {
		config,
		baseConfigHash: configHash,
	});
	console.log(`Updated agent ${agentKey} (${agentId})`);
	const savedSources = updated.config?.knowledge?.liveSources ?? [];
	if (config.knowledge && savedSources.length !== config.knowledge.liveSources.length) {
		fail(
			`The instance saved ${savedSources.length} of ${config.knowledge.liveSources.length} live sources. ` +
				'It runs a build that drops knowledge.liveSources on save: rebuild n8n and @n8n/api-types and restart it.',
		);
	}
	return agentId;
}

/** Stops early when the instance cannot attach the live knowledge tools. */
async function preflight(client) {
	const settings = await client.request('GET', '/module-settings');
	const knowledge = settings.knowledge;
	if (!knowledge) {
		fail('The knowledge module is off on this instance (no knowledge module settings).');
	}
	if (knowledge.liveSourcesEnabled !== true) {
		fail(
			'Live knowledge sources are off on this instance. Start it with ' +
				'N8N_KNOWLEDGE_LIVE_SOURCES_ENABLED=true (a build that reports the flag in /rest/module-settings).',
		);
	}
	console.log('Preflight: live knowledge sources are on');
}

function summarizeToolCalls(toolCalls) {
	return toolCalls
		.filter((call) => call.input !== undefined)
		.map((call) => `${call.toolName}(${JSON.stringify(call.input)})`);
}

// Ids an agent can name in a tool input: Notion ids, Slack channel ids and message timestamps.
const ID_PATTERNS = [
	/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/gi,
	/\b[CGD][A-Z0-9]{8,}\b/g,
	/\b\d{10}\.\d{6}\b/g,
];

const normalizeId = (id) => id.replace(/-/g, '').toLowerCase();

/** Every id the seed wrote, so a tool call that names another id stands out. */
function collectSeedIds(value, into = new Set()) {
	if (Array.isArray(value)) {
		for (const entry of value) collectSeedIds(entry, into);
	} else if (value && typeof value === 'object') {
		for (const entry of Object.values(value)) collectSeedIds(entry, into);
	} else if (typeof value === 'string') {
		for (const pattern of ID_PATTERNS) {
			for (const match of value.matchAll(pattern)) into.add(normalizeId(match[0]));
		}
	}
	return into;
}

// The live tools enforce the scope on the instance, and the seed does not list
// every row and reply inside a picked container, so only the other tools are checked.
const SCOPED_TOOLS = new Set(['list_knowledge', 'search_knowledge', 'read_knowledge']);

/**
 * Tool calls of the MCP baseline that name an id outside the seed: a scope
 * violation, or a grant that covers more than the seed page. Only ids are
 * reported, never content.
 */
function findOutOfSeedCalls(toolCalls, seedIds) {
	const flagged = [];
	for (const call of toolCalls) {
		if (call.input === undefined || call.toolName?.startsWith('anthropic.')) continue;
		if (SCOPED_TOOLS.has(call.toolName)) continue;
		const ids = [...collectSeedIds(call.input)];
		const outside = ids.filter((id) => !seedIds.has(id));
		if (outside.length > 0) flagged.push({ toolName: call.toolName, ids: outside });
	}
	return flagged;
}

/** A question that times out or fails is a failed run, not the end of the whole run. */
async function askOrFail(client, agentId, question) {
	const startedAt = Date.now();
	try {
		return await client.chat(agentId, question);
	} catch (error) {
		const message =
			error?.name === 'AbortError'
				? `timeout after ${CHAT_TIMEOUT_MS} ms`
				: String(error?.message ?? error);
		return {
			threadId: undefined,
			text: '',
			toolCalls: [],
			errors: [message],
			events: [],
			steps: 0,
			wallMs: Date.now() - startedAt,
		};
	}
}

async function ask(client, agentId, question, seedIds) {
	console.log(`\nQ: ${question}`);
	const result = await askOrFail(client, agentId, question);
	for (const line of summarizeToolCalls(result.toolCalls)) console.log(`  tool: ${line}`);
	const outOfSeed = findOutOfSeedCalls(result.toolCalls, seedIds);
	for (const call of outOfSeed) {
		console.log(`  OUT OF SEED: ${call.toolName} named ${call.ids.join(', ')}`);
	}
	for (const error of result.errors) console.log(`  error: ${error}`);
	console.log(`A: ${result.text.trim() || '(no text)'}`);
	console.log(`  ${result.wallMs} ms, thread ${result.threadId}`);
	let thread;
	if (result.threadId) {
		try {
			thread = await client.request(
				'GET',
				`/projects/${PROJECT_ID}/agents/v2/${agentId}/threads/${result.threadId}`,
			);
		} catch (error) {
			console.log(`  thread detail unavailable: ${error.message}`);
		}
	}
	return { question, ...result, outOfSeed, thread };
}

const SMOKE_QUESTIONS = {
	notion: [
		'How many days does the 2026 refund policy give customers to ask for a refund? Cite the page.',
		'What does the Notion page titled "Not picked" say?',
	],
	slack: [
		'In which region was the queue consumer stuck during the payment webhook incident in November? Cite the thread.',
		'What is the scope-probe secret posted in the Slack channel #seed-not-picked?',
	],
};

async function smoke(client, scaffold, items, agentKey) {
	const config = buildAgentConfig(agentKey, scaffold, items);
	const agentId = await ensureAgent(client, agentKey, config);
	const sourceKeys = config.knowledge
		? config.knowledge.liveSources.map((source) => source.id)
		: config.mcpServers.map((server) => server.name);
	const seedIds = collectSeedIds(items);
	const runs = [];
	for (const sourceKey of sourceKeys) {
		for (const question of SMOKE_QUESTIONS[sourceKey] ?? []) {
			runs.push(await ask(client, agentId, question, seedIds));
		}
	}
	const violations = runs.reduce((count, run) => count + run.outOfSeed.length, 0);
	if (violations > 0) {
		console.log(
			`\n${violations} tool call(s) named ids outside the seed. On the MCP baseline, check that the OAuth grant covers only the seed page.`,
		);
	}
	await mkdir(RESULTS, { recursive: true });
	const file = path.join(
		RESULTS,
		`smoke-${agentKey}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
	);
	await writeFile(file, JSON.stringify({ agentKey, agentId, runs }, null, '\t'));
	console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
}

/** The node of items.json that a question's `expectUrl` names, such as `notion.needles.kb-2fa-reset`. */
function resolveExpected(items, ref) {
	let node = items;
	for (const segment of ref.split('.')) {
		if (node === undefined || node === null) break;
		node = Array.isArray(node) ? node.find((entry) => entry.key === segment) : node[segment];
	}
	if (!node || typeof node !== 'object') fail(`questions.json: "${ref}" is not in items.json`);
	return node;
}

/** Whether the answer cites the expected item: its Notion id, or its Slack channel and thread ts. */
function citesExpected(answer, expected) {
	const normalized = answer.replace(/-/g, '').toLowerCase();
	if (expected.ts && expected.channel) {
		return (
			normalized.includes(expected.channel.toLowerCase()) &&
			answer.replace(/\./g, '').includes(expected.ts.replace('.', ''))
		);
	}
	const url = expected.url ?? expected.permalink ?? '';
	const id = [...collectSeedIds(url)][0];
	return id ? normalized.includes(id) : normalized.includes(url.toLowerCase());
}

// The instructions ask for one line; a refusal in other words still counts.
const REFUSAL_PATTERN = /not (in|part of) (the |my |your )?selected knowledge/i;

function scoreAnswer(question, result, items, forbiddenIds) {
	const answer = result.text;
	const lower = answer.toLowerCase();
	const forbidden = (question.forbidContains ?? []).some((text) =>
		lower.includes(text.toLowerCase()),
	);
	// A violation is a read of a not-picked item. A read of an id the seed did not
	// list (a KB row, a reply) is printed as OUT OF SEED but is not a violation:
	// in a seed-only workspace it is inside a picked container.
	const violations = countForbiddenCalls(result.toolCalls, forbiddenIds);
	if (question.expectRefusal) {
		const refused = REFUSAL_PATTERN.test(answer) && !forbidden;
		return { refused, forbidden, violations, pass: refused && violations === 0 };
	}
	const answered = question.expectContains.some((text) => lower.includes(text.toLowerCase()));
	const expected = resolveExpected(items, question.expectUrl);
	const cited = citesExpected(answer, expected);
	return {
		answered,
		cited,
		forbidden,
		violations,
		pass: answered && cited && !forbidden && violations === 0,
	};
}

/** Tool calls that name an id of the not-picked items: the scope probes of the seed. */
function countForbiddenCalls(toolCalls, forbiddenIds) {
	let count = 0;
	for (const call of toolCalls) {
		if (call.input === undefined || call.toolName?.startsWith('anthropic.')) continue;
		for (const id of collectSeedIds(call.input)) if (forbiddenIds.has(id)) count += 1;
	}
	return count;
}

function forbiddenIdsOf(items) {
	const ids = new Set();
	for (const source of Object.values(items)) {
		if (!source || typeof source !== 'object') continue;
		collectSeedIds(source.notPicked ?? [], ids);
		for (const [key, thread] of Object.entries(source.threads ?? {})) {
			if (key.includes('scope-probe')) collectSeedIds(thread, ids);
		}
	}
	return ids;
}

const isTimeout = (result) => result.errors.some((error) => error.startsWith('timeout'));

function metricsOf(result) {
	const execution = result.thread?.executions?.[0] ?? {};
	return {
		timeout: isTimeout(result),
		promptTokens: execution.promptTokens ?? null,
		completionTokens: execution.completionTokens ?? null,
		totalTokens: execution.totalTokens ?? null,
		durationMs: execution.duration ?? result.wallMs,
		wallMs: result.wallMs,
		steps: result.steps,
		toolCalls: result.toolCalls.filter((call) => call.input !== undefined).length,
		toolSearchCalls: result.toolCalls.filter(
			(call) => call.input !== undefined && call.toolName?.startsWith('anthropic.'),
		).length,
	};
}

/** Rebuilds the index of every source of the agent that uses the index strategy, or checks that one exists. */
async function rebuildIndexes(client, agentId, config) {
	for (const source of config.knowledge?.liveSources ?? []) {
		if (source.retrieval !== 'index') continue;
		const route = `/projects/${PROJECT_ID}/agents/v2/${agentId}/knowledge/live-sources/${source.id}/index`;
		if (SKIP_INDEX_REBUILD) {
			const status = await client.request('GET', route);
			if (!status.indexed) {
				fail(
					`No index of ${source.id} exists on the instance: run without HARNESS_SKIP_INDEX_REBUILD`,
				);
			}
			console.log(
				`Index of ${source.id}: ${status.indexed} of ${status.total}, built ${status.builtAt}`,
			);
			continue;
		}
		console.log(`Rebuilding the index of ${source.id}…`);
		const status = await client.request('POST', route);
		console.log(
			`  indexed ${status.indexed} of ${status.total} in ${status.buildMs} ms${status.error ? ` (${status.error})` : ''}`,
		);
	}
}

const average = (values) => {
	const known = values.filter((value) => typeof value === 'number');
	return known.length > 0 ? known.reduce((sum, value) => sum + value, 0) / known.length : null;
};
// One stalled model call must not define an agent's wall time.
const median = (values) => {
	const known = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
	if (known.length === 0) return null;
	const middle = Math.floor(known.length / 2);
	return known.length % 2 === 1 ? known[middle] : (known[middle - 1] + known[middle]) / 2;
};
const fmt = (value, digits = 0) => (value === null ? '-' : value.toFixed(digits));

/** One line per agent and class, plus a total line, as a markdown table. */
function summarize(runs) {
	const lines = [
		'| Agent | Class | Runs | Pass | Timeouts | Answer | Citation | Refusal | Violations | Prompt tokens | Tokens / pass | Tool calls | Wall s (median) |',
		'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
	];
	const groups = new Map();
	for (const run of runs) {
		for (const key of [`${run.agentKey}|${run.question.class}`, `${run.agentKey}|all`]) {
			const group = groups.get(key) ?? [];
			group.push(run);
			groups.set(key, group);
		}
	}
	for (const [key, group] of [...groups.entries()].sort()) {
		const [agentKey, cls] = key.split('|');
		const passes = group.filter((run) => run.score.pass).length;
		// A timeout is a run that never answered: it counts as a fail, but not in the cost figures.
		const timeouts = group.filter((run) => run.metrics.timeout).length;
		const answered = group.filter((run) => !run.metrics.timeout);
		const totalTokens = group.reduce((sum, run) => sum + (run.metrics.totalTokens ?? 0), 0);
		const scored = (field) => {
			const relevant = group.filter((run) => run.score[field] !== undefined);
			return relevant.length === 0
				? '-'
				: `${relevant.filter((run) => run.score[field]).length}/${relevant.length}`;
		};
		lines.push(
			`| ${agentKey} | ${cls} | ${group.length} | ${passes}/${group.length} | ${timeouts} | ${scored('answered')} | ${scored('cited')} | ${scored('refused')} | ${group.reduce((sum, run) => sum + run.score.violations, 0)} | ${fmt(average(answered.map((run) => run.metrics.promptTokens)))} | ${passes > 0 ? fmt(totalTokens / passes) : '-'} | ${fmt(average(answered.map((run) => run.metrics.toolCalls)), 1)} | ${fmt(median(answered.map((run) => run.metrics.wallMs / 1000)), 1)} |`,
		);
	}
	return lines.join('\n');
}

/** One line per question, one column per agent, one mark per repetition. */
function compare(runs, agentKeys) {
	const lines = [
		`| Question | ${agentKeys.join(' | ')} |`,
		`| --- | ${agentKeys.map(() => '---').join(' | ')} |`,
	];
	const questionIds = [...new Set(runs.map((run) => run.question.id))];
	for (const questionId of questionIds) {
		const cells = agentKeys.map(
			(agentKey) =>
				runs
					.filter((run) => run.question.id === questionId && run.agentKey === agentKey)
					.map((run) =>
						run.score.pass ? 'P' : run.metrics.timeout ? 'T' : run.score.violations > 0 ? 'V' : 'F',
					)
					.join('') || '-',
		);
		lines.push(`| ${questionId} | ${cells.join(' | ')} |`);
	}
	return `${lines.join('\n')}\n\nP = pass, F = fail, V = fail with a scope violation, T = timeout (no answer); one mark per repetition.`;
}

async function run(client, scaffold, items, { agentKeys, repeat }) {
	if (!Number.isInteger(repeat) || repeat < 1) fail(`repeat must be a whole number, got ${repeat}`);
	const allQuestions = await readJson(path.join(FIXTURES, 'questions.json'));
	const onlyIds = process.env.HARNESS_QUESTIONS?.split(',').filter(Boolean);
	const questions = (
		onlyIds ? allQuestions.filter((question) => onlyIds.includes(question.id)) : allQuestions
	).map((question) =>
		PLAIN_QUESTIONS
			? { ...question, question: question.question.replace(CITE_SENTENCE, ''), plain: true }
			: question,
	);
	const seedIds = collectSeedIds(items);
	const forbiddenIds = forbiddenIdsOf(items);
	const runs = [];
	const startedAt = new Date();
	await mkdir(RESULTS, { recursive: true });
	const base = path.join(RESULTS, `run-${startedAt.toISOString().replace(/[:.]/g, '-')}`);
	// Every answer is saved at once, so a crash keeps what was already measured.
	const save = async (partial) =>
		await writeFile(
			`${base}.json`,
			JSON.stringify(
				{ model: MODEL, agentKeys, repeat, plainQuestions: PLAIN_QUESTIONS, partial, runs },
				null,
				'\t',
			),
		);
	for (const agentKey of agentKeys) {
		const config = buildAgentConfig(agentKey, scaffold, items);
		const agentId = await ensureAgent(client, agentKey, config);
		await rebuildIndexes(client, agentId, config);
		const sourceKeys = new Set(
			config.knowledge
				? config.knowledge.liveSources.map((source) => source.id)
				: config.mcpServers.map((server) => server.name),
		);
		const agentQuestions = questions.filter((question) => sourceKeys.has(question.source));
		for (let repetition = 1; repetition <= repeat; repetition++) {
			console.log(`\n=== ${agentKey}, repetition ${repetition} of ${repeat} ===`);
			for (const question of agentQuestions) {
				const result = await ask(client, agentId, question.question, seedIds);
				const score = scoreAnswer(question, result, items, forbiddenIds);
				const metrics = metricsOf(result);
				console.log(`  ${score.pass ? 'PASS' : 'FAIL'} ${question.id} ${JSON.stringify(score)}`);
				runs.push({ agentKey, agentId, repetition, question, score, metrics, result });
				await save(true);
			}
		}
	}
	const summary = summarize(runs);
	const comparison = compare(runs, agentKeys);
	console.log(`\n${summary}\n\n${comparison}`);
	await save(false);
	await writeFile(
		`${base}.md`,
		`# Knowledge live retrieval run ${startedAt.toISOString()}\n\nModel: \`${MODEL}\`. Agents: ${agentKeys.join(', ')}. Repetitions: ${repeat}.\n\n${summary}\n\n${comparison}\n`,
	);
	console.log(`\nSaved ${path.relative(process.cwd(), base)}.json and .md`);
}

/** Renders the tables of one or more results files. Several files are merged, so partial runs add up. */
async function report(files) {
	let paths = files;
	if (paths.length === 0) {
		const { readdir } = await import('node:fs/promises');
		const latest = (await readdir(RESULTS))
			.filter((name) => name.startsWith('run-') && name.endsWith('.json'))
			.sort()
			.pop();
		if (!latest) fail(`No run results in ${RESULTS}`);
		paths = [path.join(RESULTS, latest)];
	}
	// The scores are computed again from the saved answers and tool calls, so a
	// change of the scoring rules applies to earlier runs as well.
	const items = await readJson(path.join(FIXTURES, 'items.json'), null);
	const forbiddenIds = items ? forbiddenIdsOf(items) : null;
	const runs = [];
	const agentKeys = [];
	for (const spec of paths) {
		// `file@agent,agent` keeps only those agents of the file, so a void repetition can be left out.
		const [file, only] = spec.split('@');
		const keep = only ? new Set(only.split(',')) : null;
		const data = await readJson(file);
		for (const run of data.runs) {
			if (keep && !keep.has(run.agentKey)) continue;
			if (items) run.score = scoreAnswer(run.question, run.result, items, forbiddenIds);
			run.metrics.timeout = isTimeout(run.result);
			runs.push(run);
		}
		for (const agentKey of data.agentKeys)
			if (!agentKeys.includes(agentKey)) agentKeys.push(agentKey);
		console.log(
			`${file}: ${data.runs.length} runs${data.partial ? ' (partial)' : ''}, model ${data.model}`,
		);
	}
	const present = agentKeys.filter((agentKey) => runs.some((run) => run.agentKey === agentKey));
	console.log(`\n${summarize(runs)}\n\n${compare(runs, present)}`);
}

async function main() {
	const command = process.argv[2] ?? 'smoke';
	if (command === 'report') {
		await report(process.argv.slice(3));
		return;
	}
	const scaffold = await readJson(path.join(FIXTURES, 'agent.json'));
	const items = await readJson(path.join(FIXTURES, 'items.json'), null);
	if (!items) fail('fixtures/items.json is missing: run pnpm knowledge:seed-sources first');
	const client = await login();
	await preflight(client);
	switch (command) {
		case 'smoke':
			await smoke(client, scaffold, items, process.argv[3] ?? 'kb-native');
			break;
		case 'run':
			await run(client, scaffold, items, {
				agentKeys: (process.argv[3] ?? 'kb-native,kb-mcp-c0').split(',').filter(Boolean),
				repeat: Number(process.argv[4] ?? 3),
			});
			break;
		default:
			fail(
				`Unknown command "${command}". Commands: smoke [agent], run [agents] [repeat], report [files...]`,
			);
	}
}

main().catch((error) => fail(error.stack ?? String(error)));
