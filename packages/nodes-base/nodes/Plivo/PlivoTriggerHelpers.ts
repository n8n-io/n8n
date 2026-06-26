import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Verify X-Plivo-Signature-V3 header for incoming webhooks.
 *
 * Algorithm:
 * 1. Get X-Plivo-Signature-V3 and X-Plivo-Signature-V3-Nonce headers
 * 2. Construct base string: webhookUrl + nonce
 * 3. For POST requests, append the request body
 * 4. Compute HMAC-SHA256 using Auth Token as key
 * 5. Base64 encode the result
 * 6. Compare with timing-safe equality
 */
export async function verifyPlivoSignature(this: IWebhookFunctions): Promise<boolean> {
	const credentials = await this.getCredentials<{
		authId: string;
		authToken: string;
	}>('plivoApi');

	if (!credentials?.authToken) {
		return true; // No auth token provided, skip verification
	}

	const req = this.getRequestObject();

	const signatureHeader = req.headers['x-plivo-signature-v3'];
	const nonceHeader = req.headers['x-plivo-signature-v3-nonce'];

	// Headers can be string | string[] | undefined, extract first value if array
	const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
	const nonce = Array.isArray(nonceHeader) ? nonceHeader[0] : nonceHeader;

	if (!signature || !nonce) {
		return false;
	}

	try {
		// Get the full webhook URL
		const webhookUrl = this.getNodeWebhookUrl('default');

		// Construct the base string: URL + nonce
		let baseString = webhookUrl + nonce;

		// For POST requests, append the request body
		if (req.method === 'POST' && req.rawBody) {
			let bodyString: string;
			if (Buffer.isBuffer(req.rawBody)) {
				bodyString = req.rawBody.toString('utf8');
			} else if (typeof req.rawBody === 'string') {
				bodyString = req.rawBody;
			} else {
				bodyString = JSON.stringify(req.rawBody);
			}
			baseString += bodyString;
		}

		// Compute HMAC-SHA256 with auth token as key
		const hmac = createHmac('sha256', credentials.authToken);
		hmac.update(baseString);
		const computedSignature = hmac.digest('base64');

		// Timing-safe comparison
		const computedBuffer = Buffer.from(computedSignature);
		const providedBuffer = Buffer.from(signature);

		return (
			computedBuffer.length === providedBuffer.length &&
			timingSafeEqual(computedBuffer, providedBuffer)
		);
	} catch {
		return false;
	}
}

/**
 * Detect the event type from the incoming webhook payload.
 */
export function detectEventType(bodyData: Record<string, unknown>): string {
	// Check for SMS-related events
	if (bodyData.MessageUUID !== undefined) {
		// SMS Delivery Status has Status field
		if (bodyData.Status !== undefined) {
			return 'smsStatus';
		}
		// Incoming SMS has Text field
		if (bodyData.Text !== undefined) {
			return 'incomingSms';
		}
	}

	// Check for Call-related events
	if (bodyData.CallUUID !== undefined) {
		const direction = typeof bodyData.Direction === 'string' ? bodyData.Direction : undefined;
		const callStatus = typeof bodyData.CallStatus === 'string' ? bodyData.CallStatus : undefined;

		// Incoming call: Direction is 'inbound' and status is 'ringing' or similar
		if (direction === 'inbound' && callStatus === 'ringing') {
			return 'incomingCall';
		}

		// Call status update: has CallStatus field
		if (callStatus !== undefined) {
			return 'callStatus';
		}
	}

	return 'unknown';
}
