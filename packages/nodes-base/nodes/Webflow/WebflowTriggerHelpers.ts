import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

const MAX_TIMESTAMP_AGE_MS = 300_000;

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	let secret: string;

	try {
		const credentials = await this.getCredentials('webflowOAuth2Api');
		if (typeof credentials.clientSecret !== 'string' || credentials.clientSecret === '') {
			return false;
		}
		secret = credentials.clientSecret;
	} catch {
		return false;
	}

	const req = this.getRequestObject();
	const timestamp = req.header('x-webflow-timestamp');
	const signature = req.header('x-webflow-signature');
	const rawBody = req.rawBody;

	if (
		typeof timestamp !== 'string' ||
		!/^\d+$/.test(timestamp) ||
		typeof signature !== 'string' ||
		(!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string')
	) {
		return false;
	}

	const timestampMs = Number(timestamp);
	if (
		!Number.isSafeInteger(timestampMs) ||
		Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_AGE_MS
	) {
		return false;
	}

	try {
		const hmac = createHmac('sha256', secret);
		hmac.update(`${timestamp}:`);
		hmac.update(rawBody);

		const expectedSignature = Buffer.from(hmac.digest('hex'));
		const actualSignature = Buffer.from(signature);

		return (
			expectedSignature.length === actualSignature.length &&
			timingSafeEqual(expectedSignature, actualSignature)
		);
	} catch {
		return false;
	}
}
