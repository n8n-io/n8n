import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

function getSignatureHeaderValue(signature: string | null, key: 't' | 'v1') {
	if (!signature) {
		return null;
	}

	let value: string | null = null;

	for (const element of signature.split(',')) {
		const trimmedElement = element.trim();
		if (trimmedElement.startsWith(`${key}=`)) {
			value = trimmedElement.substring(key.length + 1);
		}
	}

	return value;
}

async function getSigningSecret(this: IWebhookFunctions): Promise<string | null> {
	const webhookData = this.getWorkflowStaticData('node');
	const webhookSecret = webhookData.webhookSecret;

	if (typeof webhookSecret === 'string' && webhookSecret !== '') {
		return webhookSecret;
	}

	const credential = await this.getCredentials('stripeApi');
	const credentialSecret = credential?.signatureSecret;

	if (typeof credentialSecret === 'string' && credentialSecret !== '') {
		return credentialSecret;
	}

	return null;
}

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	let signingSecret: string | null;

	try {
		signingSecret = await getSigningSecret.call(this);
	} catch (error) {
		return false;
	}

	const req = this.getRequestObject();

	if (!signingSecret) {
		return true;
	}

	const getSignatureHeader = () => {
		const signature = req.header('stripe-signature');
		return typeof signature === 'string' ? signature : null;
	};
	const getTimestamp = () => getSignatureHeaderValue(getSignatureHeader(), 't');

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!signingSecret || req.rawBody === undefined || req.rawBody === null) {
				return null;
			}

			const timestamp = getTimestamp();
			if (!timestamp) {
				return null;
			}

			const rawBodyString = Buffer.isBuffer(req.rawBody)
				? req.rawBody.toString()
				: typeof req.rawBody === 'string'
					? req.rawBody
					: JSON.stringify(req.rawBody);
			const signedPayload = `${timestamp}.${rawBodyString}`;
			const hmac = createHmac('sha256', signingSecret);
			hmac.update(signedPayload);
			return hmac.digest('hex');
		},
		getActualSignature: () => getSignatureHeaderValue(getSignatureHeader(), 'v1'),
		getTimestamp,
	});
}
