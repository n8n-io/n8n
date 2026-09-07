import { Container } from '@n8n/di';
import { createHmac } from 'crypto';
import { InstanceSettings } from 'n8n-core';

/**
 * Derives the `secret_token` registered with Telegram's `setWebhook` for HITL
 * callbacks, and verified against the `X-Telegram-Bot-Api-Secret-Token`
 * header on every incoming callback.
 *
 * Scoped by bot id (the non-secret numeric prefix of the bot's access token),
 * not by credential record or node: every holder of this bot's credential
 * derives the same token, so re-registration is idempotent and a Telegram
 * Trigger forwarding a callback (a different credential record, potentially)
 * still verifies. This intentionally differs from the Telegram Trigger's own
 * `workflowId_nodeId` webhook secret, which stays untouched.
 */
export function deriveHitlSecretToken(accessToken: string): string {
	const botId = accessToken.split(':')[0];
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;

	// Telegram's secret_token accepts 1-256 chars of A-Za-z0-9_-, exactly the
	// base64url alphabet.
	return createHmac('sha256', secret)
		.update(`n8n-telegram-hitl-secret:${botId}`)
		.digest('base64url')
		.slice(0, 43);
}
