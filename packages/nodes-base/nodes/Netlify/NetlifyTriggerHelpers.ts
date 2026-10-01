import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Netlify webhook signature.
 *
 * Netlify signs webhooks using a JSON Web Signature (HS256):
 * 1. The `X-Webhook-Signature` header carries a JWT signed with the shared
 *    secret.
 * 2. The JWT payload includes a `sha256` claim — the hex SHA-256 digest of
 *    the raw request body.
 * 3. Verifying the JWT confirms authenticity; comparing the `sha256` claim
 *    with the computed digest of the body confirms payload integrity.
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
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			return createHash('sha256').update(payload).digest('hex');
		},
		skipIfNoExpectedSignature: !secret || typeof secret !== 'string',
		getActualSignature: () => {
			const token = req.header('x-webhook-signature');
			if (typeof token !== 'string' || !token || typeof secret !== 'string') {
				return null;
			}
			try {
				const decoded = jwt.verify(token, secret, {
					algorithms: ['HS256'],
					issuer: 'netlify',
				}) as IDataObject;
				return typeof decoded.sha256 === 'string' ? decoded.sha256 : null;
			} catch {
				return null;
			}
		},
	});
}
