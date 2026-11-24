import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Verifies the Zendesk webhook signature using HMAC-SHA256.
 *
 * Zendesk sends a signature in the `X-Zendesk-Webhook-Signature` header
 * which is a base64-encoded HMAC-SHA256 digest of (timestamp + body).
 *
 * The timestamp is provided in the `X-Zendesk-Webhook-Signature-Timestamp` header.
 *
 * This function computes the expected signature using the stored webhook secret
 * and compares it with the provided signature using a constant-time comparison.
 *
 * @returns true if signature is valid or no secret is configured, false otherwise
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	// Get the secret from workflow static data (set during webhook creation)
	const webhookData = this.getWorkflowStaticData('node');
	const webhookSecret = webhookData.webhookSecret as string | undefined;

	// If no secret is configured, skip verification (backwards compatibility).
	// This handles legacy webhooks created before signature verification was implemented.
	// To enable verification, deactivate and reactivate the workflow.
	if (!webhookSecret) {
		return true;
	}

	const req = this.getRequestObject();
	const headerData = this.getHeaderData() as Record<string, string | undefined>;

	// Get the signature and timestamp from Zendesk's headers
	const signature = headerData['x-zendesk-webhook-signature'];
	const timestamp = headerData['x-zendesk-webhook-signature-timestamp'];

	if (!signature || !timestamp) {
		return false;
	}

	try {
		// Get the raw request body
		if (!req.rawBody) {
			return false;
		}

		// Compute: base64(HMACSHA256(TIMESTAMP + BODY))
		const hmac = createHmac('sha256', webhookSecret);

		let rawBodyString: string;
		if (Buffer.isBuffer(req.rawBody)) {
			rawBodyString = req.rawBody.toString('utf8');
		} else {
			rawBodyString = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
		}

		hmac.update(timestamp + rawBodyString);
		const computedSignature = hmac.digest('base64');

		// Constant-time comparison to prevent timing attacks
		const computedBuffer = Buffer.from(computedSignature, 'utf8');
		const providedBuffer = Buffer.from(signature, 'utf8');

		// Buffers must be same length for timingSafeEqual
		if (computedBuffer.length !== providedBuffer.length) {
			return false;
		}

		return timingSafeEqual(computedBuffer, providedBuffer);
	} catch {
		return false;
	}
}
