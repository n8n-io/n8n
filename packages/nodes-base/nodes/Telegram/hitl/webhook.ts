import { timingSafeEqual } from 'crypto';
import { parseHitlCallbackReference } from 'n8n-core';
import type { IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';

import type { TelegramChatApprovalOptions } from './descriptions';
import { deriveHitlSecretToken } from './tokens';
import type { SendAndWaitResponder } from '../../../utils/sendAndWait/interfaces';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';
import { apiRequest } from '../GenericFunctions';
import type { CallbackQuery } from '../IEvent';

function safeTokensMatch(provided: string, expected: string): boolean {
	const providedBuffer = Buffer.from(provided);
	const expectedBuffer = Buffer.from(expected);
	return (
		providedBuffer.byteLength === expectedBuffer.byteLength &&
		timingSafeEqual(providedBuffer, expectedBuffer)
	);
}

function buildResponderName(from: NonNullable<CallbackQuery['from']>): string | undefined {
	return [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined;
}

function buildResponder(from: CallbackQuery['from']): SendAndWaitResponder | undefined {
	if (!from) return undefined;
	return {
		id: String(from.id),
		username: from.username,
		name: buildResponderName(from),
		source: 'telegram',
	};
}

/** Whether `from` may respond, given the approver allow-list (empty list = anyone may respond). */
function isAuthorizedResponder(from: CallbackQuery['from'], approverIds: string[]): boolean {
	if (approverIds.length === 0) return true;
	return from !== undefined && approverIds.includes(String(from.id));
}

interface PostDecisionEditParams {
	chatId: number;
	messageId: number;
	approved: boolean;
	from: CallbackQuery['from'];
	originalText: string;
	postDecisionBehavior: TelegramChatApprovalOptions['postDecisionBehavior'];
}

/** Edits the chat message per `postDecisionBehavior`. Best-effort: the decision must resume the execution even if this fails. */
async function applyPostDecisionEdit(
	context: IWebhookFunctions,
	{ chatId, messageId, approved, from, originalText, postDecisionBehavior }: PostDecisionEditParams,
): Promise<void> {
	try {
		if (postDecisionBehavior === 'showOutcome') {
			const responderLabel = from ? (buildResponderName(from) ?? String(from.id)) : 'someone';
			const outcomeLine = approved
				? `✅ Approved by ${responderLabel}`
				: `🚫 Declined by ${responderLabel}`;

			await apiRequest.call(context, 'POST', 'editMessageText', {
				chat_id: chatId,
				message_id: messageId,
				text: `${originalText}\n\n${outcomeLine}`,
			});
		} else if (postDecisionBehavior === 'removeButtons') {
			await apiRequest.call(context, 'POST', 'editMessageReplyMarkup', {
				chat_id: chatId,
				message_id: messageId,
				reply_markup: { inline_keyboard: [] },
			});
		}
	} catch {
		// intentional
	}
}

/**
 * Resume handler for the Telegram node's Send and Wait webhook. Detects a
 * one-tap chat-approval callback and handles it end to end (secret-token
 * verification, approver allow-list, acknowledgement, message edit); any
 * other request (link-button GET, freeText/customForm POST) delegates to the
 * shared `sendAndWaitWebhook` unchanged, so flag/section-off behavior and
 * degraded (link-button) mode are untouched.
 */
export async function telegramSendAndWaitWebhook(
	this: IWebhookFunctions,
): Promise<IWebhookResponseData> {
	// --- routing: is this an in-chat interaction, or the legacy link/form path? ---
	// A classic link-button click is a GET request with no body at all (`getBodyData()`
	// returns `undefined`, not `{}`), so this must not assume an object comes back.
	const bodyData = (this.getBodyData() ?? {}) as { callback_query?: CallbackQuery };
	const chatApproval = this.getNodeParameter('chatApproval', false) as boolean;

	if (!bodyData.callback_query || !chatApproval) {
		return await sendAndWaitWebhook.call(this);
	}

	const callbackQuery = bodyData.callback_query;
	const parsed = parseHitlCallbackReference(callbackQuery.data ?? '');
	const res = this.getResponseObject();

	if (!parsed) {
		res.status(400).send('');
		return { noWebhookResponse: true };
	}

	// --- authentication: fail closed if the secret-token header doesn't match ---
	const credentials = await this.getCredentials('telegramApi');
	const expectedToken = deriveHitlSecretToken(credentials.accessToken as string);
	const providedToken = String(this.getHeaderData()['x-telegram-bot-api-secret-token'] ?? '');

	if (!safeTokensMatch(providedToken, expectedToken)) {
		// Fail closed: the execution stays waiting.
		res.status(403).send('');
		return { noWebhookResponse: true };
	}

	// --- authorization: reject a tap from outside the approver allow-list ---
	const options = this.getNodeParameter('chatApprovalOptions', {}) as TelegramChatApprovalOptions;
	const from = callbackQuery.from;
	const callbackQueryId = callbackQuery.id ?? '';

	const approverIds = (options.approverIds ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	if (!isAuthorizedResponder(from, approverIds)) {
		try {
			await apiRequest.call(this, 'POST', 'answerCallbackQuery', {
				callback_query_id: callbackQueryId,
				text: options.unauthorizedReplyText ?? 'You are not authorized to respond to this request.',
				show_alert: true,
			});
		} catch {
			// intentional: notifying the unauthorized user is best-effort
		}
		// `noWebhookResponse: true` means the response was already sent; without this,
		// Telegram never gets one and eventually times out and retries the tap.
		res.status(200).send('');
		return { noWebhookResponse: true };
	}

	// --- side effects: acknowledge the tap and reflect the decision in the chat ---
	try {
		// Kill the chat's loading spinner. Failure here must not block the resume.
		await apiRequest.call(this, 'POST', 'answerCallbackQuery', {
			callback_query_id: callbackQueryId,
		});
	} catch {
		// intentional: acknowledgement is best-effort
	}

	const chatId = callbackQuery.message?.chat?.id;
	const messageId = callbackQuery.message?.message_id;
	const approved = parsed.decision === 'a';
	const postDecisionBehavior = options.postDecisionBehavior ?? 'showOutcome';

	if (chatId !== undefined && messageId !== undefined) {
		await applyPostDecisionEdit(this, {
			chatId,
			messageId,
			approved,
			from,
			originalText: callbackQuery.message?.text ?? '',
			postDecisionBehavior,
		});
	}

	// --- response: resume the execution with the decision and responder identity ---
	return {
		webhookResponse: '',
		workflowData: [
			[
				{
					json: {
						data: {
							approved,
							responder: buildResponder(from),
							chatId,
							messageId,
							respondedAt: new Date().toISOString(),
						},
					},
				},
			],
		],
	};
}
