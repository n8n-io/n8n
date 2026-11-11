import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

function parseSignatureHeader(header: string | null): {
	timestamp: string | null;
	signature: string | null;
} {
	if (!header) {
		return { timestamp: null, signature: null };
	}
	let timestamp: string | null = null;
	let signature: string | null = null;
	for (const part of header.split(',')) {
		const [rawKey, ...rest] = part.split('=');
		if (!rawKey || rest.length === 0) continue;
		const key = rawKey.trim();
		const value = rest.join('=').trim();
		if (key === 't') {
			timestamp = value;
		} else if (key === 'v1') {
			signature = value;
		}
	}
	return { timestamp, signature };
}

/**
 * Mailchimp sends `X-Mailchimp-Signature: t=<timestamp>,v1=<hex>`, an HMAC SHA-256 of
 * `<timestamp>.<raw-body>` keyed with the `signing_secret` returned once on webhook creation.
 *
 * Returns `true` when no secret is stored, so webhooks created before signing was supported keep working.
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const storedSecret = this.getWorkflowStaticData('node').webhookSecret;
	const secret = typeof storedSecret === 'string' && storedSecret ? storedSecret : undefined;

	const { timestamp, signature } = parseSignatureHeader(
		req.header('x-mailchimp-signature') ?? null,
	);

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!secret || !req.rawBody || !timestamp) {
				return null;
			}
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			const hmac = createHmac('sha256', secret);
			hmac.update(`${timestamp}.`);
			hmac.update(payload);
			return hmac.digest('hex');
		},
		skipIfNoExpectedSignature: !secret,
		getActualSignature: () => signature,
		getTimestamp: secret ? () => timestamp : undefined,
	});
}
