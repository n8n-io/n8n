import { Container } from '@n8n/di';
import { createHmac } from 'crypto';
import { InstanceSettings } from 'n8n-core';

/**
 * Derives the `secret_token` registered with Telegram's `setWebhook` for HITL
 * callbacks, and verified against the `X-Telegram-Bot-Api-Secret-Token`
 * header on every incoming callback.
 *
 * Scoped by the full access token, not by credential record or node: every
 * holder of this bot's token derives the same value, so re-registration is
 * idempotent and a Telegram Trigger forwarding a callback (a different
 * credential record, potentially) still verifies. Rotating the token changes
 * the value, so every credential for the bot must be updated and the webhook
 * re-registered by the next Send and Wait run. This intentionally differs
 * from the Telegram Trigger's own `workflowId_nodeId` webhook secret, which
 * stays untouched.
 */
export function deriveHitlSecretToken(accessToken: string): string {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;

	// Telegram's secret_token accepts 1-256 chars of A-Za-z0-9_-, exactly the
	// base64url alphabet.
	return createHmac('sha256', secret)
		.update(`n8n-telegram-hitl-secret:${accessToken}`)
		.digest('base64url')
		.slice(0, 43);
}
