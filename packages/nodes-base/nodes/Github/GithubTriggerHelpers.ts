import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Verifies the GitHub webhook signature using HMAC-SHA256.
 *
 * GitHub sends a signature in the `X-Hub-Signature-256` header in the format:
 * `sha256=<HMAC hex digest>`
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

	// If no secret is configured, skip verification (backwards compatibility)
	if (!webhookSecret) {
		return true;
	}

	const req = this.getRequestObject();

	// Get the signature from GitHub's header
	const signature = req.header('x-hub-signature-256');
	if (!signature) {
		return false;
	}

	// Validate signature format (must start with "sha256=")
	if (!signature.startsWith('sha256=')) {
		return false;
	}

	// Extract just the hex digest part
	const providedSignature = signature.substring(7);

	try {
		// Get the raw request body
		if (!req.rawBody) {
			return false;
		}

		// Compute HMAC-SHA256 of the raw body using our secret
		const hmac = createHmac('sha256', webhookSecret);

		if (Buffer.isBuffer(req.rawBody)) {
			hmac.update(req.rawBody);
		} else {
			const rawBodyString =
				typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
			hmac.update(rawBodyString);
		}

		const computedSignature = hmac.digest('hex');

		const computedBuffer = Buffer.from(computedSignature, 'utf8');
		const providedBuffer = Buffer.from(providedSignature, 'utf8');

		// Buffers must be same length for timingSafeEqual
		if (computedBuffer.length !== providedBuffer.length) {
			return false;
		}

		return timingSafeEqual(computedBuffer, providedBuffer);
	} catch {
		return false;
	}
}
