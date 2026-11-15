import type { N8NStack } from 'n8n-containers/stack';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		mains: 2,
		workers: 1,
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-capability-activation',
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		},
	},
});

async function mockModel(stack: N8NStack) {
	const message = {
		model: 'claude-sonnet-4-5',
		id: 'msg_activation',
		type: 'message',
		role: 'assistant',
		content: [],
		stop_reason: null,
		stop_sequence: null,
		usage: { input_tokens: 1, output_tokens: 1 },
	};
	for (const toolCall of [true, false]) {
		const contentBlock = toolCall
			? { type: 'tool_use', id: 'activation_call', name: 'activation_probe', input: {} }
			: { type: 'text', text: '' };
		const delta = toolCall
			? { type: 'input_json_delta', partial_json: '{}' }
			: { type: 'text_delta', text: 'Activation check complete.' };
		const body = [
			{ type: 'message_start', message },
			{ type: 'content_block_start', index: 0, content_block: contentBlock },
			{ type: 'content_block_delta', index: 0, delta },
			{ type: 'content_block_stop', index: 0 },
			{
				type: 'message_delta',
				delta: { stop_reason: toolCall ? 'tool_use' : 'end_turn', stop_sequence: null },
				usage: { output_tokens: 3 },
			},
			{ type: 'message_stop' },
		]
			.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
			.join('');
		await stack.services.proxy.createExpectation({
			httpRequest: {
				method: 'POST',
				path: '/v1/messages',
				body: {
					type: 'REGEX',
					regex: toolCall
						? '(?s)(?=.*"stream"\\s*:\\s*true)(?=.*activation-running).*'
						: '(?s).*"stream"\\s*:\\s*true.*',
				},
			},
			httpResponse: {
				statusCode: 200,
				headers: { 'Content-Type': ['text/event-stream'] },
				body,
				...(toolCall ? { delay: { timeUnit: 'SECONDS', value: 15 } } : {}),
			},
			times: toolCall ? { remainingTimes: 1 } : { unlimited: true },
		});
	}
	await stack.services.proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/v1/messages' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({
				...message,
				content: [{ type: 'text', text: 'Activation check' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
	await stack.services.proxy.createGetExpectation('/agent-782-probe', {
		result: 'active-execution-finished',
	});
}

async function expectToolAvailability(stack: N8NStack, marker: string, enabled: boolean) {
	const toolMatch = enabled
		? '(?=.*"name"\\s*:\\s*"activation_probe")'
		: '(?!.*"name"\\s*:\\s*"activation_probe")';
	expect(
		await stack.services.proxy.wasRequestMade({
			method: 'POST',
			path: '/v1/messages',
			body: {
				type: 'REGEX',
				regex: `(?s)(?=.*"stream"\\s*:\\s*true)(?=.*${marker})${toolMatch}.*`,
			},
		}),
	).toBe(true);
}

test.describe(
	'Agent capability activation @mode:multi-main',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('updates warm Preview caches across mains and waits for publish in production', async ({
			n8nContainer,
			createApiForMain,
			mainUrls,
		}) => {
			test.setTimeout(180_000);
			assert(n8nContainer, 'This test needs a container stack');
			const clients = [await createApiForMain(0), await createApiForMain(1)];
			const ingress = clients[0];
			const project = await ingress.projects.getMyPersonalProject();
			const streams: Array<Awaited<ReturnType<typeof ingress.agents.openChat>>> = [];
			const credential = await ingress.credentials.createCredential({
				name: `e2e-agent-782-${randomUUID()}`,
				type: 'anthropicApi',
				data: { apiKey: 'activation-test-key' },
			});

			try {
				const agent = await ingress.agents.create(project.id, {
					name: `e2e-agent-782-${randomUUID()}`,
					model: 'anthropic/claude-sonnet-4-5',
					credential: credential.id,
					instructions: 'Reply briefly.',
					integrations: [{ type: 'n8n_chat', credentialId: '' }],
					tools: [
						{
							type: 'node',
							name: 'activation_probe',
							node: {
								nodeType: 'n8n-nodes-base.httpRequestTool',
								nodeTypeVersion: 4.2,
								nodeParameters: { url: 'https://example.com/agent-782-probe', options: {} },
							},
						},
					],
				});
				try {
					await mockModel(n8nContainer);
					const preview = async (main: number, marker: string) => {
						const stream = await clients[main].agents.openChat(
							mainUrls[main],
							project.id,
							agent.id,
							{
								message: marker,
								messageId: randomUUID(),
								sessionId: randomUUID(),
								newSession: true,
							},
						);
						streams.push(stream);
						return stream;
					};
					const runPreview = async (main: number, marker: string, enabled: boolean) => {
						const stream = await preview(main, marker);
						expect(await stream.done).toBeUndefined();
						expect(stream.events.filter((event) => event.type === 'error')).toEqual([]);
						expect(stream.events).toContainEqual(expect.objectContaining({ type: 'done' }));
						await expectToolAvailability(n8nContainer, marker, enabled);
					};
					const runProduction = async (main: number, marker: string, enabled: boolean) => {
						const body = await clients[main].agents.n8nChat(project.id, agent.id, marker);
						expect(body).not.toContain('"type":"error"');
						expect(body).toContain('"type":"done"');
						await expectToolAvailability(n8nContainer, marker, enabled);
					};

					await ingress.agents.publish(project.id, agent.id);
					for (const main of [0, 1]) {
						await runPreview(main, `warm-preview-${main}`, true);
						await runProduction(main, `warm-production-${main}`, true);
					}
					const running = await preview(1, 'activation-running');
					await expect
						.poll(
							async () =>
								await n8nContainer.services.proxy.wasRequestMade({
									method: 'POST',
									path: '/v1/messages',
									body: { type: 'REGEX', regex: '(?s).*activation-running.*' },
								}),
						)
						.toBe(true);

					const current = await ingress.agents.getConfig(project.id, agent.id);
					const config = {
						...current.config,
						tools: current.config.tools?.map((tool) => ({ ...tool, enabled: false })),
					};
					expect(running.events).not.toContainEqual(expect.objectContaining({ type: 'done' }));
					await ingress.agents.updateConfig(project.id, agent.id, config, current.configHash);
					for (const main of [0, 1]) {
						await runPreview(main, `disabled-preview-${main}`, false);
						await runProduction(main, `draft-production-${main}`, true);
					}
					expect(await running.done).toBeUndefined();
					expect(running.events.filter((event) => event.type === 'error')).toEqual([]);
					expect(running.events).toContainEqual(expect.objectContaining({ type: 'done' }));
					expect(
						await n8nContainer.services.proxy.wasRequestMade({
							method: 'GET',
							path: '/agent-782-probe',
						}),
					).toBe(true);

					await ingress.agents.publish(project.id, agent.id);
					for (const main of [0, 1]) await runProduction(main, `published-disabled-${main}`, false);
				} finally {
					for (const stream of streams) stream.disconnect();
					await ingress.agents.delete(project.id, agent.id);
				}
			} finally {
				await ingress.credentials.deleteCredential(credential.id);
			}
		});
	},
);
