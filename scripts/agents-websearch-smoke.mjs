#!/usr/bin/env node

import crypto from 'node:crypto';

const DEFAULT_BASE_URL = 'http://localhost:5678';
const DEFAULT_CASES = [
	'openai-auto-native',
	'openai-n8n-fallback',
	'openai-auto-blocked-fallback',
	'anthropic-auto-native',
	'openrouter-auto-fallback',
];

const PROVIDERS = {
	openai: {
		credentialTypes: ['openAiApi'],
		defaultModel: process.env.OPENAI_MODEL ?? 'gpt-5',
	},
	anthropic: {
		credentialTypes: ['anthropicApi'],
		defaultModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
	},
	openrouter: {
		credentialTypes: ['openRouterApi'],
		defaultModel: process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.6',
	},
};

const FALLBACK_CREDENTIAL_TYPES = ['braveSearchApi', 'searXngApi'];
const WEB_SEARCH_INSTRUCTIONS = [
	'You are a smoke-test agent.',
	'For every user request, use web search before answering.',
	'If a web_open tool is available, open the most relevant result before the final answer.',
	'Keep the final answer under three sentences.',
].join(' ');

const CASES = {
	'openai-auto-native': {
		provider: 'openai',
		webSearch: { mode: 'auto' },
		expectTool: /openai\.web_search|web_search/,
		expectProviderHosted: /openai\.web_search|web_search/,
	},
	'openai-n8n-fallback': {
		provider: 'openai',
		webSearch: { mode: 'n8n' },
		requiresFallbackCredential: true,
		expectTool: /^web_search$/,
		expectLocalTool: /^web_search$/,
		expectNotTool: /openai\.web_search/,
	},
	'openai-auto-blocked-fallback': {
		provider: 'openai',
		webSearch: { mode: 'auto', blockedDomains: ['reddit.com'] },
		requiresFallbackCredential: true,
		expectTool: /^web_search$/,
		expectLocalTool: /^web_search$/,
		expectNotTool: /openai\.web_search/,
	},
	'anthropic-auto-native': {
		provider: 'anthropic',
		webSearch: { mode: 'auto' },
		expectTool: /anthropic\.web_search/,
		expectProviderHosted: /anthropic\.web_search/,
	},
	'openrouter-auto-fallback': {
		provider: 'openrouter',
		webSearch: { mode: 'auto' },
		requiresFallbackCredential: true,
		expectTool: /^web_search$/,
		expectLocalTool: /^web_search$/,
	},
	'openrouter-provider-fails': {
		provider: 'openrouter',
		webSearch: { mode: 'provider' },
		expectError: /Model provider "openrouter" does not support provider-hosted web search/,
	},
};

function parseArgs(argv) {
	const args = {
		baseUrl: process.env.N8N_BASE_URL ?? DEFAULT_BASE_URL,
		projectId: process.env.N8N_PROJECT_ID,
		cases: process.env.N8N_WEBSEARCH_CASES?.split(',').filter(Boolean),
		keepAgents: process.env.N8N_KEEP_AGENTS === 'true',
		listCases: false,
	};

	for (let i = 2; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		}
		if (arg === '--list-cases') args.listCases = true;
		else if (arg === '--keep-agents') args.keepAgents = true;
		else if (arg === '--base-url') args.baseUrl = readValue(argv, ++i, arg);
		else if (arg === '--project-id') args.projectId = readValue(argv, ++i, arg);
		else if (arg === '--cases') args.cases = readValue(argv, ++i, arg).split(',').filter(Boolean);
		else throw new Error(`Unknown argument: ${arg}`);
	}

	args.baseUrl = args.baseUrl.replace(/\/$/, '');
	args.restBaseUrl = args.baseUrl.endsWith('/rest') ? args.baseUrl : `${args.baseUrl}/rest`;
	args.cases ??= DEFAULT_CASES;
	return args;
}

function readValue(argv, index, name) {
	const value = argv[index];
	if (!value) throw new Error(`${name} requires a value`);
	return value;
}

function printHelp() {
	console.log(`Usage:
  N8N_COOKIE='...' node scripts/agents-websearch-smoke.mjs [options]

Options:
  --base-url <url>       Local n8n URL. Defaults to ${DEFAULT_BASE_URL}
  --project-id <id>      Project id. Defaults to GET /projects/personal
  --cases <ids>          Comma-separated case ids. Defaults to the common provider matrix
  --keep-agents          Keep all created smoke-test agents for UI inspection
  --list-cases           Print available case ids

Auth:
  Preferred: set N8N_COOKIE to the browser cookie for localhost n8n.
  Alternative: set N8N_EMAIL and N8N_PASSWORD and the script will call /rest/login.

Credential selection:
  The script lists project-scoped credentials via /rest/credentials/for-workflow.
  To force a credential, set one of:
    N8N_OPENAI_CREDENTIAL_ID, N8N_ANTHROPIC_CREDENTIAL_ID,
    N8N_OPENROUTER_CREDENTIAL_ID, N8N_WEBSEARCH_CREDENTIAL_ID.

Model overrides:
  OPENAI_MODEL, ANTHROPIC_MODEL, OPENROUTER_MODEL.
`);
}

class RestClient {
	constructor({ restBaseUrl, cookie }) {
		this.restBaseUrl = restBaseUrl;
		this.cookie = cookie;
		this.browserId = crypto.randomUUID();
	}

	async login(email, password) {
		const response = await fetch(`${this.restBaseUrl}/login`, {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify({ email, password }),
		});
		if (!response.ok) throw await toHttpError('POST', '/login', response);

		const setCookie = getSetCookieHeaders(response.headers);
		const cookie = setCookie.map((entry) => entry.split(';')[0]).join('; ');
		if (!cookie) throw new Error('Login succeeded but no Set-Cookie header was returned');
		this.cookie = cookie;
		return this.unwrap(await response.json());
	}

	async request(method, path, bodyOrQuery) {
		const url = new URL(`${this.restBaseUrl}${path}`);
		const init = { method, headers: this.headers() };

		if (bodyOrQuery && ['GET', 'DELETE'].includes(method)) {
			for (const [key, value] of Object.entries(bodyOrQuery)) {
				if (value !== undefined) url.searchParams.set(key, String(value));
			}
		} else if (bodyOrQuery !== undefined) {
			init.body = JSON.stringify(bodyOrQuery);
		}

		const response = await fetch(url, init);
		if (!response.ok) throw await toHttpError(method, path, response);
		if (response.status === 204) return undefined;
		return this.unwrap(await response.json());
	}

	async stream(path, body) {
		const response = await fetch(`${this.restBaseUrl}${path}`, {
			method: 'POST',
			headers: {
				...this.headers(),
				Accept: 'text/event-stream',
			},
			body: JSON.stringify(body),
		});
		if (!response.ok) throw await toHttpError('POST', path, response);
		if (!response.body) throw new Error(`POST ${path} did not return a readable stream`);

		return await readSse(response.body);
	}

	headers() {
		return {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'browser-id': this.browserId,
			'push-ref': crypto.randomUUID(),
			...(this.cookie ? { Cookie: this.cookie } : {}),
		};
	}

	unwrap(payload) {
		if (payload && typeof payload === 'object' && Object.hasOwn(payload, 'data')) {
			return payload.data;
		}
		return payload;
	}
}

async function toHttpError(method, path, response) {
	const text = await response.text();
	let message = text;
	try {
		const parsed = JSON.parse(text);
		message = parsed.message ?? parsed.data?.message ?? text;
	} catch {}
	return new Error(`${method} ${path} failed with ${response.status}: ${message}`);
}

function getSetCookieHeaders(headers) {
	if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();

	const value = headers.get('set-cookie');
	if (!value) return [];

	return value.split(/,(?=\s*[^;,=]+=[^;,]+)/);
}

async function readSse(body) {
	const events = [];
	const decoder = new TextDecoder();
	let buffer = '';

	for await (const chunk of body) {
		buffer += decoder.decode(chunk, { stream: true });
		let boundary = buffer.indexOf('\n\n');
		while (boundary !== -1) {
			const frame = buffer.slice(0, boundary);
			buffer = buffer.slice(boundary + 2);
			parseSseFrame(frame, events);
			boundary = buffer.indexOf('\n\n');
		}
	}
	parseSseFrame(buffer, events);
	return events;
}

function parseSseFrame(frame, events) {
	const data = frame
		.split('\n')
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trimStart())
		.join('\n')
		.trim();
	if (!data) return;
	events.push(JSON.parse(data));
}

async function main() {
	const args = parseArgs(process.argv);
	if (args.listCases) {
		console.log(Object.keys(CASES).join('\n'));
		return;
	}

	const client = new RestClient({ restBaseUrl: args.restBaseUrl, cookie: process.env.N8N_COOKIE });
	if (!client.cookie) {
		const { N8N_EMAIL, N8N_PASSWORD } = process.env;
		if (!N8N_EMAIL || !N8N_PASSWORD) {
			throw new Error('Set N8N_COOKIE, or set N8N_EMAIL and N8N_PASSWORD for /rest/login');
		}
		await client.login(N8N_EMAIL, N8N_PASSWORD);
	}

	const projectId = args.projectId ?? (await client.request('GET', '/projects/personal')).id;
	const credentials = await listProjectCredentials(client, projectId);
	const fallbackCredential = selectFallbackCredential(credentials);
	const createdAgents = [];
	const results = [];

	console.log(`Project: ${projectId}`);
	console.log(
		`Fallback credential: ${
			fallbackCredential
				? `${fallbackCredential.name} (${fallbackCredential.type}, ${fallbackCredential.id})`
				: 'none found'
		}`,
	);
	console.log('');

	for (const caseId of args.cases) {
		const testCase = CASES[caseId];
		if (!testCase) throw new Error(`Unknown case "${caseId}". Run with --list-cases.`);

		const providerCredential = selectProviderCredential(credentials, testCase.provider);
		if (!providerCredential) {
			results.push({ caseId, status: 'skip', reason: `missing ${testCase.provider} credential` });
			continue;
		}
		if (testCase.requiresFallbackCredential && !fallbackCredential) {
			results.push({ caseId, status: 'skip', reason: 'missing Brave/SearXNG credential' });
			continue;
		}

		const result = await runCase(client, projectId, caseId, testCase, {
			providerCredential,
			fallbackCredential,
			createdAgents,
		});
		results.push(result);
	}

	printResults(results);
	if (!args.keepAgents) await deletePassingAgents(client, projectId, createdAgents, results);

	const failures = results.filter((result) => result.status === 'fail');
	const ran = results.filter((result) => result.status !== 'skip');
	if (ran.length === 0)
		throw new Error('No cases ran. Check credentials or pass --cases explicitly.');
	if (failures.length > 0) process.exitCode = 1;
}

async function listProjectCredentials(client, projectId) {
	try {
		return await client.request('GET', '/credentials/for-workflow', { projectId });
	} catch (error) {
		console.warn(`Could not list project-scoped credentials: ${error.message}`);
		console.warn('Falling back to GET /credentials.');
		return await client.request('GET', '/credentials');
	}
}

function selectProviderCredential(credentials, provider) {
	const forced = process.env[`N8N_${provider.toUpperCase()}_CREDENTIAL_ID`];
	const providerConfig = PROVIDERS[provider];
	if (!providerConfig) throw new Error(`No provider config for ${provider}`);

	return selectCredential(credentials, providerConfig.credentialTypes, forced);
}

function selectFallbackCredential(credentials) {
	return selectCredential(
		credentials,
		FALLBACK_CREDENTIAL_TYPES,
		process.env.N8N_WEBSEARCH_CREDENTIAL_ID,
	);
}

function selectCredential(credentials, credentialTypes, forcedId) {
	const candidates = credentials.filter((credential) => credentialTypes.includes(credential.type));
	if (forcedId) {
		const forced = candidates.find((credential) => credential.id === forcedId);
		if (!forced) {
			throw new Error(
				`Forced credential ${forcedId} was not found with type ${credentialTypes.join(' or ')}`,
			);
		}
		return forced;
	}

	return candidates.sort((a, b) => {
		const typeOrder = credentialTypes.indexOf(a.type) - credentialTypes.indexOf(b.type);
		if (typeOrder !== 0) return typeOrder;
		return a.name.localeCompare(b.name);
	})[0];
}

async function runCase(client, projectId, caseId, testCase, context) {
	const { providerCredential, fallbackCredential, createdAgents } = context;
	const provider = PROVIDERS[testCase.provider];
	const agentName = `web-search-smoke ${caseId} ${new Date().toISOString()}`;
	const agent = await client.request('POST', `/projects/${projectId}/agents/v2`, {
		name: agentName,
	});
	createdAgents.push({ id: agent.id, caseId });

	const config = makeAgentConfig(
		agentName,
		testCase,
		providerCredential,
		fallbackCredential,
		provider,
	);

	try {
		await client.request('PUT', `/projects/${projectId}/agents/v2/${agent.id}/config`, { config });
		const events = await client.stream(`/projects/${projectId}/agents/v2/${agent.id}/chat`, {
			message:
				'Search the web for the current n8n AI agent documentation and answer with one cited fact.',
			sessionId: crypto.randomUUID(),
		});

		const error = events.find((event) => event.type === 'error');
		if (testCase.expectError)
			return assertExpectedError(caseId, error, testCase.expectError, events);
		if (error) return fail(caseId, `SSE error: ${error.message}`);

		const done = [...events].reverse().find((event) => event.type === 'done');
		if (!done?.sessionId) return fail(caseId, 'SSE stream did not finish with a sessionId');

		const detail = await pollThreadDetail(client, projectId, done.sessionId, agent.id);
		const evidence = collectEvidence(events, detail);
		const missing =
			testCase.expectTool &&
			!evidence.toolNames.some((toolName) => testCase.expectTool.test(toolName));
		if (missing) {
			return fail(
				caseId,
				`expected tool ${testCase.expectTool}, saw ${evidence.toolNames.join(', ')}`,
			);
		}

		const missingLocal =
			testCase.expectLocalTool &&
			!evidence.localExecutionToolNames.some((toolName) => testCase.expectLocalTool.test(toolName));
		if (missingLocal) {
			return fail(
				caseId,
				`expected local execution for ${testCase.expectLocalTool}, saw local tools ${evidence.localExecutionToolNames.join(', ')}`,
			);
		}

		const unexpectedLocal =
			testCase.expectProviderHosted &&
			evidence.localExecutionToolNames.some((toolName) =>
				testCase.expectProviderHosted.test(toolName),
			);
		if (unexpectedLocal) {
			return fail(
				caseId,
				`expected provider-hosted search, but n8n executed local tool ${testCase.expectProviderHosted}`,
			);
		}

		const forbidden =
			testCase.expectNotTool &&
			evidence.toolNames.some((toolName) => testCase.expectNotTool.test(toolName));
		if (forbidden) return fail(caseId, `saw forbidden tool ${testCase.expectNotTool}`);

		return {
			caseId,
			status: 'pass',
			agentId: agent.id,
			sessionId: done.sessionId,
			tools: evidence.toolNames,
			localTools: evidence.localExecutionToolNames,
		};
	} catch (error) {
		if (testCase.expectError && testCase.expectError.test(error.message)) {
			return { caseId, status: 'pass', agentId: agent.id, expectedError: error.message };
		}
		return fail(caseId, error.message, agent.id);
	}
}

function makeAgentConfig(agentName, testCase, providerCredential, fallbackCredential, provider) {
	const webSearch = {
		enabled: true,
		...testCase.webSearch,
	};

	if (fallbackCredential) {
		webSearch.credential = {
			id: fallbackCredential.id,
			name: fallbackCredential.name,
			type: fallbackCredential.type,
		};
	}

	return {
		name: agentName,
		model: `${testCase.provider}/${provider.defaultModel}`,
		credential: providerCredential.id,
		instructions: WEB_SEARCH_INSTRUCTIONS,
		webSearch,
		config: {
			toolCallConcurrency: 1,
		},
	};
}

function assertExpectedError(caseId, error, expectedError, events) {
	if (!error)
		return fail(caseId, `expected error ${expectedError}, saw events: ${JSON.stringify(events)}`);
	if (!expectedError.test(error.message)) {
		return fail(caseId, `expected error ${expectedError}, got: ${error.message}`);
	}
	return { caseId, status: 'pass', expectedError: error.message };
}

async function pollThreadDetail(client, projectId, threadId, agentId) {
	let lastError;
	for (let attempt = 0; attempt < 20; attempt++) {
		try {
			const detail = await client.request(
				'GET',
				`/projects/${projectId}/agents/v2/threads/${threadId}`,
				{
					agentId,
				},
			);
			if (detail.executions?.length) return detail;
		} catch (error) {
			lastError = error;
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw lastError ?? new Error(`Thread ${threadId} was not recorded`);
}

function collectEvidence(events, detail) {
	const toolNames = new Set();
	const localExecutionToolNames = new Set();

	for (const event of events) {
		if (typeof event.toolName === 'string') toolNames.add(event.toolName);
		if (event.type === 'tool-execution-start' && typeof event.toolName === 'string') {
			localExecutionToolNames.add(event.toolName);
		}
		if (event.payload && typeof event.payload.toolName === 'string') {
			toolNames.add(event.payload.toolName);
		}
	}

	for (const execution of detail?.executions ?? []) {
		for (const call of execution.toolCalls ?? []) {
			if (typeof call.toolName === 'string') toolNames.add(call.toolName);
			if (typeof call.name === 'string') toolNames.add(call.name);
		}
		for (const entry of execution.timeline ?? []) {
			if (typeof entry.toolName === 'string') toolNames.add(entry.toolName);
			if (typeof entry.name === 'string') toolNames.add(entry.name);
		}
	}

	return {
		toolNames: [...toolNames].sort(),
		localExecutionToolNames: [...localExecutionToolNames].sort(),
	};
}

async function deletePassingAgents(client, projectId, createdAgents, results) {
	const failedOrSkipped = new Set(
		results.filter((result) => result.status !== 'pass').map((result) => result.caseId),
	);
	for (const agent of createdAgents) {
		if (failedOrSkipped.has(agent.caseId)) continue;
		await client.request('DELETE', `/projects/${projectId}/agents/v2/${agent.id}`);
	}
}

function fail(caseId, reason, agentId) {
	return { caseId, status: 'fail', reason, ...(agentId ? { agentId } : {}) };
}

function printResults(results) {
	for (const result of results) {
		if (result.status === 'skip') {
			console.log(`SKIP ${result.caseId}: ${result.reason}`);
		} else if (result.status === 'pass') {
			const details = [
				result.agentId ? `agent=${result.agentId}` : undefined,
				result.sessionId ? `session=${result.sessionId}` : undefined,
				result.tools?.length ? `tools=${result.tools.join(',')}` : undefined,
				result.localTools?.length ? `localTools=${result.localTools.join(',')}` : undefined,
				result.expectedError ? `expectedError=${result.expectedError}` : undefined,
			]
				.filter(Boolean)
				.join(' ');
			console.log(`PASS ${result.caseId}${details ? `: ${details}` : ''}`);
		} else {
			console.log(
				`FAIL ${result.caseId}: ${result.reason}${result.agentId ? ` agent=${result.agentId}` : ''}`,
			);
		}
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
