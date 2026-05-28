import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credential = await this.getCredentials('trelloApi');
	const req = this.getRequestObject();
	const secret = credential.oauthSecret;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!secret || typeof secret !== 'string' || !req.rawBody) {
				return null;
			}

			const callbackURL = this.getNodeWebhookUrl('default');
			const rawBody = Buffer.isBuffer(req.rawBody)
				? req.rawBody.toString('utf-8')
				: typeof req.rawBody === 'string'
					? req.rawBody
					: null;

			if (!rawBody) {
				return null;
			}

			return createHmac('sha1', secret)
				.update(rawBody + callbackURL)
				.digest('base64');
		},
		skipIfNoExpectedSignature: !secret || typeof secret !== 'string',
		getActualSignature: () => {
			const sig = req.header('x-trello-webhook');
			return typeof sig === 'string' ? sig : null;
		},
	});
}
