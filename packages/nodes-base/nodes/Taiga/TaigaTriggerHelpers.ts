import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Taiga webhook signature.
 *
 * Taiga signs the raw request body with HMAC-SHA1 (hex) using the webhook key
 * and sends it in the `X-TAIGA-WEBHOOK-SIGNATURE` header.
 *
 * @returns true if the signature is valid, or if no key is stored (backward
 *   compatibility with webhooks created before signing was enabled).
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const key = webhookData.key;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!key || typeof key !== 'string' || !req.rawBody) {
				return null;
			}
			const hmac = createHmac('sha1', key);
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			hmac.update(payload);
			return hmac.digest('hex');
		},
		skipIfNoExpectedSignature: !key || typeof key !== 'string',
		getActualSignature: () => {
			const receivedSignature = req.header('x-taiga-webhook-signature');
			return typeof receivedSignature === 'string' ? receivedSignature : null;
		},
	});
}
