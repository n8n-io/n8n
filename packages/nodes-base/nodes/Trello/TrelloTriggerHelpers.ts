import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Trello webhook signature.
 *
 * Trello signs webhooks using HMAC-SHA1:
 * 1. Create HMAC SHA-1 hash of (raw body + callbackURL) using the OAuth secret as key
 * 2. Encode the hash in base64 format
 * 3. Compare with the signature in the `X-Trello-Webhook` header
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#webhook-signatures
 *
 * @returns true if the signature is valid, false otherwise
 * @returns true if no OAuth secret is configured (backward compatibility with existing triggers)
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credentials = await this.getCredentials('trelloApi');
	const req = this.getRequestObject();
	const oauthSecret = credentials?.oauthSecret;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!oauthSecret || typeof oauthSecret !== 'string' || !req.rawBody) {
				return null;
			}

			// Get the callback URL that was used during webhook creation
			const callbackURL = this.getNodeWebhookUrl('default');

			// Compute: base64(HMAC-SHA1(body + callbackURL))
			const hmac = createHmac('sha1', oauthSecret);

			let rawBodyString: string;
			if (Buffer.isBuffer(req.rawBody)) {
				rawBodyString = req.rawBody.toString('utf8');
			} else {
				rawBodyString = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
			}

			// Content to hash is body + callbackURL (exactly as Trello docs specify)
			hmac.update(rawBodyString + callbackURL);
			return hmac.digest('base64');
		},
		skipIfNoExpectedSignature: !oauthSecret || typeof oauthSecret !== 'string',
		getActualSignature: () => {
			const signature = req.header('x-trello-webhook');
			return typeof signature === 'string' ? signature : null;
		},
	});
}
