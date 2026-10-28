import { createHmac } from 'crypto';

/**
 * Derives the `secret_token` registered with Telegram's `setWebhook` for HITL
 * callbacks, and verified against the `X-Telegram-Bot-Api-Secret-Token`
 * header on every incoming callback.
 *
 * Keyed by the bot's access token alone, and by no instance secret: the
 * value is registered where the node runs and checked where the callback
 * arrives, and on engine v2 those are two processes with different
 * instance secrets. Anyone who holds the bot token already controls the
 * bot, so a value derived from it alone gives nothing away.
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
	const botId = accessToken.split(':')[0];

	// Telegram's secret_token accepts 1-256 chars of A-Za-z0-9_-, exactly the
	// base64url alphabet.
	return createHmac('sha256', accessToken)
		.update(`n8n-telegram-hitl-secret:${botId}`)
		.digest('base64url')
		.slice(0, 43);
}
