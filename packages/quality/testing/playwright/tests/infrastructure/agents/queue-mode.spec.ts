import type { AgentSseEvent } from '@n8n/api-types';
import type { N8NStack } from 'n8n-containers/stack';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';

// One main and one worker. The main runs agent turns; the worker must not
// change how turns finish, stop or recover.
test.use({
	capability: {
		workers: 1,
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-queue-mode',
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
			// The drain waits 70% of this window before it marks turns interrupted.
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '10',
		},
	},
});

const REPLY = 'Queue mode reply.';

function executionId(events: AgentSseEvent[]) {
	return events.find((event) => event.type === 'execution-started')?.executionId;
}

async function mockModel(stack: N8NStack) {
	const message = {
		model: 'claude-sonnet-4-5',
		id: 'msg_queue_mode',
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
				content: [{ type: 'text', text: 'Queue mode' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
}

test.describe(
	'Agents in queue mode @mode:queue',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('runs, stops and recovers agent turns with one main and one worker', async ({
			n8nContainer,
			api,
		}) => {
			test.setTimeout(300_000);
			assert(n8nContainer, 'This test needs a container stack');
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: 'Queue mode model',
				type: 'anthropicApi',
				data: { apiKey: 'queue-mode-key' },
			});
			const agent = await api.agents.create(project.id, {
				name: 'Queue mode',
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Reply briefly.',
			});
			await mockModel(n8nContainer);

			const [main] = n8nContainer.findContainers('-n8n$');
			assert(main, 'Main container not found');
			const streams: Array<Awaited<ReturnType<typeof api.agents.openChat>>> = [];
			const open = async (sessionId: string, message: string) => {
				// Docker can change the mapped port after a restart.
				const baseUrl = `http://${main.getHost()}:${main.getMappedPort(5678)}`;
				const stream = await api.agents.openChat(baseUrl, project.id, agent.id, {
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
			const executionRow = async (id: string) =>
				(
					await n8nContainer.services.postgres.exec(
						`SELECT status || '|' || coalesce("ownerKey", '') || '|' || coalesce("stopRequest", '') FROM agent_execution WHERE id = '${id}'`,
					)
				).trim();

			try {
				// A turn completes and records the main as its owner.
				const completedThread = randomUUID();
				const completed = await open(completedThread, 'hello');
				expect(await completed.done).toBeUndefined();
				expect(
					completed.events
						.filter((event) => event.type === 'text-delta')
						.map(({ delta }) => delta)
						.join(''),
				).toBe(REPLY);
				const completedId = executionId(completed.events);
				assert(completedId);
				const [status, ownerKey] = (await executionRow(completedId)).split('|');
				expect(status).toBe('success');
				expect(ownerKey).not.toBe('');

				// A stop ends a running turn.
				const stoppedThread = randomUUID();
				const stopped = await open(stoppedThread, 'slow-turn to stop');
				await expect.poll(() => executionId(stopped.events), { timeout: 30_000 }).toBeTruthy();
				const stoppedId = executionId(stopped.events)!;
				await api.agents.stop(project.id, agent.id, stoppedThread, stoppedId);
				await expect
					.poll(async () => await statuses(stoppedThread), { timeout: 30_000 })
					.toEqual(['cancelled']);
				expect((await executionRow(stoppedId)).split('|')[0]).toBe('cancelled');

				// A graceful restart marks a turn that outlives the drain as interrupted
				// at once. The sweeper would need minutes.
				const restartThread = randomUUID();
				const restarted = await open(restartThread, 'slow-turn across restart');
				await expect.poll(() => executionId(restarted.events), { timeout: 30_000 }).toBeTruthy();
				await main.restart({ timeout: 30_000 });
				await expect
					.poll(async () => (await executionRow(executionId(restarted.events)!)).split('|')[0], {
						timeout: 30_000,
						intervals: [1_000],
					})
					.toBe('interrupted');

				// The restarted main accepts new turns. Each attempt uses a new thread.
				let afterThread = '';
				await expect
					.poll(
						async () => {
							afterThread = randomUUID();
							try {
								const after = await open(afterThread, 'after restart');
								return await after.done;
							} catch (error) {
								return String(error);
							}
						},
						{ timeout: 120_000, intervals: [2_000] },
					)
					.toBeUndefined();
				expect(await statuses(afterThread)).toEqual(['success']);
			} finally {
				for (const stream of streams) stream.disconnect();
				await api.agents.delete(project.id, agent.id);
			}
		});
	},
);
