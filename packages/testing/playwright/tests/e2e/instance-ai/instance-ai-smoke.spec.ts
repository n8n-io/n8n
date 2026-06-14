import { test, expect } from '../../../fixtures/base';

/**
 * Instance AI smoke tests.
 *
 * These verify ONE thing: the end-to-end machinery works — a user can open
 * the AI Assistant, send a message, and get a streamed response rendered,
 * with the thread persisted. Agent behaviour (planning, building, tool use,
 * confirmations) is intentionally NOT tested here; that lives in the evals
 * (packages/@n8n/instance-ai/evaluations, LangSmith).
 *
 * The LLM is stubbed with a single catch-all proxy expectation that returns
 * a fixed Anthropic SSE stream for ANY /v1/messages request. There is no
 * request matching against prompt content, so prompt/skill changes can never
 * break these tests — the failure modes left are real ones (module fails to
 * boot, chat API broken, streaming broken, UI crash).
 */

const SMOKE_RESPONSE_TEXT =
	'Hello! I am the AI Assistant smoke-test response. Everything is wired up.';

const FALLBACK_NARRATION = 'I finished the run, but I did not generate a final response';

/** Minimal but faithful Anthropic Messages SSE stream ending the turn with plain text. */
function anthropicTextStream(text: string): string {
	const events: Array<[string, object]> = [
		[
			'message_start',
			{
				type: 'message_start',
				message: {
					model: 'claude-sonnet-4-6',
					id: 'msg_smoke_static',
					type: 'message',
					role: 'assistant',
					content: [],
					stop_reason: null,
					stop_sequence: null,
					usage: { input_tokens: 3, output_tokens: 1 },
				},
			},
		],
		[
			'content_block_start',
			{ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
		],
		[
			'content_block_delta',
			{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
		],
		['content_block_stop', { type: 'content_block_stop', index: 0 }],
		[
			'message_delta',
			{
				type: 'message_delta',
				delta: { stop_reason: 'end_turn', stop_sequence: null },
				usage: { input_tokens: 3, output_tokens: 20 },
			},
		],
		['message_stop', { type: 'message_stop' }],
	];

	return (
		events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}`).join('\n\n') +
		'\n\n'
	);
}

test.use({
	capability: {
		// Instance AI does not support multi-main yet (implementation deferred);
		// pin the stack to a single main so the multi-main CI project runs this
		// suite against a supported topology.
		mains: 1,
		// The real sandbox service is required even for chat: every agent run
		// materializes runtime skills into a sandbox workspace before
		// responding, and the chat input is gated on sandbox availability.
		// Only the LLM is stubbed — that was the fragile part.
		services: ['proxy', 'sandbox'],
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'sk-ant-smoke-test-static-stub',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_TIMEOUT: '600000',
			// Prevent community-node-types requests to api-staging.n8n.io.
			N8N_VERIFIED_PACKAGES_ENABLED: 'false',
		},
	},
});

test.describe(
	'Instance AI smoke @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.beforeEach(async ({ services, n8nContainer }) => {
			test.skip(!n8nContainer, 'The LLM stub requires the container proxy');

			// Catch-all: any Anthropic Messages call gets the same static stream.
			await services.proxy.createExpectation({
				httpRequest: { method: 'POST', path: '/v1/messages' },
				httpResponse: {
					statusCode: 200,
					headers: { 'Content-Type': ['text/event-stream; charset=utf-8'] },
					body: anthropicTextStream(SMOKE_RESPONSE_TEXT),
				},
				times: { unlimited: true },
			});
		});

		test('user can send a message and sees the streamed response', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Smoke test: is anyone home?');

			await expect(n8n.instanceAi.getUserMessages().last()).toContainText(
				'Smoke test: is anyone home?',
			);
			await expect(n8n.instanceAi.getAssistantMessageText(SMOKE_RESPONSE_TEXT)).toBeVisible({
				timeout: 60_000,
			});
			await expect(n8n.instanceAi.getAssistantMessageText(FALLBACK_NARRATION)).toHaveCount(0);
		});

		test('the conversation survives a page reload', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Smoke test: persistence check');
			await expect(n8n.instanceAi.getAssistantMessageText(SMOKE_RESPONSE_TEXT)).toBeVisible({
				timeout: 60_000,
			});

			await n8n.page.reload();

			await expect(n8n.instanceAi.getUserMessages().last()).toContainText(
				'Smoke test: persistence check',
			);
			await expect(n8n.instanceAi.getAssistantMessageText(SMOKE_RESPONSE_TEXT)).toBeVisible({
				timeout: 30_000,
			});
		});

		test('a follow-up message in the same thread gets a response', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Smoke test: first message');
			await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText(
				SMOKE_RESPONSE_TEXT,
				{ timeout: 60_000 },
			);

			await n8n.instanceAi.sendMessage('Smoke test: follow-up message');

			await expect(n8n.instanceAi.getUserMessages()).toHaveCount(2, { timeout: 30_000 });
			await expect(n8n.instanceAi.getAssistantMessages().nth(1)).toContainText(
				SMOKE_RESPONSE_TEXT,
				{ timeout: 60_000 },
			);
		});
	},
);
