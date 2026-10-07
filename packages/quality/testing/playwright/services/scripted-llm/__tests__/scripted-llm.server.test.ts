import Anthropic from '@anthropic-ai/sdk';
import { createServer } from 'node:net';
import { afterEach, describe, expect, test } from 'vitest';

import { startScriptedLlm, type ScriptedLlm } from '../scripted-llm.server';
import type { ScriptInput } from '../scripted-llm.types';

const SEARCH_INPUT = { query: 'weather in Berlin', limit: 3, filters: { days: [1, 2] } };

const SEARCH_TOOL = {
	name: 'search',
	description: 'Search the web',
	input_schema: { type: 'object' as const, properties: { query: { type: 'string' } } },
};

const SCRIPT: ScriptInput = {
	rules: [
		{ id: 'after-search', when: { afterTool: 'search' }, reply: { text: 'It is sunny.' } },
		{
			id: 'call-search',
			when: { userText: 'weather', toolAvailable: 'search' },
			reply: { text: 'Let me look.', toolCalls: [{ name: 'search', input: SEARCH_INPUT }] },
		},
		{
			id: 'call-missing',
			when: { userText: 'delete' },
			reply: { toolCalls: [{ name: 'delete_all', input: {} }] },
		},
		{ id: 'greet', when: { userText: '^hello' }, reply: { text: 'Hi there.' } },
	],
	fallback: { text: 'No script step.' },
};

const servers: ScriptedLlm[] = [];

async function start(script: ScriptInput = SCRIPT, port?: number): Promise<ScriptedLlm> {
	const llm = await startScriptedLlm({ script, port });
	servers.push(llm);
	return llm;
}

function clientFor(llm: ScriptedLlm): Anthropic {
	return new Anthropic({ baseURL: llm.url, apiKey: 'test', maxRetries: 0 });
}

async function portIsFree(port: number): Promise<boolean> {
	return await new Promise((resolve) => {
		const probe = createServer();
		probe.once('error', () => resolve(false));
		probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
	});
}

afterEach(async () => {
	await Promise.all(servers.splice(0).map(async (llm) => await llm.stop()));
});

describe('startScriptedLlm', () => {
	test('binds to 127.0.0.1 on a port that the OS picks', async () => {
		const llm = await start();

		expect(llm.host).toBe('127.0.0.1');
		expect(llm.port).toBeGreaterThan(0);
		expect(llm.url).toBe(`http://127.0.0.1:${llm.port}`);
		expect(llm.modelUrl).toBe(`http://127.0.0.1:${llm.port}/v1`);
	});

	// The AI SDK Anthropic provider posts to `<baseURL>/messages` and does not add `/v1`.
	test('answers at `modelUrl` + /messages, the path that the AI SDK uses', async () => {
		const llm = await start();

		const response = await fetch(`${llm.modelUrl}/messages`, {
			method: 'POST',
			body: JSON.stringify({ model: 'm', messages: [{ role: 'user', content: 'hello' }] }),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			content: [{ type: 'text', text: 'Hi there.' }],
			stop_reason: 'end_turn',
		});
	});

	// The AI SDK does not add `/v1`, so a base URL without `/v1` posts to `/messages`.
	test('answers at `url` + /messages, the path for a base URL without /v1', async () => {
		const llm = await start();

		const response = await fetch(`${llm.url}/messages`, {
			method: 'POST',
			body: JSON.stringify({ model: 'm', messages: [{ role: 'user', content: 'hello' }] }),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ content: [{ type: 'text', text: 'Hi there.' }] });
		expect(llm.requests()).toEqual([expect.objectContaining({ ruleId: 'greet' })]);
	});

	test('streams the scripted tool call with the exact input', async () => {
		const llm = await start();

		const final = await clientFor(llm)
			.messages.stream({
				model: 'claude-scripted',
				max_tokens: 1024,
				tools: [SEARCH_TOOL],
				messages: [{ role: 'user', content: 'What is the weather?' }],
			})
			.finalMessage();

		expect(final.stop_reason).toBe('tool_use');
		expect(final.content).toEqual([
			expect.objectContaining({ type: 'text', text: 'Let me look.' }),
			expect.objectContaining({
				type: 'tool_use',
				id: 'toolu_scripted_1',
				name: 'search',
				input: SEARCH_INPUT,
			}),
		]);
		expect(llm.requests()).toEqual([
			{
				ruleId: 'call-search',
				stream: true,
				model: 'claude-scripted',
				lastUserText: 'What is the weather?',
				skippedTools: [],
			},
		]);
	});

	test('answers a non-streaming request with the scripted text', async () => {
		const llm = await start();

		const reply = await clientFor(llm).messages.create({
			model: 'claude-scripted',
			max_tokens: 1024,
			stream: false,
			messages: [{ role: 'user', content: 'Hello!' }],
		});

		expect(reply.content).toEqual([expect.objectContaining({ type: 'text', text: 'Hi there.' })]);
		expect(reply.stop_reason).toBe('end_turn');
		expect(reply.usage.input_tokens).toBeGreaterThan(0);
		expect(llm.requests()[0]).toMatchObject({ ruleId: 'greet', stream: false });
	});

	test('follows the `afterTool` rule when the next request holds the tool result', async () => {
		const llm = await start();
		const client = clientFor(llm);
		const question = { role: 'user' as const, content: 'What is the weather?' };
		const first = await client.messages
			.stream({
				model: 'claude-scripted',
				max_tokens: 1024,
				tools: [SEARCH_TOOL],
				messages: [question],
			})
			.finalMessage();
		const toolUse = first.content.find((block) => block.type === 'tool_use');

		const second = await client.messages
			.stream({
				model: 'claude-scripted',
				max_tokens: 1024,
				tools: [SEARCH_TOOL],
				messages: [
					question,
					{ role: 'assistant', content: first.content },
					{
						role: 'user',
						content: [
							{ type: 'tool_result', tool_use_id: toolUse!.id, content: '21 °C, clear sky' },
						],
					},
				],
			})
			.finalText();

		expect(second).toBe('It is sunny.');
		expect(llm.requests().map((entry) => entry.ruleId)).toEqual(['call-search', 'after-search']);
		expect(llm.requests()[1]).toMatchObject({
			lastToolResult: { toolName: 'search', text: '21 °C, clear sky', isError: false },
		});
		expect(llm.requests()[1].lastUserText).toBeUndefined();
	});

	test('records a tool call that the request does not offer and answers with the fallback', async () => {
		const llm = await start();

		const reply = await clientFor(llm).messages.create({
			model: 'claude-scripted',
			max_tokens: 1024,
			tools: [SEARCH_TOOL],
			messages: [{ role: 'user', content: 'Delete everything' }],
		});

		expect(reply.content).toEqual([
			expect.objectContaining({ type: 'text', text: 'No script step.' }),
		]);
		expect(reply.stop_reason).toBe('end_turn');
		expect(llm.requests()[0]).toMatchObject({
			ruleId: 'call-missing',
			skippedTools: ['delete_all'],
		});
	});

	test('counts tool-use ids across requests on one server', async () => {
		const llm = await start({
			rules: [{ id: 'r', when: {}, reply: { toolCalls: [{ name: 'search', input: {} }] } }],
		});
		const client = clientFor(llm);
		const params = {
			model: 'claude-scripted',
			max_tokens: 1024,
			tools: [SEARCH_TOOL],
			messages: [{ role: 'user' as const, content: 'go' }],
		};

		const first = await client.messages.create(params);
		const second = await client.messages.create(params);

		expect([first.content[0], second.content[0]]).toEqual([
			expect.objectContaining({ id: 'toolu_scripted_1', input: {} }),
			expect.objectContaining({ id: 'toolu_scripted_2', input: {} }),
		]);
	});

	test('sends SSE with the event-stream content type', async () => {
		const llm = await start();

		const response = await fetch(`${llm.url}/v1/messages`, {
			method: 'POST',
			body: JSON.stringify({
				model: 'm',
				stream: true,
				messages: [{ role: 'user', content: 'hello' }],
			}),
		});
		const body = await response.text();

		expect(response.headers.get('content-type')).toBe('text/event-stream');
		expect(body.startsWith('event: message_start\ndata: {')).toBe(true);
		expect(body.endsWith('event: message_stop\ndata: {"type":"message_stop"}\n\n')).toBe(true);
	});

	const unknownRoutes = [
		['GET', '/v1/messages'],
		['GET', '/messages'],
		['POST', '/v1/complete'],
		['POST', '/v1/messages/batches'],
		['POST', '/v2/messages'],
	] as const;
	for (const [method, path] of unknownRoutes) {
		test(`answers ${method} ${path} with a 404 error`, async () => {
			const llm = await start();

			const response = await fetch(`${llm.url}${path}`, { method });

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({
				type: 'error',
				error: { type: 'not_found_error', message: expect.stringContaining(path) },
			});
		});
	}

	test('answers malformed JSON with a 400 error', async () => {
		const llm = await start();

		const response = await fetch(`${llm.url}/v1/messages`, { method: 'POST', body: '{"model":' });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			type: 'error',
			error: { type: 'invalid_request_error', message: 'Request body is not valid JSON' },
		});
		expect(llm.requests()).toEqual([]);
	});

	test('answers JSON that is not a Messages request with a 400 error', async () => {
		const llm = await start();

		const response = await fetch(`${llm.url}/v1/messages`, {
			method: 'POST',
			body: JSON.stringify({ model: 'm', messages: 'hello' }),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			type: 'error',
			error: { type: 'invalid_request_error', message: expect.stringContaining('messages') },
		});
	});

	test('answers a body over 20 MB with a 413 error', async () => {
		const llm = await start();

		const response = await fetch(`${llm.url}/v1/messages`, {
			method: 'POST',
			body: 'x'.repeat(20 * 1024 * 1024 + 1),
		});

		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({
			type: 'error',
			error: { type: 'request_too_large', message: 'Request body is too large' },
		});
	});

	test('rejects an invalid script before it listens', async () => {
		await expect(
			startScriptedLlm({
				script: { rules: [{ id: 'r', when: { userText: '(' }, reply: { text: 'x' } }] },
			}),
		).rejects.toThrow(/Invalid scripted LLM script/);
	});

	test('rejects when the port is in use', async () => {
		const llm = await start();

		await expect(startScriptedLlm({ script: SCRIPT, port: llm.port })).rejects.toThrow(
			/EADDRINUSE/,
		);
	});

	test('frees the port on stop, also with an open keep-alive connection', async () => {
		const llm = await start();
		await clientFor(llm).messages.create({
			model: 'claude-scripted',
			max_tokens: 16,
			messages: [{ role: 'user', content: 'hello' }],
		});

		await llm.stop();
		await llm.stop();

		expect(await portIsFree(llm.port)).toBe(true);
		const again = await start(SCRIPT, llm.port);
		expect(again.port).toBe(llm.port);
	});

	test('resolves a second stop() during the close only after the first stop() resolves', async () => {
		const llm = await start();
		await clientFor(llm).messages.create({
			model: 'claude-scripted',
			max_tokens: 16,
			messages: [{ role: 'user', content: 'hello' }],
		});
		let firstStopDone = false;

		const firstStop = llm.stop().then(() => {
			firstStopDone = true;
		});
		await llm.stop();

		expect(firstStopDone).toBe(true);
		expect(await portIsFree(llm.port)).toBe(true);
		await firstStop;
	});

	test('returns copies from requests()', async () => {
		const llm = await start();
		await clientFor(llm).messages.create({
			model: 'claude-scripted',
			max_tokens: 16,
			messages: [{ role: 'user', content: 'hello' }],
		});

		llm.requests()[0].skippedTools.push('changed');
		llm.requests()[0].model = 'changed';
		llm.requests().pop();

		expect(llm.requests()).toEqual([
			expect.objectContaining({ ruleId: 'greet', model: 'claude-scripted', skippedTools: [] }),
		]);
	});
});
