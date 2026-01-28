import { timingSafeEqual } from 'crypto';

/**
 * Maximum allowed age for a webhook request timestamp (5 minutes).
 * Requests older than this are considered potential replay attacks.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * Options for generic signature verification.
 */
export interface VerifySignatureOptions {
	/**
	 * Function that returns the expected signature/secret to compare against.
	 * This is what the webhook provider should have sent.
	 */
	getExpectedSignature: () => string | null;
	/**
	 * If true, skip validation if no expected signature is provided.
	 * Use when signing is optional or you need to support existing webhooks without a signature.
	 */
	skipIfNoExpectedSignature?: boolean;
	/**
	 * Function that returns the actual signature/secret from the request.
	 * This is typically extracted from headers.
	 */
	getActualSignature: () => string | null;
	/**
	 * Optional function that returns the timestamp from the request.
	 * If provided, enables replay attack prevention by validating the timestamp
	 * is within the acceptable window (default: 5 minutes).
	 * The timestamp should be in seconds (Unix epoch).
	 * If the provider sends milliseconds, convert to seconds before returning.
	 */
	getTimestamp?: () => number | string | null;
	/**
	 * If true, skip validation if no timestamp is provided.
	 */
	skipIfNoTimestamp?: boolean;
	/**
	 * Maximum allowed age for the timestamp in seconds.
	 * Defaults to 300 seconds (5 minutes).
	 */
	maxTimestampAgeSeconds?: number;
}

/**
 * Generic function to verify webhook signatures and prevent replay attacks.
 *
 * This function:
 * 1. Validates that both expected and actual signatures are present
 * 2. Optionally validates timestamp to prevent replay attacks
 * 3. Performs constant-time comparison of signatures to prevent timing attacks
 *
 * @param options - Configuration options for signature verification
 * @returns true if the signature is valid, false otherwise
 */
export function verifySignature(options: VerifySignatureOptions): boolean {
	const { getExpectedSignature, getActualSignature, getTimestamp, maxTimestampAgeSeconds } =
		options;
	try {
		// Validate timestamp if provided (replay attack prevention)
		if (getTimestamp) {
			const timestamp = getTimestamp();
			if (options.skipIfNoTimestamp && timestamp === null) {
				return true;
			}
			if (!isTimestampValid(timestamp, maxTimestampAgeSeconds)) {
				return false;
			}
		}
		// Get expected signature
		const expectedSignature = getExpectedSignature();
		if (!expectedSignature || typeof expectedSignature !== 'string') {
			if (options.skipIfNoExpectedSignature) {
				return true;
			}
			return false;
		}

		// Get actual signature
		const actualSignature = getActualSignature();
		if (!actualSignature || typeof actualSignature !== 'string') {
			return false;
		}

		const expectedBuffer = Buffer.from(expectedSignature);
		const actualBuffer = Buffer.from(actualSignature);

		// Perform constant-time comparison to prevent timing attacks
		return (
			expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
		);
	} catch (error) {
		return false;
	}
}

function isTimestampValid(
	timestamp: number | string | null,
	maxTimestampAgeSeconds?: number,
): boolean {
	if (timestamp === null) {
		return false;
	}
	const timestampNum =
		typeof timestamp === 'string' ? parseInt(timestamp, 10) : Math.floor(timestamp);
	if (isNaN(timestampNum)) {
		return false;
	}

	// Convert to seconds if timestamp is in milliseconds
	const timestampSec = timestampNum > 1e10 ? Math.floor(timestampNum / 1000) : timestampNum;
	const currentTimeSec = Math.floor(Date.now() / 1000);
	const maxAge = maxTimestampAgeSeconds ?? MAX_TIMESTAMP_AGE_SECONDS;
	const age = Math.abs(currentTimeSec - timestampSec);
	return age <= maxAge;
}
