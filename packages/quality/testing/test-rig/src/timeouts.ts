/** Bull and shutdown timeouts at n8n defaults, divided by `scale`; `overrides` win. */
export function scaledTimeouts(
	scale: number,
	overrides: Record<string, string> = {},
): Record<string, string> {
	if (!(scale >= 1)) throw new Error(`scale must be 1 or more, got ${scale}`);
	const ms = (value: number) => String(Math.round(value / scale));
	return {
		QUEUE_WORKER_LOCK_DURATION: ms(60_000),
		QUEUE_WORKER_LOCK_RENEW_TIME: ms(10_000),
		QUEUE_WORKER_STALLED_INTERVAL: ms(30_000),
		N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(Math.max(1, Math.round(30 / scale))),
		...overrides,
	};
}

const LICENCE_KEYS = ['N8N_LICENSE_ACTIVATION_KEY', 'N8N_LICENSE_CERT'] as const;

/**
 * Licence env for a stack. The containers package forwards a licence from the
 * shell into every stack; single-main stacks get it blanked so results do not
 * depend on licensed features. Multi-main stacks need one.
 */
export function licenceEnv(
	mains: number,
	shell: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
	if (mains <= 1) return Object.fromEntries(LICENCE_KEYS.map((key) => [key, '']));
	if (!LICENCE_KEYS.some((key) => shell[key])) {
		throw new Error(`a multi-main stack needs ${LICENCE_KEYS.join(' or ')} in the environment`);
	}
	return {};
}
