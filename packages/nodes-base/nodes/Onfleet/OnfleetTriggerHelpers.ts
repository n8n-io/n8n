import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	try {
		const credential = await this.getCredentials('onfleetApi');
		const req = this.getRequestObject();
		const signingSecret = credential.signingSecret;

		return verifySignatureGeneric({
			getExpectedSignature: () => {
				if (!signingSecret || typeof signingSecret !== 'string' || !req.rawBody) {
					return null;
				}

				const secretBuffer = Buffer.from(signingSecret, 'hex');
				const hmac = createHmac('sha512', secretBuffer);
				const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
				hmac.update(payload);
				return hmac.digest('hex');
			},
			skipIfNoExpectedSignature: !signingSecret || typeof signingSecret !== 'string',
			getActualSignature: () => {
				const sig = req.header('x-onfleet-signature');
				return typeof sig === 'string' ? sig : null;
			},
		});
	} catch (error) {
		return false;
	}
}
