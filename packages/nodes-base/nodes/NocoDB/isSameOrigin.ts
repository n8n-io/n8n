/**
 * Check whether `url` has the same origin (scheme, host, and port) as `baseUrl`.
 * Returns `false` when either value is not a valid URL.
 */
export function isSameOrigin(url: string, baseUrl: string): boolean {
	try {
		return new URL(url).origin === new URL(baseUrl).origin;
	} catch {
		return false;
	}
}
