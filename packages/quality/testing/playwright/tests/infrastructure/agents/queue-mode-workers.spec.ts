import type { AgentSseEvent } from '@n8n/api-types';
import type { N8NStack } from 'n8n-containers/stack';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';

// One main and one agent worker. The main sends chat turns to the worker. When
// the worker is gone, the main runs the turns itself.
test.use({
	capability: {
		workers: 1,
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-queue-workers',
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
			N8N_AGENTS_QUEUE_MODE_ENABLED: 'true',
			N8N_AGENTS_WORKER_ENABLED: 'true',
			// The drain waits 70% of this window before it marks turns interrupted.
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '10',
		},
	},
});

const REPLY = 'Agent worker reply.';

function executionId(events: AgentSseEvent[]) {
	return events.find((event) => event.type === 'execution-started')?.executionId;
}

function replyText(events: AgentSseEvent[]) {
	return events
		.filter((event) => event.type === 'text-delta')
		.map(({ delta }) => delta)
		.join('');
}

async function mockModel(stack: N8NStack) {
	const message = {
		model: 'claude-sonnet-4-5',
		id: 'msg_agent_worker',
		type: 'message',
		role: 'assistant',
		content: [],
		stop_reason: null,
		stop_sequence: null,
		usage: { input_tokens: 1, output_tokens: 1 },
	};
	const body = [
		{ type: 'message_start', message },
		{ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
		{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: REPLY } },
		{ type: 'content_block_stop', index: 0 },
		{
			type: 'message_delta',
			delta: { stop_reason: 'end_turn', stop_sequence: null },
			usage: { input_tokens: 1, output_tokens: 3 },
		},
		{ type: 'message_stop' },
	]
		.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
		.join('');
	// Turns that contain "slow-turn" hang long enough to outlive a restart.
	await stack.services.proxy.createExpectation({
		httpRequest: {
			method: 'POST',
			path: '/v1/messages',
			body: { type: 'REGEX', regex: '(?s)(?=.*"stream"\\s*:\\s*true)(?=.*slow-turn).*' },
		},
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['text/event-stream'] },
			body,
			delay: { timeUnit: 'SECONDS', value: 300 },
		},
		times: { unlimited: true },
	});
	await stack.services.proxy.createExpectation({
		httpRequest: {
			method: 'POST',
			path: '/v1/messages',
			body: {
				type: 'JSON',
				json: JSON.stringify({ stream: true }),
				matchType: 'ONLY_MATCHING_FIELDS',
			},
		},
		httpResponse: { statusCode: 200, headers: { 'Content-Type': ['text/event-stream'] }, body },
		times: { unlimited: true },
	});
	await stack.services.proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/v1/messages' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({
				...message,
				content: [{ type: 'text', text: 'Agent worker' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
}

test.describe(
	'Agent turns on workers @mode:queue',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('runs chat turns on the worker and falls back to the main without it', async ({
			n8nContainer,
			api,
		}) => {
			test.setTimeout(300_000);
			assert(n8nContainer, 'This test needs a container stack');
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: 'Agent worker model',
				type: 'anthropicApi',
				data: { apiKey: 'agent-worker-key' },
			});
			const agent = await api.agents.create(project.id, {
				name: 'Agent worker',
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Reply briefly.',
			});
			await mockModel(n8nContainer);

			const [worker] = n8nContainer.findContainers('-n8n-worker-1$');
			assert(worker, 'Worker container not found');

			const instanceKey = async (type: 'main' | 'worker') => {
				const { instances } = await api.getClusterInfo();
				return instances.find((instance) => instance.instanceType === type)?.instanceKey;
			};
			const workerKey = async () => {
				const { instances } = await api.getClusterInfo();
				return instances.find(
					(instance) =>
						instance.instanceType === 'worker' && instance.capabilities?.includes('agent-turns'),
				)?.instanceKey;
			};
			const streams: Array<Awaited<ReturnType<typeof api.agents.openChat>>> = [];
			const open = async (sessionId: string, message: string) => {
				const stream = await api.agents.openChat(n8nContainer.baseUrl, project.id, agent.id, {
					sessionId,
					message,
					messageId: randomUUID(),
					newSession: true,
				});
				streams.push(stream);
				return stream;
			};
			const statuses = async (threadId: string) =>
				(await api.agents.executions(project.id, agent.id, threadId)).map(({ status }) => status);
			const executionRow = async (id: string) => {
				const [status = '', ownerKey = ''] = (
					await n8nContainer.services.postgres.exec(
						`SELECT status || '|' || coalesce("ownerKey", '') FROM agent_execution WHERE id = '${id}'`,
					)
				)
					.trim()
					.split('|');
				return { status, ownerKey };
			};

			try {
				// The worker advertises that it runs agent turns.
				await expect.poll(workerKey, { timeout: 60_000 }).toBeTruthy();
				const firstWorkerKey = await workerKey();

				// A turn runs on the worker. Its reply streams back through the main.
				const completed = await open(randomUUID(), 'hello');
				expect(await completed.done).toBeUndefined();
				expect(replyText(completed.events)).toBe(REPLY);
				const completedId = executionId(completed.events);
				assert(completedId);
				expect(await executionRow(completedId)).toEqual({
					status: 'success',
					ownerKey: firstWorkerKey,
				});

				// A stop from the main ends a turn that runs on the worker.
				const stoppedThread = randomUUID();
				const stopped = await open(stoppedThread, 'slow-turn to stop');
				await expect.poll(() => executionId(stopped.events), { timeout: 30_000 }).toBeTruthy();
				const stoppedId = executionId(stopped.events)!;
				expect((await executionRow(stoppedId)).ownerKey).toBe(firstWorkerKey);
				await api.agents.stop(project.id, agent.id, stoppedThread, stoppedId);
				await expect
					.poll(async () => await statuses(stoppedThread), { timeout: 30_000 })
					.toEqual(['cancelled']);

				// A graceful worker restart marks a turn that outlives the drain as
				// interrupted at once.
				const restarted = await open(randomUUID(), 'slow-turn across restart');
				await expect.poll(() => executionId(restarted.events), { timeout: 30_000 }).toBeTruthy();
				const restartedId = executionId(restarted.events)!;
				expect((await executionRow(restartedId)).ownerKey).toBe(firstWorkerKey);
				await worker.restart({ timeout: 30_000 });
				await expect
					.poll(async () => (await executionRow(restartedId)).status, {
						timeout: 30_000,
						intervals: [1_000],
					})
					.toBe('interrupted');
				// The browser stream on the main ends instead of hanging.
				const streamEnd = await Promise.race([
					restarted.done.then(() => 'ended'),
					new Promise((resolve) => setTimeout(() => resolve('open'), 30_000)),
				]);
				expect(streamEnd).toBe('ended');

				// The restarted worker takes new turns.
				await expect
					.poll(workerKey, { timeout: 60_000 })
					.toEqual(expect.not.stringMatching(`^${firstWorkerKey}$`));
				const secondWorkerKey = await workerKey();
				const afterRestart = await open(randomUUID(), 'after worker restart');
				expect(await afterRestart.done).toBeUndefined();
				const afterRestartId = executionId(afterRestart.events);
				assert(afterRestartId);
				expect((await executionRow(afterRestartId)).ownerKey).toBe(secondWorkerKey);

				// Without an agent worker, the main runs the turn itself.
				await worker.stop({ timeout: 30_000 });
				await expect.poll(workerKey, { timeout: 30_000 }).toBeUndefined();
				const mainKey = await instanceKey('main');
				const fallback = await open(randomUUID(), 'no worker');
				expect(await fallback.done).toBeUndefined();
				expect(replyText(fallback.events)).toBe(REPLY);
				const fallbackId = executionId(fallback.events);
				assert(fallbackId);
				expect(await executionRow(fallbackId)).toEqual({ status: 'success', ownerKey: mainKey });
			} finally {
				for (const stream of streams) stream.disconnect();
				await api.agents.delete(project.id, agent.id);
			}
		});
	},
);
