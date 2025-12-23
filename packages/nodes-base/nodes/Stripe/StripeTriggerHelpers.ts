import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credential = await this.getCredentials('stripeApi');
	if (!credential?.signatureSecret) {
		return true; // No signature secret provided, skip verification
	}

	const req = this.getRequestObject();

	const signature = req.header('stripe-signature');
	if (!signature) {
		return false;
	}

	// Parse the Stripe signature header
	const elements = signature.split(',');
	let timestamp: string | undefined;
	let signatureValue: string | undefined;

	for (const element of elements) {
		if (element.startsWith('t=')) {
			timestamp = element.substring(2);
		} else if (element.startsWith('v1=')) {
			signatureValue = element.substring(3);
		}
	}

	if (!timestamp || !signatureValue) {
		return false;
	}

	// Verify timestamp
	const currentTimestamp = Math.floor(Date.now() / 1000);
	const webhookTimestamp = parseInt(timestamp, 10);
	const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

	if (Math.abs(currentTimestamp - webhookTimestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
		return false;
	}

	try {
		if (typeof credential.signatureSecret !== 'string') {
			return false;
		}

		if (!req.rawBody) {
			return false;
		}

		let rawBodyString: string;
		if (Buffer.isBuffer(req.rawBody)) {
			rawBodyString = req.rawBody.toString();
		} else {
			rawBodyString = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
		}

		const signedPayload = `${timestamp}.${rawBodyString}`;
		const hmac = createHmac('sha256', credential.signatureSecret);
		hmac.update(signedPayload);
		const computedSignature = hmac.digest('hex');

		const computedBuffer = Buffer.from(computedSignature);
		const providedBuffer = Buffer.from(signatureValue);

		return (
			computedBuffer.length === providedBuffer.length &&
			timingSafeEqual(computedBuffer, providedBuffer)
		);
	} catch (error) {
		return false;
	}
}
