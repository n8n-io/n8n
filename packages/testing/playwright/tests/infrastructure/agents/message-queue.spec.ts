import type { AgentSseEvent } from '@n8n/api-types';
import type { N8NStack } from 'n8n-containers/stack';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';
import { TestError } from '../../../Types';

test.use({
	capability: {
		mains: 2,
		workers: 1,
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-message-queue',
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		},
	},
});

async function signalMain(stack: N8NStack, index: number, signal: 'SIGSTOP' | 'SIGCONT') {
	const [container] = stack.findContainers(`-n8n-main-${index + 1}$`);
	if (!container) throw new TestError('Main container not found');
	const result = await container.exec([
		'node',
		'-e',
		`
		const fs = require('node:fs');
		const children = fs.readFileSync('/proc/1/task/1/children', 'utf8').trim().split(/\\s+/);
		if (children.length !== 1 || !Number(children[0])) throw new Error('Expected one n8n process');
		process.kill(Number(children[0]), '${signal}');
	`,
	]);
	if (result.exitCode !== 0) throw new TestError(result.output);
}

function executionId(events: AgentSseEvent[]) {
	return events.find((event) => event.type === 'execution-started')?.executionId;
}

async function mockModel(stack: N8NStack) {
	const message = {
		model: 'claude-sonnet-4-5',
		id: 'msg_fifo',
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
		{
			type: 'content_block_delta',
			index: 0,
			delta: { type: 'text_delta', text: 'Controlled reply.' },
		},
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
	for (const { marker, delay } of [
		{ marker: 'fifo-blocked', delay: 300 },
		{ marker: 'fifo-crash', delay: 300 },
		{ marker: 'fifo-remote', delay: 5 },
	]) {
		await stack.services.proxy.createExpectation({
			httpRequest: {
				method: 'POST',
				path: '/v1/messages',
				body: { type: 'REGEX', regex: `(?s)(?=.*"stream"\\s*:\\s*true)(?=.*${marker}).*` },
			},
			httpResponse: {
				statusCode: 200,
				headers: { 'Content-Type': ['text/event-stream'] },
				body,
				delay: { timeUnit: 'SECONDS', value: delay },
			},
			times: { remainingTimes: 1 },
		});
	}
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
				content: [{ type: 'text', text: 'Queue test' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
}

test.describe(
	'Agent message queue @mode:multi-main',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('preserves FIFO, relays remote output, and recovers accepted messages after a main crash', async ({
			n8nContainer,
			createApiForMain,
			mainUrls,
		}) => {
			test.setTimeout(360_000);
			assert(n8nContainer, 'This test needs a container stack');
			const ingress = await createApiForMain(0);
			const consumer = await createApiForMain(1);
			const clients = [ingress, consumer];
			const project = await ingress.projects.getMyPersonalProject();
			const credential = await ingress.credentials.createCredential({
				name: 'Queue model',
				type: 'anthropicApi',
				data: { apiKey: 'queue-test-key' },
			});
			const agent = await ingress.agents.create(project.id, {
				name: 'Queue test',
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Reply briefly.',
			});
			await mockModel(n8nContainer);
			const streams: Array<Awaited<ReturnType<typeof ingress.agents.openChat>>> = [];
			const open = async (main: 0 | 1, sessionId: string, message: string, newSession?: true) => {
				const api = clients[main];
				const stream = await api.agents.openChat(mainUrls[main], project.id, agent.id, {
					sessionId,
					message,
					newSession,
				});
				streams.push(stream);
				return stream;
			};
			const queued = async (threadId: string) =>
				Number(
					await n8nContainer.services.postgres.exec(
						`SELECT count(*) FROM agent_message_queue WHERE "threadId" = '${threadId}' AND "executionId" IS NULL`,
					),
				);
			try {
				const threadId = randomUUID();
				await signalMain(n8nContainer, 0, 'SIGSTOP');
				const first = await open(1, threadId, 'fifo-blocked', true);
				await expect.poll(() => executionId(first.events), { timeout: 30_000 }).toBeTruthy();
				await signalMain(n8nContainer, 0, 'SIGCONT');
				const second = await open(0, threadId, 'fifo-remote');
				await expect.poll(async () => await queued(threadId)).toBe(1);
				const third = await open(0, threadId, 'third');
				await expect.poll(async () => await queued(threadId)).toBe(2);
				third.disconnect();
				// A fresh reader restores accepted input from another main without resubmission.
				const removable = await open(0, threadId, 'remove before processing');
				await expect
					.poll(() => removable.events.find((event) => event.type === 'message-queued'))
					.toBeTruthy();
				const restored = await consumer.agents.queuedMessages(project.id, agent.id, threadId);
				expect(restored.items.map(({ message }) => message)).toEqual([
					'fifo-remote',
					'third',
					'remove before processing',
				]);
				await consumer.agents.removeQueuedMessage(
					project.id,
					agent.id,
					threadId,
					restored.items[2].id,
				);
				expect(
					(await ingress.agents.queuedMessages(project.id, agent.id, threadId)).items.map(
						({ message }) => message,
					),
				).toEqual(['fifo-remote', 'third']);
				removable.disconnect();
				const independent = await open(1, randomUUID(), 'independent', true);
				expect(await independent.done).toBeUndefined();
				expect(independent.events).toContainEqual(expect.objectContaining({ type: 'done' }));
				expect(
					(await consumer.agents.executions(project.id, agent.id, threadId)).map(
						({ status }) => status,
					),
				).toEqual(['running']);

				// Freeze ingress after acceptance. Only the other main can consume these items.
				await signalMain(n8nContainer, 0, 'SIGSTOP');
				await consumer.agents.stop(project.id, agent.id, threadId, executionId(first.events)!);
				await expect
					.poll(
						async () =>
							(await consumer.agents.executions(project.id, agent.id, threadId)).map(
								({ status }) => status,
							),
						{ timeout: 30_000 },
					)
					.toEqual(['cancelled', 'running']);
				await signalMain(n8nContainer, 0, 'SIGCONT');
				await expect
					.poll(
						async () =>
							(await consumer.agents.executions(project.id, agent.id, threadId)).map(
								({ status }) => status,
							),
						{ timeout: 30_000 },
					)
					.toEqual(['cancelled', 'success', 'success']);
				expect(await second.done).toBeUndefined();
				expect(second.events).toContainEqual(
					expect.objectContaining({ type: 'execution-started', sessionId: threadId }),
				);
				expect(
					second.events
						.filter((event) => event.type === 'text-delta')
						.map(({ delta }) => delta)
						.join(''),
				).toBe('Controlled reply.');
				expect(second.events).toContainEqual(
					expect.objectContaining({ type: 'done', sessionId: threadId }),
				);
				expect(
					(await ingress.agents.executions(project.id, agent.id, threadId)).map(
						({ userMessage }) => userMessage,
					),
				).toEqual(['fifo-blocked', 'fifo-remote', 'third']);

				const crashThread = randomUUID();
				await signalMain(n8nContainer, 0, 'SIGSTOP');
				const interrupted = await open(1, crashThread, 'fifo-crash', true);
				await expect.poll(() => executionId(interrupted.events), { timeout: 30_000 }).toBeTruthy();
				await signalMain(n8nContainer, 0, 'SIGCONT');
				const afterCrash = await open(0, crashThread, 'survives restart');
				await expect.poll(async () => await queued(crashThread)).toBe(1);
				const [main] = n8nContainer.findContainers('-n8n-main-2$');
				await main.restart({ timeout: 0 });
				await expect
					.poll(
						async () =>
							(await ingress.agents.executions(project.id, agent.id, crashThread)).map(
								({ status }) => status,
							),
						{ timeout: 270_000, intervals: [2_000] },
					)
					.toEqual(['interrupted', 'success']);
				expect(await afterCrash.done).toBeUndefined();
				expect(afterCrash.events).toContainEqual(
					expect.objectContaining({ type: 'done', sessionId: crashThread }),
				);
				expect(
					(await ingress.agents.executions(project.id, agent.id, crashThread)).map(
						({ userMessage }) => userMessage,
					),
				).toEqual(['fifo-crash', 'survives restart']);
				expect(await queued(crashThread)).toBe(0);
			} finally {
				await signalMain(n8nContainer, 0, 'SIGCONT');
				for (const stream of streams) stream.disconnect();
				await ingress.agents.delete(project.id, agent.id);
			}
		});
	},
);
