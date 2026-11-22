import type { AgentSseEvent } from '@n8n/api-types';
import type { ProxyServerRequest } from 'n8n-containers/services/proxy';
import type { N8NStack } from 'n8n-containers/stack';

import { TestError } from '../Types';

/** Shared helpers for the agent specs that run turns against a mocked Anthropic model. */

type Container = ReturnType<N8NStack['findContainers']>[number];

export const AGENT_TEST_MODEL = 'anthropic/claude-sonnet-4-5';

/** Turns whose message contains this marker hang far longer than any test waits. */
export const SLOW_TURN_MARKER = 'slow-turn';

export const anthropicMessage = {
	model: 'claude-sonnet-4-5',
	id: 'msg_agent_test',
	type: 'message',
	role: 'assistant',
	content: [],
	stop_reason: null,
	stop_sequence: null,
	usage: { input_tokens: 1, output_tokens: 1 },
};

export function executionId(events: AgentSseEvent[]) {
	return events.find((event) => event.type === 'execution-started')?.executionId;
}

export function replyText(events: AgentSseEvent[]) {
	return events
		.filter((event) => event.type === 'text-delta')
		.map(({ delta }) => delta)
		.join('');
}

/** An Anthropic Messages API event stream. */
export function anthropicSse(events: Array<{ type: string } & Record<string, unknown>>) {
	return events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');
}

/** An Anthropic event stream that answers with `text`. */
export function anthropicTextStream(text: string) {
	return anthropicSse([
		{ type: 'message_start', message: anthropicMessage },
		{ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
		{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
		{ type: 'content_block_stop', index: 0 },
		{
			type: 'message_delta',
			delta: { stop_reason: 'end_turn', stop_sequence: null },
			usage: { input_tokens: 1, output_tokens: 3 },
		},
		{ type: 'message_stop' },
	]);
}

/** A streamed Messages API request whose body contains `marker`. */
export function streamedRequestWith(marker: string): ProxyServerRequest {
	return {
		method: 'POST',
		path: '/v1/messages',
		body: { type: 'REGEX', regex: `(?s)(?=.*"stream"\\s*:\\s*true)(?=.*${marker}).*` },
	};
}

/**
 * Mock the model: streamed turns answer with `reply`, turns with
 * `SLOW_TURN_MARKER` hang for 300 s, and other calls (such as titles) get a
 * short text. Add more specific expectations before this call.
 */
export async function mockAnthropicText(stack: N8NStack, reply: string) {
	const proxy = stack.services.proxy;
	const eventStream = { 'Content-Type': ['text/event-stream'] };
	await proxy.createExpectation({
		httpRequest: streamedRequestWith(SLOW_TURN_MARKER),
		httpResponse: {
			statusCode: 200,
			headers: eventStream,
			body: anthropicTextStream(reply),
			delay: { timeUnit: 'SECONDS', value: 300 },
		},
		times: { unlimited: true },
	});
	await proxy.createExpectation({
		httpRequest: {
			method: 'POST',
			path: '/v1/messages',
			body: {
				type: 'JSON',
				json: JSON.stringify({ stream: true }),
				matchType: 'ONLY_MATCHING_FIELDS',
			},
		},
		httpResponse: { statusCode: 200, headers: eventStream, body: anthropicTextStream(reply) },
		times: { unlimited: true },
	});
	await proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/v1/messages' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({
				...anthropicMessage,
				content: [{ type: 'text', text: 'Agent test' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
}

/** Resolves true when `done` settles within `timeoutMs`, false otherwise. Clears its timer. */
export async function settlesWithin(done: Promise<unknown>, timeoutMs: number): Promise<boolean> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<false>((resolve) => {
		timer = setTimeout(() => resolve(false), timeoutMs);
	});
	try {
		return await Promise.race([done.then(() => true), timeout]);
	} finally {
		clearTimeout(timer);
	}
}

export interface AgentExecutionRow {
	id: string;
	source: string;
	status: string;
	ownerKey: string;
}

/** `postgres.exec` takes no bind parameters, so quote every value as a string literal. */
function sqlString(value: string) {
	return `'${value.replace(/'/g, "''")}'`;
}

const EXECUTION_COLUMNS = "e.id, coalesce(e.source, ''), e.status, coalesce(e.\"ownerKey\", '')";

function parseExecutionRows(output: string): AgentExecutionRow[] {
	return output
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [id = '', source = '', status = '', ownerKey = ''] = line.trim().split('\t');
			return { id, source, status, ownerKey };
		});
}

/** One `agent_execution` row, read straight from the database. */
export async function agentExecution(
	stack: N8NStack,
	id: string,
): Promise<AgentExecutionRow | undefined> {
	const output = await stack.services.postgres.exec(
		`SELECT ${EXECUTION_COLUMNS} FROM agent_execution e WHERE e.id = ${sqlString(id)}`,
	);
	return parseExecutionRows(output)[0];
}

/** Every turn of an agent, oldest first: its source, how it ended and which process ran it. */
export async function agentExecutions(
	stack: N8NStack,
	agentId: string,
): Promise<AgentExecutionRow[]> {
	const output = await stack.services.postgres.exec(
		`SELECT ${EXECUTION_COLUMNS}
		FROM agent_execution e JOIN agent_execution_threads t ON t.id = e."threadId"
		WHERE t."agentId" = ${sqlString(agentId)} ORDER BY e."createdAt"`,
	);
	return parseExecutionRows(output);
}

/**
 * SIGKILL the n8n process in a container, so no shutdown hook runs. Finds the
 * process by its command line, not by its place in the process tree. n8n sets
 * `process.title` to `n8n <command>`, which replaces the command line, and the
 * task runner is `n8n task-runner`, so match the n8n process roles only.
 */
export async function killN8nProcess(container: Container) {
	const result = await container.exec([
		'node',
		'-e',
		`
		const fs = require('node:fs');
		const pids = fs.readdirSync('/proc').filter((entry) => /^\\d+$/.test(entry) && Number(entry) !== process.pid);
		const n8n = pids.filter((pid) => {
			try {
				const args = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8').split('\\0').map((arg) => arg.trim());
				return /^n8n( (start|worker|webhook))?$/.test(args[0] ?? '') || args.some((arg) => /(^|\\/)n8n$/.test(arg));
			} catch {
				return false;
			}
		});
		if (n8n.length !== 1) throw new Error('Expected one n8n process, found: ' + n8n.join(', '));
		process.kill(Number(n8n[0]), 'SIGKILL');
	`,
	]);
	if (result.exitCode !== 0) throw new TestError(result.output);
}
