import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Verifies the Trello webhook signature using HMAC-SHA1.
 *
 * Trello sends a signature in the `X-Trello-Webhook` header which is a
 * base64-encoded HMAC-SHA1 digest of (body + callbackURL).
 *
 * The content to hash is the concatenation of JSON.stringify(body) and the callbackURL
 * exactly as it was provided during webhook creation.
 *
 * The secret is the application's OAuth secret from the Trello Power-Up admin page.
 *
 * @returns true if signature is valid or no secret is configured, false otherwise
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credentials = await this.getCredentials('trelloApi');

	// If no OAuth secret is configured, skip verification (backwards compatibility)
	if (!credentials?.oauthSecret) {
		return true;
	}

	const oauthSecret = credentials.oauthSecret as string;

	const req = this.getRequestObject();
	const headerData = this.getHeaderData() as Record<string, string | undefined>;

	// Get the signature from Trello's header (lowercase)
	const signature = headerData['x-trello-webhook'];

	if (!signature) {
		return false;
	}

	try {
		// Get the raw request body
		if (!req.rawBody) {
			return false;
		}

		// Get the callback URL that was used during webhook creation
		const callbackURL = this.getNodeWebhookUrl('default');

		// Compute: base64(HMACSHA1(JSON.stringify(body) + callbackURL))
		const hmac = createHmac('sha1', oauthSecret);

		let rawBodyString: string;
		if (Buffer.isBuffer(req.rawBody)) {
			rawBodyString = req.rawBody.toString('utf8');
		} else {
			rawBodyString = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
		}

		// Content to hash is body + callbackURL (exactly as Trello docs specify)
		hmac.update(rawBodyString + callbackURL);
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
