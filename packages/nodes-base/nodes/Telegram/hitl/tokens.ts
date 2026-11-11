import { Container } from '@n8n/di';
import { createHmac } from 'crypto';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

/**
 * Derives the `secret_token` registered with Telegram's `setWebhook` for HITL
 * callbacks, and verified against the `X-Telegram-Bot-Api-Secret-Token`
 * header on every incoming callback.
 *
 * Keyed by the bot token and no instance secret: on engine v2 the node that
 * registers the value and the webhook that checks it can run in different
 * processes. The bot token already controls the bot, so the derived value
 * reveals nothing.
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
	// An empty key would make the value computable by anyone.
	if (!accessToken) throw new UserError('The Telegram credential has no access token');
	const botId = accessToken.split(':')[0];

	// Telegram's secret_token accepts 1-256 chars of A-Za-z0-9_-, exactly the
	// base64url alphabet.
	return createHmac('sha256', accessToken)
		.update(`n8n-telegram-hitl-secret:${botId}`)
		.digest('base64url')
		.slice(0, 43);
}

/**
 * The value a bot holds from before the derivation moved to the bot token.
 * The webhook accepts it until the next Send and Wait run registers the
 * webhook again. Accepted for one release only.
 *
 * TODO(CET-663): remove one release after this ships.
 */
export function deriveLegacyHitlSecretToken(accessToken: string): string {
	return createHmac('sha256', Container.get(InstanceSettings).hmacSignatureSecret)
		.update(`n8n-telegram-hitl-secret:${accessToken}`)
		.digest('base64url')
		.slice(0, 43);
}
