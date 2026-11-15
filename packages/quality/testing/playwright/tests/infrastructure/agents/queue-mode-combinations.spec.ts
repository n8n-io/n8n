import type { AgentSseEvent } from '@n8n/api-types';
import type { N8NStack } from 'n8n-containers/stack';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// One main and one agent worker. These tests cover the agent paths that are
// not plain chat turns: tool approvals, workflow tools, the Responses API,
// agents in workflows, scheduled tasks, the turn time limit, load and a crash.
test.use({
	capability: {
		workers: 1,
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-queue-combinations',
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
			N8N_AGENTS_QUEUE_MODE_ENABLED: 'true',
			N8N_AGENTS_WORKER_ENABLED: 'true',
			N8N_AGENTS_WORKER_CONCURRENCY: '5',
			N8N_AGENTS_TURN_TIMEOUT: '20',
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '10',
		},
	},
});

const REPLY = 'Agent worker reply.';
const TOOL_REPLY = 'Tool done.';
const TOOL_NAME = 'echo_tool';
const WEBHOOK_REPLY = 'relayed-from-the-tool-workflow';

type Stream = Awaited<ReturnType<ApiHelpers['agents']['openChat']>>;

function executionId(events: AgentSseEvent[]) {
	return events.find((event) => event.type === 'execution-started')?.executionId;
}

function replyText(events: AgentSseEvent[]) {
	return events
		.filter((event) => event.type === 'text-delta')
		.map(({ delta }) => delta)
		.join('');
}

function sse(events: object[]) {
	return events
		.map(
			(event) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`,
		)
		.join('');
}

const message = {
	model: 'claude-sonnet-4-5',
	id: 'msg_agent_combinations',
	type: 'message',
	role: 'assistant',
	content: [],
	stop_reason: null,
	stop_sequence: null,
	usage: { input_tokens: 1, output_tokens: 1 },
};

function textBody(text: string) {
	return sse([
		{ type: 'message_start', message },
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

const streamed = (marker: string) => ({
	method: 'POST',
	path: '/v1/messages',
	body: { type: 'REGEX', regex: `(?s)(?=.*"stream"\\s*:\\s*true)(?=.*${marker}).*` },
});

async function mockModel(stack: N8NStack) {
	const proxy = stack.services.proxy;
	const eventStream = { 'Content-Type': ['text/event-stream'] };
	// The answer after the tool ran. The request still holds "use-tool", so
	// this expectation must come before the tool call.
	await proxy.createExpectation({
		httpRequest: streamed('"tool_result"'),
		httpResponse: { statusCode: 200, headers: eventStream, body: textBody(TOOL_REPLY) },
		times: { unlimited: true },
	});
	await proxy.createExpectation({
		httpRequest: streamed('use-tool'),
		httpResponse: {
			statusCode: 200,
			headers: eventStream,
			body: sse([
				{ type: 'message_start', message },
				{
					type: 'content_block_start',
					index: 0,
					content_block: { type: 'tool_use', id: `call_${nanoid(6)}`, name: TOOL_NAME, input: {} },
				},
				{
					type: 'content_block_delta',
					index: 0,
					delta: { type: 'input_json_delta', partial_json: JSON.stringify({ value: 'ping' }) },
				},
				{ type: 'content_block_stop', index: 0 },
				{
					type: 'message_delta',
					delta: { stop_reason: 'tool_use', stop_sequence: null },
					usage: { output_tokens: 3 },
				},
				{ type: 'message_stop' },
			]),
		},
		times: { unlimited: true },
	});
	// Turns that contain "slow-turn" hang far longer than the turn time limit.
	await proxy.createExpectation({
		httpRequest: streamed('slow-turn'),
		httpResponse: {
			statusCode: 200,
			headers: eventStream,
			body: textBody(REPLY),
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
		httpResponse: { statusCode: 200, headers: eventStream, body: textBody(REPLY) },
		times: { unlimited: true },
	});
	await proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/v1/messages' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({
				...message,
				content: [{ type: 'text', text: 'Agent combinations' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
}

function toolWorkflow(): Partial<IWorkflowBase> {
	return {
		name: `Agent echo tool ${nanoid(8)}`,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Start',
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: { inputSource: 'passthrough' },
			},
			{
				id: 'echo',
				name: 'Echo',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [220, 0],
				parameters: {
					assignments: {
						assignments: [{ id: 'echo', name: 'echo', value: 'pong', type: 'string' }],
					},
					options: {},
				},
			},
			{
				// Version 1 does not require a Webhook trigger. The agent adds the
				// body to the tool result, also when another process ran the workflow.
				id: 'respond',
				name: 'Respond',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1,
				position: [440, 0],
				parameters: {
					respondWith: 'json',
					responseBody: JSON.stringify({ reply: WEBHOOK_REPLY }),
					options: {},
				},
			},
		],
		connections: {
			Start: { main: [[{ node: 'Echo', type: 'main', index: 0 }]] },
			Echo: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

function agentWorkflow(agentId: string, path: string): Partial<IWorkflowBase> {
	return {
		name: `Agent in workflow ${nanoid(8)}`,
		active: false,
		nodes: [
			{
				id: 'webhook',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: randomUUID(),
				parameters: { httpMethod: 'POST', path, responseMode: 'lastNode', options: {} },
			},
			{
				id: 'agent',
				name: 'Message an Agent',
				type: 'n8n-nodes-base.messageAnAgent',
				typeVersion: 3.1,
				position: [220, 0],
				parameters: {
					agentId: { __rl: true, mode: 'id', value: agentId },
					message: 'Hello from a workflow',
				},
			},
		],
		connections: { Webhook: { main: [[{ node: 'Message an Agent', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

test.describe(
	'Agent paths on workers @mode:queue',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('runs every kind of agent turn on the worker, within the limits', async ({
			n8nContainer,
			api,
		}) => {
			test.setTimeout(600_000);
			assert(n8nContainer, 'This test needs a container stack');
			const stack = n8nContainer;
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: `Agent combinations model ${nanoid(8)}`,
				type: 'anthropicApi',
				data: { apiKey: 'agent-combinations-key' },
			});
			await mockModel(stack);

			const tool = await api.workflows.createWorkflow(toolWorkflow(), project.id);
			// A published agent can only use published workflow tools.
			await api.workflows.activate(tool.id, tool.versionId);
			const agent = await api.agents.create(project.id, {
				name: `Agent combinations ${nanoid(8)}`,
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Reply briefly.',
				tools: [
					{
						type: 'workflow',
						name: TOOL_NAME,
						workflow: tool.name,
						workflowId: tool.id,
						requireApproval: true,
					},
				],
			});
			// A scheduled task runs every minute once the agent is published.
			await api.agents.createTask(project.id, agent.id, {
				name: 'Every minute',
				objective: 'Say hello',
				cronExpression: '* * * * *',
				timezone: 'UTC',
			});
			await api.agents.connectIntegration(project.id, agent.id, {
				type: 'webhook',
				credentialId: '',
				settings: { authentication: 'none' },
			});
			await api.agents.publish(project.id, agent.id);

			const workerKey = async () => {
				const { instances } = await api.getClusterInfo();
				return instances.find(
					(instance) =>
						instance.instanceType === 'worker' && instance.capabilities?.includes('agent-turns'),
				)?.instanceKey;
			};
			// Every turn of the agent: where it came from, how it ended and which
			// process ran it.
			const turns = async () =>
				(
					await stack.services.postgres.exec(
						`SELECT e.id || '|' || coalesce(e.source, '') || '|' || e.status || '|' || coalesce(e."ownerKey", '')
						FROM agent_execution e JOIN agent_execution_threads t ON t.id = e."threadId"
						WHERE t."agentId" = '${agent.id}' ORDER BY e."createdAt"`,
					)
				)
					.trim()
					.split('\n')
					.filter(Boolean)
					.map((line) => {
						const [id, source, status, ownerKey] = line.trim().split('|');
						return { id, source, status, ownerKey };
					});
			const turn = async (id: string) => (await turns()).find((row) => row.id === id);

			const streams: Stream[] = [];
			const open = async (sessionId: string, text: string) => {
				const stream = await api.agents.openChat(stack.baseUrl, project.id, agent.id, {
					sessionId,
					message: text,
					messageId: randomUUID(),
					newSession: true,
				});
				streams.push(stream);
				return stream;
			};

			try {
				await expect.poll(workerKey, { timeout: 60_000 }).toBeTruthy();
				const worker = await workerKey();

				await test.step('a tool approval suspends on the worker and resumes on the worker', async () => {
					const suspended = await open(randomUUID(), 'use-tool please');
					expect(await suspended.done).toBeUndefined();
					const suspension = suspended.events.find((event) => event.type === 'tool-call-suspended');
					assert(suspension?.type === 'tool-call-suspended', 'The tool call did not suspend');
					const suspendedId = executionId(suspended.events);
					assert(suspendedId);
					expect((await turn(suspendedId))?.ownerKey).toBe(worker);

					const resumed = await api.agents.openResume(stack.baseUrl, project.id, agent.id, {
						runId: suspension.payload.runId,
						toolCallId: suspension.payload.toolCallId,
						resumeData: { approved: true },
					});
					streams.push(resumed);
					expect(await resumed.done).toBeUndefined();
					expect(resumed.events.filter((event) => event.type === 'error')).toEqual([]);
					expect(replyText(resumed.events)).toContain(TOOL_REPLY);
					// The workflow tool ran once, also in queue mode.
					await expect
						.poll(async () => (await api.workflows.getExecutions(tool.id)).length)
						.toBe(1);
					// The worker that ran the turn got the Respond to Webhook body of the
					// workflow job and passed it to the model in the tool result.
					const toolResults = (await stack.services.proxy.getReceivedRequests('/v1/messages'))
						.map((request) => JSON.stringify(request.body))
						.filter((body) => body.includes('tool_result'));
					expect(toolResults.length).toBeGreaterThan(0);
					expect(toolResults.some((body) => body.includes(WEBHOOK_REPLY))).toBe(true);
					// The suspended turn and its resume both ran on the worker.
					await expect
						.poll(async () => (await turns()).map(({ status, ownerKey }) => ({ status, ownerKey })))
						.toContainEqual({ status: 'success', ownerKey: worker });
					for (const row of await turns()) expect(row.ownerKey).toBe(worker);
				});

				await test.step('the Responses API runs the turn on the worker', async () => {
					const response = await fetch(`${stack.baseUrl}/agent-webhook/${agent.id}/responses`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ input: 'Hello from the Responses API' }),
					});
					const body = await response.text();
					expect(response.status, body).toBe(200);
					expect(body).toContain(REPLY);
					const conversation = (JSON.parse(body) as { conversation: { id: string } }).conversation;
					expect(conversation.id).toBeTruthy();
					const webhookTurns = (await turns()).filter((row) => row.source === 'webhook');
					expect(webhookTurns.length).toBeGreaterThan(0);
					for (const row of webhookTurns)
						expect(row).toMatchObject({ status: 'success', ownerKey: worker });
				});

				await test.step('an agent in a production workflow runs where the workflow runs', async () => {
					const path = `agent-${nanoid(8)}`;
					const workflow = await api.workflows.createWorkflow(
						agentWorkflow(agent.id, path),
						project.id,
					);
					await api.workflows.activate(workflow.id, workflow.versionId);
					const response = await api.webhooks.trigger(`/webhook/${path}`, {
						method: 'POST',
						data: {},
						maxNotFoundRetries: 20,
						notFoundRetryDelayMs: 500,
					});
					const body = await response.text();
					expect(response.status(), body).toBe(200);
					expect(body).toContain(REPLY);
					const workflowTurns = (await turns()).filter((row) => row.source === 'workflow');
					expect(workflowTurns).toHaveLength(1);
					// Production webhooks run on the worker in queue mode, and the agent
					// turn runs inside that execution.
					expect(workflowTurns[0]).toMatchObject({ status: 'success', ownerKey: worker });
				});

				await test.step('a scheduled task runs on the worker', async () => {
					await expect
						.poll(
							async () =>
								(await turns()).find((row) => row.source === 'task' && row.status === 'success'),
							{ timeout: 150_000, intervals: [5_000] },
						)
						.toMatchObject({ ownerKey: worker });
				});

				await test.step('the turn time limit stops a turn on the worker', async () => {
					const slow = await open(randomUUID(), 'slow-turn over the limit');
					await expect.poll(() => executionId(slow.events), { timeout: 30_000 }).toBeTruthy();
					const slowId = executionId(slow.events)!;
					expect((await turn(slowId))?.ownerKey).toBe(worker);
					await expect
						.poll(async () => (await turn(slowId))?.status, { timeout: 60_000, intervals: [1_000] })
						.toBe('error');
					const streamEnd = await Promise.race([
						slow.done.then(() => 'ended'),
						new Promise((resolve) => setTimeout(() => resolve('open'), 30_000)),
					]);
					expect(streamEnd).toBe('ended');
				});

				await test.step('the worker takes more turns than its concurrency at once', async () => {
					const started = Date.now();
					const batch = await Promise.all(
						Array.from(
							{ length: 8 },
							async (_, index) => await open(randomUUID(), `batch ${index}`),
						),
					);
					await Promise.all(batch.map(async (stream) => expect(await stream.done).toBeUndefined()));
					const elapsed = Date.now() - started;
					test.info().annotations.push({ type: 'batch-of-8-ms', description: String(elapsed) });
					for (const stream of batch) {
						expect(replyText(stream.events)).toBe(REPLY);
						const id = executionId(stream.events);
						assert(id);
						expect(await turn(id)).toMatchObject({ status: 'success', ownerKey: worker });
					}
					// A short mocked turn queues and streams back well within this budget.
					expect(elapsed).toBeLessThan(30_000);

					const latencies: number[] = [];
					for (let index = 0; index < 3; index++) {
						const start = Date.now();
						const single = await open(randomUUID(), `latency ${index}`);
						expect(await single.done).toBeUndefined();
						latencies.push(Date.now() - start);
					}
					test.info().annotations.push({
						type: 'single-turn-ms',
						description: latencies.join(', '),
					});
					expect(Math.max(...latencies)).toBeLessThan(10_000);
				});
			} finally {
				for (const stream of streams) stream.disconnect();
			}
		});

		test('marks a turn interrupted when its worker crashes', async ({ n8nContainer, api }) => {
			test.setTimeout(420_000);
			assert(n8nContainer, 'This test needs a container stack');
			const stack = n8nContainer;
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: `Agent crash model ${nanoid(8)}`,
				type: 'anthropicApi',
				data: { apiKey: 'agent-crash-key' },
			});
			const agent = await api.agents.create(project.id, {
				name: `Agent crash ${nanoid(8)}`,
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Reply briefly.',
			});
			await mockModel(stack);
			const [worker] = stack.findContainers('-n8n-worker-1$');
			assert(worker, 'Worker container not found');
			const column = async (id: string, name: string) =>
				(
					await stack.services.postgres.exec(
						`SELECT coalesce("${name}", '') FROM agent_execution WHERE id = '${id}'`,
					)
				).trim();
			const workerKey = async () => {
				const { instances } = await api.getClusterInfo();
				return instances.find(
					(instance) =>
						instance.instanceType === 'worker' && instance.capabilities?.includes('agent-turns'),
				)?.instanceKey;
			};
			await expect.poll(workerKey, { timeout: 60_000 }).toBeTruthy();
			const workerInstance = await workerKey();

			const stream = await api.agents.openChat(stack.baseUrl, project.id, agent.id, {
				sessionId: randomUUID(),
				// Long enough to outlive the crash, short enough to stay under the
				// turn limit of this file until the worker dies.
				message: 'slow-turn before a crash',
				messageId: randomUUID(),
				newSession: true,
			});
			try {
				await expect.poll(() => executionId(stream.events), { timeout: 30_000 }).toBeTruthy();
				const id = executionId(stream.events)!;
				expect(await column(id, 'ownerKey')).toBe(workerInstance);
				// A crash: SIGKILL the n8n process, so no shutdown hook can end the turn.
				// `docker stop` sends SIGTERM first, and n8n then stops the turn itself.
				const killed = await worker.exec([
					'node',
					'-e',
					"const c = require('node:fs').readFileSync('/proc/1/task/1/children', 'utf8').trim().split(' '); process.kill(Number(c[0]), 'SIGKILL');",
				]);
				expect(killed.exitCode, killed.output).toBe(0);
				// The leader sweeps the turn once its owner leaves the registry.
				await expect
					.poll(async () => await column(id, 'status'), { timeout: 300_000, intervals: [5_000] })
					.toBe('interrupted');
			} finally {
				stream.disconnect();
			}
		});
	},
);
