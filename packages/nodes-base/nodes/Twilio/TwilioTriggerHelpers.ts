import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies a Twilio Event Streams webhook request.
 *
 * Twilio signs JSON webhooks by:
 * 1. Computing SHA-256 of the raw body and appending it as `bodySHA256` query param
 * 2. HMAC-SHA1 over the resulting URL using the account auth token
 * 3. Sending the base64-encoded result in the `X-Twilio-Signature` header
 *
 * Falls back to skip verification when no auth token is available
 * (e.g. credential uses API Key auth) to preserve existing workflows.
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	try {
		const credential = await this.getCredentials<{ authType?: string; authToken?: string }>(
			'twilioApi',
		);
		const req = this.getRequestObject();
		const authToken = credential.authToken;

		if (!authToken || typeof authToken !== 'string') {
			return true;
		}

		const rawBody = req.rawBody;
		if (!rawBody) {
			return false;
		}

		const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
		const computedBodyHash = createHash('sha256').update(bodyBuffer).digest('hex');
		const bodyHashFromQuery = req.query?.bodySHA256;

		if (
			typeof bodyHashFromQuery !== 'string' ||
			bodyHashFromQuery.length !== computedBodyHash.length ||
			!timingSafeEqual(Buffer.from(bodyHashFromQuery), Buffer.from(computedBodyHash))
		) {
			return false;
		}

		let sinkUrl = this.getNodeWebhookUrl('default');
		if (!sinkUrl) {
			return false;
		}

		const originalUrl: string = req.originalUrl ?? req.url ?? '';

		// getNodeWebhookUrl always returns the production path (/webhook/...).
		// In test mode the request arrives at /webhook-test/..., so adjust
		// the base URL to match what was actually signed against.
		const originalPath = originalUrl.split('?')[0];
		if (originalPath.includes('/webhook-test/')) {
			sinkUrl = sinkUrl.replace('/webhook/', '/webhook-test/');
		}

		const queryIdx = originalUrl.indexOf('?');
		const queryString = queryIdx === -1 ? '' : originalUrl.substring(queryIdx + 1);
		const signedUrl = queryString ? `${sinkUrl}?${queryString}` : sinkUrl;

		return verifySignatureGeneric({
			getExpectedSignature: () => {
				const hmac = createHmac('sha1', authToken);
				hmac.update(signedUrl);
				return hmac.digest('base64');
			},
			getActualSignature: () => {
				const sig = req.header('x-twilio-signature');
				return typeof sig === 'string' ? sig : null;
			},
		});
	} catch (error) {
		return false;
	}
}
