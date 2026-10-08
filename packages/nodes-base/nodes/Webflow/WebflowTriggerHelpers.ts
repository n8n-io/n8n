import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

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
	const validTimestamp =
		typeof timestamp === 'string' && /^\d+$/.test(timestamp) ? timestamp : null;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			const rawBody = req.rawBody;
			if (rawBody === undefined || rawBody === null || !validTimestamp) {
				return null;
			}

			if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') {
				return null;
			}

			const hmac = createHmac('sha256', secret);
			hmac.update(`${validTimestamp}:`);
			hmac.update(rawBody);
			return hmac.digest('hex');
		},
		getActualSignature: () => {
			const signature = req.header('x-webflow-signature');
			return typeof signature === 'string' ? signature : null;
		},
		getTimestamp: () => validTimestamp,
	});
}
