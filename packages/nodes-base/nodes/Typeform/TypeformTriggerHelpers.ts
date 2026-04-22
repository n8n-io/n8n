import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Typeform webhook signature.
 *
 * Typeform signs webhooks using HMAC SHA-256:
 * 1. Create HMAC SHA-256 hash of the entire payload (as binary) using the secret as key
 * 2. Encode the hash in base64 format
 * 3. Add prefix `sha256=` to the hash
 * 4. Compare with the signature in the `Typeform-Signature` header
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
			const hash = hmac.digest('base64');
			const computedSignature = `sha256=${hash}`;
			return computedSignature;
		},
		skipIfNoExpectedSignature: !secret || typeof secret !== 'string',
		getActualSignature: () => {
			const receivedSignature = req.header('typeform-signature');
			return typeof receivedSignature === 'string' ? receivedSignature : null;
		},
	});
}
