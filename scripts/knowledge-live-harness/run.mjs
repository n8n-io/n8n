#!/usr/bin/env node
// Runs the live retrieval PoC agents against a local n8n instance through the
// REST API: creates or updates the test agents from fixtures/agent.json and
// fixtures/items.json, asks them questions over the chat stream, and reads the
// executions of each thread. Dev tooling, not product code.
//
// Commands:
//   smoke   one fact question and one scope probe against kb-native
//
// Secrets come from env vars. Never pass one as a command argument.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const RESULTS = path.join(HERE, 'results');
const AGENTS_FILE = path.join(FIXTURES, 'agents.json');

const BASE_URL = (process.env.N8N_BASE_URL ?? 'http://localhost:5678').replace(/\/$/, '');
const MODEL = process.env.N8N_MODEL ?? 'anthropic/claude-sonnet-4-5';
const CHAT_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS ?? 180_000);

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
					default:
						break;
				}
				if (event.type === 'done') break;
			}
			return { threadId, text, toolCalls, errors, events, wallMs: Date.now() - startedAt };
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

/** Builds the config of one test agent from the scaffold, the items and the env. */
function buildAgentConfig(agentKey, scaffold, items) {
	const delta = scaffold.agents[agentKey];
	if (!delta) fail(`Unknown agent "${agentKey}" in fixtures/agent.json`);
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
	if (savedSources.length !== config.knowledge.liveSources.length) {
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

async function ask(client, agentId, question) {
	console.log(`\nQ: ${question}`);
	const result = await client.chat(agentId, question);
	for (const line of summarizeToolCalls(result.toolCalls)) console.log(`  tool: ${line}`);
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
	return { question, ...result, thread };
}

async function smoke(client, scaffold, items) {
	const agentId = await ensureAgent(
		client,
		'kb-native',
		buildAgentConfig('kb-native', scaffold, items),
	);
	const runs = [];
	runs.push(
		await ask(
			client,
			agentId,
			'How many days does the 2026 refund policy give customers to ask for a refund? Cite the page.',
		),
	);
	runs.push(await ask(client, agentId, 'What does the Notion page titled "Not picked" say?'));
	await mkdir(RESULTS, { recursive: true });
	const file = path.join(RESULTS, `smoke-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
	await writeFile(file, JSON.stringify({ agentId, runs }, null, '\t'));
	console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
}

async function main() {
	const command = process.argv[2] ?? 'smoke';
	const scaffold = await readJson(path.join(FIXTURES, 'agent.json'));
	const items = await readJson(path.join(FIXTURES, 'items.json'), null);
	if (!items) fail('fixtures/items.json is missing: run pnpm knowledge:seed-sources first');
	const client = await login();
	await preflight(client);
	switch (command) {
		case 'smoke':
			await smoke(client, scaffold, items);
			break;
		default:
			fail(`Unknown command "${command}". Commands: smoke`);
	}
}

main().catch((error) => fail(error.stack ?? String(error)));
