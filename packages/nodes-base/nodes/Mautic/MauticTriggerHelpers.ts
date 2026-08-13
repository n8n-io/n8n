import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Mautic webhook signature.
 *
 * Mautic signs webhooks using HMAC SHA-256:
 * 1. Create HMAC SHA-256 hash of the raw body using the secret as key
 * 2. Encode the hash in base64 format
 * 3. Compare with the signature in the `Webhook-Signature` header
 *
 * @returns true if the signature is valid, false otherwise
 * @returns true if no secret is configured (backward compatibility with old triggers)
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const secret = webhookData.webhookSecret;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!secret || typeof secret !== 'string' || !req.rawBody) {
				return null;
			}
			const hmac = createHmac('sha256', secret);
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			hmac.update(payload);
			return hmac.digest('base64');
		},
		skipIfNoExpectedSignature: !secret || typeof secret !== 'string',
		getActualSignature: () => {
			const sig = req.header('webhook-signature');
			return typeof sig === 'string' ? sig : null;
		},
	});
}
