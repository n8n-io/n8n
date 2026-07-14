import { Container } from '@n8n/di';
import { buildHitlCallbackReference, InstanceSettings } from 'n8n-core';
import type { IWebhookFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type * as _sendAndWaitUtils from '../../../../utils/sendAndWait/utils';

const TEST_HMAC_SECRET = 'test-hmac-secret';
Container.set(InstanceSettings, { hmacSignatureSecret: TEST_HMAC_SECRET } as InstanceSettings);

const ACCESS_TOKEN = '123456:test-bot-token';

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof genericFunctions>('../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: vi.fn(),
	};
});

vi.mock('../../../../utils/sendAndWait/utils', async () => {
	const originalModule = await vi.importActual<typeof _sendAndWaitUtils>(
		'../../../../utils/sendAndWait/utils',
	);
	return {
		...originalModule,
		sendAndWaitWebhook: vi.fn(),
	};
});

// Imported after the mocks above so both bind to the mocked implementations.
import { sendAndWaitWebhook } from '../../../../utils/sendAndWait/utils';
import * as genericFunctions from '../../GenericFunctions';
import { deriveHitlSecretToken } from '../../hitl/tokens';
import { telegramSendAndWaitWebhook } from '../../hitl/webhook';

const VALID_SECRET_TOKEN = deriveHitlSecretToken(ACCESS_TOKEN);

function makeCallbackQueryBody(overrides: Record<string, unknown> = {}) {
	return {
		callback_query: {
			id: 'cbq-1',
			data: buildHitlCallbackReference('42', 'a', TEST_HMAC_SECRET),
			from: { id: 777, username: 'ada', first_name: 'Ada', last_name: 'Lovelace' },
			message: { message_id: 55, chat: { id: 999 }, text: 'Approve this?' },
			...overrides,
		},
	};
}

describe('telegramSendAndWaitWebhook', () => {
	let webhookFns: ReturnType<typeof mock<IWebhookFunctions>>;

	beforeEach(() => {
		vi.clearAllMocks();
		webhookFns = mock<IWebhookFunctions>();
		webhookFns.getCredentials.mockResolvedValue({ accessToken: ACCESS_TOKEN });
	});

	it('delegates to the shared sendAndWaitWebhook when chatApproval is off', async () => {
		(sendAndWaitWebhook as Mock).mockResolvedValue({ noWebhookResponse: true });
		webhookFns.getBodyData.mockReturnValue({});
		webhookFns.getNodeParameter.mockReturnValue(false);

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('delegates without crashing for a classic link-button GET click, whose body is undefined', async () => {
		// A GET request never populates req.body: getBodyData() returns undefined here,
		// not {} (regression: a bare `bodyData.callback_query` read would throw).
		(sendAndWaitWebhook as Mock).mockResolvedValue({ noWebhookResponse: true });
		webhookFns.getBodyData.mockReturnValue(undefined as never);
		webhookFns.getNodeParameter.mockReturnValue(false);

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('delegates to the shared sendAndWaitWebhook for a non-callback request even when chatApproval is on', async () => {
		(sendAndWaitWebhook as Mock).mockResolvedValue({ noWebhookResponse: true });
		webhookFns.getBodyData.mockReturnValue({});
		webhookFns.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'chatApproval' ? true : undefined,
		);

		await telegramSendAndWaitWebhook.call(webhookFns);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
	});

	it('responds 400 and does not resume when the callback data is not a recognizable reference', async () => {
		webhookFns.getBodyData.mockReturnValue({ callback_query: { id: 'cbq-1', data: 'garbage' } });
		webhookFns.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'chatApproval' ? true : undefined,
		);
		const status = vi.fn().mockReturnThis();
		const send = vi.fn();
		webhookFns.getResponseObject.mockReturnValue({ status, send } as never);

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(genericFunctions.apiRequest).not.toHaveBeenCalled();
	});

	it('responds 403 and does not resume when the secret-token header is wrong', async () => {
		webhookFns.getBodyData.mockReturnValue(makeCallbackQueryBody());
		webhookFns.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'chatApproval' ? true : undefined,
		);
		webhookFns.getHeaderData.mockReturnValue({ 'x-telegram-bot-api-secret-token': 'wrong' });
		const status = vi.fn().mockReturnThis();
		const send = vi.fn();
		webhookFns.getResponseObject.mockReturnValue({ status, send } as never);

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(status).toHaveBeenCalledWith(403);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(genericFunctions.apiRequest).not.toHaveBeenCalled();
	});

	it('responds 403 and does not resume when the secret-token header is missing', async () => {
		webhookFns.getBodyData.mockReturnValue(makeCallbackQueryBody());
		webhookFns.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'chatApproval' ? true : undefined,
		);
		webhookFns.getHeaderData.mockReturnValue({});
		const status = vi.fn().mockReturnThis();
		const send = vi.fn();
		webhookFns.getResponseObject.mockReturnValue({ status, send } as never);

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(status).toHaveBeenCalledWith(403);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('answers with an unauthorized alert, responds 200, and does not resume when the approver list rejects the sender', async () => {
		webhookFns.getBodyData.mockReturnValue(makeCallbackQueryBody({ from: { id: 111 } }));
		webhookFns.getNodeParameter.mockImplementation((name: unknown) => {
			if (name === 'chatApproval') return true;
			if (name === 'chatApprovalOptions') {
				return { approverIds: '777, 888', unauthorizedReplyText: 'Nope.' };
			}
			return undefined;
		});
		webhookFns.getHeaderData.mockReturnValue({
			'x-telegram-bot-api-secret-token': VALID_SECRET_TOKEN,
		});
		const status = vi.fn().mockReturnThis();
		const send = vi.fn();
		webhookFns.getResponseObject.mockReturnValue({ status, send } as never);

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(genericFunctions.apiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'answerCallbackQuery', {
			callback_query_id: 'cbq-1',
			text: 'Nope.',
			show_alert: true,
		});
		// Telegram must get a response here, or it times out and retries the tap.
		expect(status).toHaveBeenCalledWith(200);
		expect(send).toHaveBeenCalledWith('');
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('acknowledges, edits the message, and resumes with approved: true and the responder', async () => {
		webhookFns.getBodyData.mockReturnValue(makeCallbackQueryBody());
		webhookFns.getNodeParameter.mockImplementation((name: unknown) => {
			if (name === 'chatApproval') return true;
			if (name === 'chatApprovalOptions') return { postDecisionBehavior: 'showOutcome' };
			return undefined;
		});
		webhookFns.getHeaderData.mockReturnValue({
			'x-telegram-bot-api-secret-token': VALID_SECRET_TOKEN,
		});

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'answerCallbackQuery', {
			callback_query_id: 'cbq-1',
		});
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'editMessageText', {
			chat_id: 999,
			message_id: 55,
			text: 'Approve this?\n\n✅ Approved by Ada Lovelace',
		});
		expect(result).toEqual({
			webhookResponse: '',
			workflowData: [
				[
					{
						json: {
							data: {
								approved: true,
								responder: {
									id: '777',
									username: 'ada',
									name: 'Ada Lovelace',
									source: 'telegram',
								},
								chatId: 999,
								messageId: 55,
								respondedAt: expect.any(String),
							},
						},
					},
				],
			],
		});
	});

	it('resumes with approved: false for a decline decision', async () => {
		webhookFns.getBodyData.mockReturnValue(
			makeCallbackQueryBody({ data: buildHitlCallbackReference('42', 'd', TEST_HMAC_SECRET) }),
		);
		webhookFns.getNodeParameter.mockImplementation((name: unknown) => {
			if (name === 'chatApproval') return true;
			if (name === 'chatApprovalOptions') return { postDecisionBehavior: 'keepMessage' };
			return undefined;
		});
		webhookFns.getHeaderData.mockReturnValue({
			'x-telegram-bot-api-secret-token': VALID_SECRET_TOKEN,
		});

		const result = await telegramSendAndWaitWebhook.call(webhookFns);

		expect(
			(result as { workflowData: Array<Array<{ json: { data: { approved: boolean } } }>> })
				.workflowData[0][0].json.data.approved,
		).toBe(false);
	});

	it('removes the buttons without an outcome message when postDecisionBehavior is removeButtons', async () => {
		webhookFns.getBodyData.mockReturnValue(makeCallbackQueryBody());
		webhookFns.getNodeParameter.mockImplementation((name: unknown) => {
			if (name === 'chatApproval') return true;
			if (name === 'chatApprovalOptions') return { postDecisionBehavior: 'removeButtons' };
			return undefined;
		});
		webhookFns.getHeaderData.mockReturnValue({
			'x-telegram-bot-api-secret-token': VALID_SECRET_TOKEN,
		});

		await telegramSendAndWaitWebhook.call(webhookFns);

		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'editMessageReplyMarkup', {
			chat_id: 999,
			message_id: 55,
			reply_markup: { inline_keyboard: [] },
		});
		expect(genericFunctions.apiRequest).not.toHaveBeenCalledWith(
			'POST',
			'editMessageText',
			expect.anything(),
		);
	});

	it('does not edit the message when postDecisionBehavior is keepMessage', async () => {
		webhookFns.getBodyData.mockReturnValue(makeCallbackQueryBody());
		webhookFns.getNodeParameter.mockImplementation((name: unknown) => {
			if (name === 'chatApproval') return true;
			if (name === 'chatApprovalOptions') return { postDecisionBehavior: 'keepMessage' };
			return undefined;
		});
		webhookFns.getHeaderData.mockReturnValue({
			'x-telegram-bot-api-secret-token': VALID_SECRET_TOKEN,
		});

		await telegramSendAndWaitWebhook.call(webhookFns);

		expect(genericFunctions.apiRequest).toHaveBeenCalledTimes(1); // ack only
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'answerCallbackQuery', {
			callback_query_id: 'cbq-1',
		});
	});
});
