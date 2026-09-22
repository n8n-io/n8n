import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		mains: 2,
		workers: 1,
		startupTimeoutMs: 180_000,
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-preview-recovery',
			NO_PROXY: 'license.n8n.io',
		},
	},
});

function modelReply(): string {
	const events = [
		{
			type: 'message_start',
			message: {
				id: 'msg_test',
				type: 'message',
				role: 'assistant',
				content: [],
				model: 'claude-sonnet-4-5',
				stop_reason: null,
				stop_sequence: null,
				usage: { input_tokens: 1, output_tokens: 0 },
			},
		},
		{ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
		{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'survived' } },
		{ type: 'content_block_stop', index: 0 },
		{
			type: 'message_delta',
			delta: { stop_reason: 'end_turn', stop_sequence: null },
			usage: { output_tokens: 1 },
		},
		{ type: 'message_stop' },
	];
	return events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');
}

test.describe(
	'Agent preview recovery @mode:multi-main',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test.skip(!!process.env.CI, 'This topology check runs only outside CI.');

		test('recovers through another main and stops only the accepted execution', async ({
			api,
			mainUrls,
			createApiForMain,
			n8nContainer,
		}) => {
			const proxy = n8nContainer.services.proxy;
			await proxy.clearAllExpectations();
			await proxy.failOnUnmatched();
			for (const delay of [120, 30]) {
				await proxy.createExpectation({
					httpRequest: { method: 'POST', path: '/v1/messages' },
					httpResponse: {
						statusCode: 200,
						headers: { 'Content-Type': ['text/event-stream'] },
						body: modelReply(),
						delay: { timeUnit: 'SECONDS', value: delay },
					},
					times: { remainingTimes: 1 },
				});
			}
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: 'Controlled model',
				type: 'anthropicApi',
				data: { apiKey: 'test-key' },
				projectId: project.id,
			});
			const agent = await api.agents.create(project.id, {
				name: 'Preview recovery',
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Return the requested text.',
			});
			const mainA = await createApiForMain(0);
			const mainB = await createApiForMain(1);
			const threadId = randomUUID();
			const otherThreadId = randomUUID();
			const executionIds = new Map<string, string>();
			try {
				const executionId = await mainA.agents.startAndDisconnect(
					mainUrls[0],
					project.id,
					agent.id,
					threadId,
				);
				executionIds.set(threadId, executionId);
				await expect
					.poll(async () => await proxy.verifyRequest({ method: 'POST', path: '/v1/messages' }, 1))
					.toBe(true);
				const recovered = await mainB.agents.history(project.id, agent.id, threadId);
				expect(recovered.activeExecutionId).toBe(executionId);
				expect(recovered.messages.filter((message) => message.role === 'assistant')).toEqual([]);
				const otherExecutionId = await mainA.agents.startAndDisconnect(
					mainUrls[0],
					project.id,
					agent.id,
					otherThreadId,
				);
				executionIds.set(otherThreadId, otherExecutionId);
				expect(await mainB.agents.stop(project.id, agent.id, threadId, executionId)).toEqual({
					cancelRequested: true,
				});
				await expect
					.poll(async () => await mainB.agents.executions(project.id, agent.id, threadId), {
						timeout: 15_000,
					})
					.toEqual([expect.objectContaining({ id: executionId, status: 'cancelled' })]);
				expect(
					(await mainB.agents.history(project.id, agent.id, threadId)).activeExecutionId,
				).toBeNull();
				expect(
					(await mainB.agents.history(project.id, agent.id, otherThreadId)).activeExecutionId,
				).toBe(otherExecutionId);
				await expect
					.poll(async () => await mainB.agents.executions(project.id, agent.id, otherThreadId), {
						timeout: 60_000,
					})
					.toEqual([expect.objectContaining({ id: otherExecutionId, status: 'success' })]);
				const other = await mainB.agents.history(project.id, agent.id, otherThreadId);
				expect(other.messages.flatMap((message) => message.content)).toContainEqual({
					type: 'text',
					text: 'survived',
				});
			} finally {
				for (const [id, executionId] of executionIds) {
					await mainB.agents.stop(project.id, agent.id, id, executionId);
				}
				await api.agents.delete(project.id, agent.id);
				await api.credentials.deleteCredential(credential.id);
				await proxy.clearAllExpectations();
			}
		});
	},
);
