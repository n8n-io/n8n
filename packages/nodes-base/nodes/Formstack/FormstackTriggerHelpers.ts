import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Formstack webhook signature.
 *
 * Formstack signs webhooks using HMAC SHA-256 over the raw request body, with
 * the resulting hex digest sent in the `X-FS-Signature` header in the format
 * `sha256=<hex>`.
 *
 * @returns true if the signature is valid, or no secret is configured
 *          (backward compatibility with webhooks created before signing was
 *          supported)
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
			return `sha256=${hmac.digest('hex')}`;
		},
		skipIfNoExpectedSignature: !secret || typeof secret !== 'string',
		getActualSignature: () => {
			const sig = req.header('x-fs-signature');
			return typeof sig === 'string' ? sig : null;
		},
	});
}
