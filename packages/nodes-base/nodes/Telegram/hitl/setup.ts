import { TELEGRAM_HITL_WEBHOOK_SUFFIX } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { deriveHitlSecretToken } from './tokens';
import { apiRequest } from '../GenericFunctions';

interface TelegramWebhookInfo {
	result?: {
		url?: string;
		allowed_updates?: string[];
	};
}

function isLoopbackHost(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isSameOrigin(url: string, origin: string): boolean {
	try {
		return new URL(url).origin === origin;
	} catch {
		return false;
	}
}

/**
 * Derives this execution's waiting-webhook base (origin + path, without the
 * trailing `/<executionId>/<nodeId>`) from the signed resume URL, so the
 * fixed HITL endpoint URL always matches whatever public base n8n itself
 * uses for webhooks, regardless of reverse-proxy path prefixes.
 */
function getWaitingWebhookBase(context: IExecuteFunctions): { origin: string; path: string } {
	const signedUrl = new URL(context.getSignedResumeUrl());
	const suffix = `/${context.getExecutionId()}/${context.getNode().id}`;
	if (!signedUrl.pathname.endsWith(suffix)) {
		// Not expected to happen: getSignedResumeUrl's own URL-building convention
		// changed underneath us. Fall back to the full path rather than guessing,
		// but say so, since the fixed endpoint URL built from it will be wrong.
		context.logger.warn(
			`Could not determine the waiting-webhook base path from the signed resume URL (${signedUrl.pathname}); the "Approve Within Chat" fixed endpoint URL may be incorrect.`,
		);
		return { origin: signedUrl.origin, path: signedUrl.pathname };
	}
	return {
		origin: signedUrl.origin,
		path: signedUrl.pathname.slice(0, signedUrl.pathname.length - suffix.length),
	};
}

/**
 * Preflight for "Approve Within Chat": confirms the instance is publicly
 * reachable over HTTPS, then makes sure the bot's single webhook is either
 * free, already claimed by our own fixed endpoint, or shared cooperatively
 * with a same-instance Telegram Trigger. Returns whether callback buttons
 * can be used; the caller falls back to today's link buttons when they
 * can't (instance not public, or the Telegram API call fails).
 */
export async function prepareChatApproval(context: IExecuteFunctions): Promise<boolean> {
	// --- applicability: is chat approval actually requested and usable here? ---
	const chatApproval = context.getNodeParameter('chatApproval', 0, false) as boolean;
	if (!chatApproval) return false;

	// `chatApproval` is only shown in the UI when responseType is 'approval', but hidden
	// parameters keep their stored value if responseType is changed afterwards, so this
	// must be re-checked here rather than trusted from display state alone.
	const responseType = context.getNodeParameter('responseType', 0, 'approval') as string;
	if (responseType !== 'approval') return false;

	const { origin, path } = getWaitingWebhookBase(context);
	const instanceUrl = new URL(origin);

	if (instanceUrl.protocol !== 'https:' || isLoopbackHost(instanceUrl.hostname)) {
		context.logger.warn(
			'"Approve Within Chat" requires this n8n instance to be reachable over public HTTPS; falling back to link buttons.',
		);
		return false;
	}

	// --- resolve the fixed endpoint we'd need to claim or coexist with ---
	const fixedEndpointUrl = `${origin}${path}${TELEGRAM_HITL_WEBHOOK_SUFFIX}`;
	const credentials = await context.getCredentials('telegramApi');
	const accessToken = credentials.accessToken as string;

	// --- query the bot's current webhook state ---
	let currentUrl: string;
	let allowedUpdates: string[];
	try {
		const webhookInfo = (await apiRequest.call(
			context,
			'POST',
			'getWebhookInfo',
			{},
		)) as TelegramWebhookInfo;
		currentUrl = webhookInfo.result?.url ?? '';
		allowedUpdates = webhookInfo.result?.allowed_updates ?? [];
	} catch (error) {
		context.logger.warn(
			`Could not check the Telegram bot's webhook status; falling back to link buttons: ${(error as Error).message}`,
		);
		return false;
	}

	// --- decide: register the webhook, coexist with a Trigger, or refuse ---
	if (currentUrl === '' || currentUrl === fixedEndpointUrl) {
		try {
			await apiRequest.call(context, 'POST', 'setWebhook', {
				url: fixedEndpointUrl,
				secret_token: deriveHitlSecretToken(accessToken),
				allowed_updates: ['callback_query'],
				// Never discard someone's pending updates, in contrast to the Telegram
				// Trigger, which does on activation for typeVersion >= 1.3.
				drop_pending_updates: false,
			});
		} catch (error) {
			context.logger.warn(
				`Could not register the Telegram bot's webhook; falling back to link buttons: ${(error as Error).message}`,
			);
			return false;
		}
		return true;
	}

	if (isSameOrigin(currentUrl, origin)) {
		if (allowedUpdates.length === 0 || allowedUpdates.includes('callback_query')) {
			// A Telegram Trigger on this instance owns the webhook and forwards HITL
			// callbacks to us; see TelegramTrigger.node.ts.
			return true;
		}
		throw new NodeOperationError(
			context.getNode(),
			'The Telegram Trigger claiming this bot was activated before one-tap approval support. Re-activate that workflow (or update the trigger to the latest version) so callback buttons reach n8n.',
		);
	}

	throw new NodeOperationError(
		context.getNode(),
		`This bot's webhook is already claimed by another system (URL: ${currentUrl}). Use a different bot for one-tap approval, or turn off "Approve Within Chat".`,
	);
}
