import { timingSafeEqual } from 'crypto';

/**
 * Maximum allowed age for a webhook request timestamp (5 minutes).
 * Requests older than this are considered potential replay attacks.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300;

export interface VerifySignatureOptions {
	/**
	 * Returns the expected signature/secret. For HMAC, compute using the same algorithm.
	 * Return `null` if signature cannot be computed (missing secret/body).
	 */
	getExpectedSignature: () => string | null;
	/**
	 * If true, skip validation when `getExpectedSignature()` returns `null`.
	 * Use for backward compatibility with unsigned webhooks.
	 * @default false
	 */
	skipIfNoExpectedSignature?: boolean;
	/**
	 * Returns the actual signature from request headers, or `null` if not present.
	 */
	getActualSignature: () => string | null;
	/**
	 * Optional. Returns timestamp from request (seconds or milliseconds, auto-converted).
	 * Enables replay attack prevention (default: 5 minute window).
	 */
	getTimestamp?: () => number | string | null;
	/**
	 * If true, skip timestamp validation when `getTimestamp()` returns `null`.
	 * @default false
	 */
	skipIfNoTimestamp?: boolean;
	/**
	 * Maximum allowed timestamp age in seconds.
	 * @default 300 (5 minutes)
	 */
	maxTimestampAgeSeconds?: number;
}

/**
 * Verifies webhook signatures and prevents replay attacks.
 *
 * Features:
 * - Signature verification using constant-time comparison (prevents timing attacks)
 * - Optional timestamp validation (prevents replay attacks)
 * - Supports HMAC-based and simple secret comparison patterns
 *
 * @param options - Configuration options
 * @returns `true` if valid, `false` otherwise. Never throws.
 *
 * @example
 * verifySignature({
 *   getExpectedSignature: () => {
 *     const hmac = createHmac('sha256', secret);
 *     hmac.update(rawBody);
 *     return `sha256=${hmac.digest('base64')}`;
 *   },
 *   getActualSignature: () => req.header('x-signature'),
 *   getTimestamp: () => req.header('x-timestamp'),
 * });
 */
export function verifySignature(options: VerifySignatureOptions): boolean {
	const { getExpectedSignature, getActualSignature, getTimestamp, maxTimestampAgeSeconds } =
		options;
	try {
		// Validate timestamp if provided (replay attack prevention)
		if (getTimestamp) {
			const timestamp = getTimestamp();
			const shouldSkip = options.skipIfNoTimestamp && timestamp === null;
			if (!shouldSkip && !isTimestampValid(timestamp, maxTimestampAgeSeconds)) {
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

/**
 * Validates timestamp is within acceptable window (auto-detects seconds/milliseconds).
 */
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
