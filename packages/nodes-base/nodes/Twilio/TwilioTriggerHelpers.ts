import { createHmac, createHash, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Verifies the Twilio webhook signature using HMAC-SHA1.
 *
 * Twilio sends a signature in the `X-Twilio-Signature` header, which is a
 * Base64-encoded HMAC-SHA1 hash computed from:
 *
 * For application/x-www-form-urlencoded:
 *   - The full URL (with query string)
 *   - POST parameters sorted alphabetically by name, concatenated as key+value pairs
 *
 * For application/json:
 *   - The full URL (which must include a `bodySHA256` query parameter)
 *   - The `bodySHA256` is a SHA-256 hash of the request body
 *
 * This function uses the Auth Token from credentials as the HMAC key.
 *
 * @returns true if signature is valid or no auth token is configured, false otherwise
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credentials = await this.getCredentials('twilioApi');

	// Get the auth token - only works with authToken auth type
	if (credentials.authType !== 'authToken' || !credentials.authToken) {
		// If using API Key auth or no auth token configured, skip verification
		// This maintains backwards compatibility
		return true;
	}

	const authToken = credentials.authToken as string;
	const req = this.getRequestObject();

	// Get the signature from Twilio's header
	const signature = req.header('x-twilio-signature');
	if (!signature) {
		return false;
	}

	try {
		// Get the full webhook URL
		const webhookUrl = this.getNodeWebhookUrl('default');
		if (!webhookUrl) {
			return false;
		}

		const contentType = req.header('content-type') ?? '';
		let signatureBaseString: string;

		if (contentType.includes('application/json')) {
			// For JSON bodies, Twilio includes a bodySHA256 query parameter
			// The signature is computed from the URL (including the bodySHA256 param)
			// We need to verify the bodySHA256 matches the actual body hash first
			if (!req.rawBody) {
				return false;
			}

			const rawBody = Buffer.isBuffer(req.rawBody)
				? req.rawBody.toString('utf8')
				: typeof req.rawBody === 'string'
					? req.rawBody
					: JSON.stringify(req.rawBody);

			// Compute SHA256 hash of the body
			const bodyHash = createHash('sha256').update(rawBody).digest('hex');

			// Build the URL with bodySHA256 parameter
			const url = new URL(webhookUrl);
			url.searchParams.set('bodySHA256', bodyHash);
			signatureBaseString = url.toString();
		} else {
			// For form-urlencoded bodies, sort POST params and append to URL
			const bodyData = this.getBodyData() as Record<string, unknown>;
			signatureBaseString = webhookUrl;

			// Sort parameters alphabetically (case-sensitive Unix-style sort)
			const sortedKeys = Object.keys(bodyData).sort();
			for (const key of sortedKeys) {
				const value = bodyData[key];
				// Append key and value with no delimiter
				signatureBaseString += key + String(value ?? '');
			}
		}

		// Compute HMAC-SHA1 signature
		const hmac = createHmac('sha1', authToken);
		hmac.update(signatureBaseString);
		const computedSignature = hmac.digest('base64');

		// Use timing-safe comparison
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
