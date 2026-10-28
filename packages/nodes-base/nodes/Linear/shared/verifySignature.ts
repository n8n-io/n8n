import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../../utils/webhook-signature-verification';

/**
 * Verifies Linear's `linear-signature` header (HMAC-SHA256 of the raw body).
 *
 * v1 relies on the signing secret pasted into the credential. v2 passes the secret
 * returned by `webhookCreate`, so no manual setup is needed, and falls back to the
 * credential when a webhook predates that.
 */
export async function verifySignature(
	this: IWebhookFunctions,
	secretOverride?: string,
): Promise<boolean> {
	const authenticationMethod = this.getNodeParameter('authentication', 'apiToken') as string;
	const credentialType = authenticationMethod === 'apiToken' ? 'linearApi' : 'linearOAuth2Api';
	const credential = await this.getCredentials(credentialType);
	const req = this.getRequestObject();

	const signingSecret = secretOverride ?? credential.signingSecret;
	try {
		return verifySignatureGeneric({
			getExpectedSignature: () => {
				if (!signingSecret || typeof signingSecret !== 'string' || !req.rawBody) {
					return null;
				}

				const hmac = createHmac('sha256', signingSecret);

				if (Buffer.isBuffer(req.rawBody) || typeof req.rawBody === 'string') {
					hmac.update(req.rawBody);
				} else {
					return null;
				}

				return hmac.digest('hex');
			},
			skipIfNoExpectedSignature: !signingSecret || typeof signingSecret !== 'string',
			getActualSignature: () => {
				const actualSignature = req.header('linear-signature');
				return typeof actualSignature === 'string' ? actualSignature : null;
			},
			getTimestamp: () => {
				// Linear sends webhookTimestamp in the body payload (UNIX ms)
				const body = this.getBodyData();
				const timestamp = body.webhookTimestamp;
				return typeof timestamp === 'number' ? timestamp : null;
			},
			skipIfNoTimestamp: true,
			maxTimestampAgeSeconds: 60,
		});
	} catch (error) {
		return false;
	}
}
