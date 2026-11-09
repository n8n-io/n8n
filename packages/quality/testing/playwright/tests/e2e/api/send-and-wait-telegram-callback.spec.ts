import flatted from 'flatted';
import type { ProxyServer } from 'n8n-containers/services/proxy';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Manual -> Telegram (send and wait, approve within the chat) -> After
const WORKFLOW_FILE = 'send-and-wait-telegram-chat-approval.json';
const BOT_TOKEN = '123456:fake-token';

// The node offers callback buttons only for an HTTPS webhook URL on a non-loopback host.
test.use({
	capability: { services: ['proxy'], env: { WEBHOOK_URL: 'https://n8n.example.test/' } },
});

interface TelegramRequestBody {
	secret_token?: string;
	reply_markup?: { inline_keyboard: Array<Array<{ callback_data: string }>> };
}

async function mockTelegram(proxy: ProxyServer) {
	await proxy.clearAllExpectations();
	// An empty `url` means that no one claims the bot's webhook, so the node claims it.
	await proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/bot.*' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({ ok: true, result: { url: '' } }),
		},
		times: { unlimited: true },
	});
}

async function startAndReadCallbacks(api: ApiHelpers, proxy: ProxyServer) {
	const credential = await api.credentials.createCredential({
		name: `Telegram ${crypto.randomUUID().slice(0, 8)}`,
		type: 'telegramApi',
		data: { accessToken: BOT_TOKEN },
	});
	const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE, {
		transform: (workflow) => {
			const telegram = workflow.nodes?.find((node) => node.name === 'Telegram');
			telegram!.credentials = { telegramApi: { id: credential.id, name: credential.name } };
			return workflow;
		},
	});
	const { executionId } = await api.workflows.runManually(workflowId, 'Manual');
	await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');

	const requests = await proxy.getAllRequestsMade();
	const bodyOf = (method: string) => {
		const { body } = requests.find((r) => r.httpRequest?.path === `/bot${BOT_TOKEN}/${method}`)!
			.httpRequest!;
		return (body as { json: TelegramRequestBody }).json;
	};
	const callbacks = bodyOf('sendMessage').reply_markup!.inline_keyboard.flat();

	return {
		executionId,
		secret: bodyOf('setWebhook').secret_token!,
		approve: callbacks.find((button) => button.callback_data.includes('|a|'))!.callback_data,
	};
}

/** Sends the update that Telegram sends when a person taps a button. */
async function tap(api: ApiHelpers, callbackData: string, secret: string) {
	const response = await api.webhooks.trigger('/webhook-waiting-telegram', {
		method: 'POST',
		headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
		data: {
			update_id: 1,
			callback_query: {
				id: '42',
				from: { id: 7, first_name: 'Approver' },
				message: { message_id: 1, chat: { id: 123, type: 'private' } },
				data: callbackData,
			},
		},
		maxNotFoundRetries: 0,
	});
	return response.status();
}

test.describe(
	'Send and wait approval callbacks',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test.beforeEach(async ({ services }) => {
			await mockTelegram(services.proxy);
		});

		test('should refuse a changed callback, then resume once on the sent callback @engine:v2', async ({
			api,
			services,
		}) => {
			const { executionId, secret, approve } = await startAndReadCallbacks(api, services.proxy);

			expect(await tap(api, approve, 'wrong-secret')).toBe(403);
			expect(await tap(api, approve.replace('|a|', '|d|'), secret)).toBe(404);
			expect((await api.workflows.getExecution(executionId)).status).toBe('waiting');

			expect(await tap(api, approve, secret)).toBe(200);
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');
			const after = flatted.parse(execution.data).resultData.runData.After[0].data.main[0][0];
			expect(after.json.approved).toBe(true);
			expect(await tap(api, approve, secret)).toBe(409);
		});
	},
);
