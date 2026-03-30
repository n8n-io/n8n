import { createHash, createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Twilio Event Streams webhook signature.
 *
 * Twilio Event Streams webhooks use the following verification:
 * 1. The request body is hashed with SHA-256 (hex encoded)
 * 2. The bodySHA256 is appended as a query parameter to the webhook URL
 * 3. The URL (with bodySHA256 query param) is signed with HMAC-SHA1 using the Auth Token
 * 4. The signature is sent in the `X-Twilio-Signature` header, base64 encoded
 *
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 * @see https://www.twilio.com/en-us/blog/validate-twilio-event-streams-webhooks-php
 *
 * @returns true if the signature is valid, false otherwise
 * @returns true if no auth token is available (backwards compatibility)
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credentials = await this.getCredentials('twilioApi');
	const req = this.getRequestObject();
	const webhookUrl = this.getNodeWebhookUrl('default');

	// Skip verification only when using API Key auth or no auth token
	// (backwards compatibility for users who haven't configured auth token)
	const hasAuthToken = credentials.authType === 'authToken' && credentials.authToken;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!hasAuthToken) {
				return null;
			}

			// If we have auth token but missing webhook URL, we can't verify - fail
			if (!webhookUrl) {
				return null;
			}

			const authToken = credentials.authToken as string;

			// Get raw body for hash computation
			const rawBody = getRawBodyAsString(req);
			if (!rawBody) {
				return null;
			}

			// Compute SHA256 hash of the body (hex encoded, as per Twilio's algorithm)
			const bodyHash = createHash('sha256').update(rawBody).digest('hex');

			// Build the URL with bodySHA256 parameter
			const url = new URL(webhookUrl);
			url.searchParams.set('bodySHA256', bodyHash);
			const signatureBaseString = url.toString();

			// Compute HMAC-SHA1 signature
			const hmac = createHmac('sha1', authToken);
			hmac.update(signatureBaseString);
			return hmac.digest('base64');
		},
		// Only skip when no auth token configured (backwards compatibility)
		skipIfNoExpectedSignature: !hasAuthToken,
		getActualSignature: () => {
			const signature = req.header('x-twilio-signature');
			return typeof signature === 'string' ? signature : null;
		},
	});
}

/**
 * Get the raw body as a string for hash verification.
 */
function getRawBodyAsString(req: {
	rawBody?: Buffer | string;
	body?: unknown;
}): string | null {
	if (Buffer.isBuffer(req.rawBody)) {
		return req.rawBody.toString('utf8');
	}
	if (typeof req.rawBody === 'string') {
		return req.rawBody;
	}
	// Fallback to stringified body if rawBody is not available
	if (req.body !== undefined) {
		return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
	}
	return null;
}
