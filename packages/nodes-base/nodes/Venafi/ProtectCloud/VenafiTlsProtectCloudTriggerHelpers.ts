import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../../utils/webhook-signature-verification';

const SIGNATURE_PREFIX = /^t:\d+,s:/;

/**
 * Venafi sends `VaaS-Signature`: base64url of `t:<unix timestamp>,s:` followed by the raw
 * HMAC SHA-256 of the body, keyed with the connector secret. The timestamp is not signed.
 *
 * Returns `true` when no secret is stored, so connectors created before signing was supported keep working.
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const storedSecret = this.getWorkflowStaticData('node').webhookSecret;
	const secret = typeof storedSecret === 'string' && storedSecret ? storedSecret : undefined;

	return verifySignatureGeneric({
		getExpectedSignature: () =>
			secret && req.rawBody ? createHmac('sha256', secret).update(req.rawBody).digest('hex') : null,
		skipIfNoExpectedSignature: !secret,
		getActualSignature: () => {
			const header = req.header('vaas-signature');
			if (!header) return null;
			const decoded = Buffer.from(header, 'base64url');
			// latin1 maps each byte to one character, so the prefix length is also its byte length
			const prefix = SIGNATURE_PREFIX.exec(decoded.toString('latin1'))?.[0];
			return prefix ? decoded.subarray(prefix.length).toString('hex') : null;
		},
	});
}
