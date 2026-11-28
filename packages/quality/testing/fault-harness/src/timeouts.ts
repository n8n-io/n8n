import type { Role, SetHookSpec } from './hooks/spec';
import { FILES } from './hooks/spec';

const assertScale = (scale: number) => {
	if (!(scale >= 1)) throw new Error(`scale must be 1 or more, got ${scale}`);
};

/** Bull and shutdown timeouts at n8n defaults, divided by `scale`. */
export function scaledTimeouts(scale: number): Record<string, string> {
	assertScale(scale);
	const ms = (value: number) => String(Math.round(value / scale));
	return {
		QUEUE_WORKER_LOCK_DURATION: ms(60_000),
		QUEUE_WORKER_LOCK_RENEW_TIME: ms(10_000),
		QUEUE_WORKER_STALLED_INTERVAL: ms(30_000),
		N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(Math.max(1, Math.round(30 / scale))),
	};
}

/**
 * Engine v2 reconciliation, staleness and wait sweep timers at their defaults divided by `scale`,
 * as `set` hooks for the containers that run the engine.
 */
export function scaledEngineTimers(scale: number, roles: Role[]): SetHookSpec[] {
	assertScale(scale);
	const ms = (value: number) => Math.round(value / scale);
	return [
		{
			point: 'engine-staleness',
			kind: 'set',
			file: FILES.engineStaleness,
			target: 'DEFAULT_STALENESS_THRESHOLDS',
			values: { queuedMs: ms(60_000), runningStepMs: ms(600_000) },
			roles,
			optional: true,
		},
		{
			point: 'engine-reconciliation-interval',
			kind: 'set',
			file: FILES.engineReconciliationSweeper,
			target: '',
			values: { DEFAULT_RECONCILIATION_INTERVAL_MS: ms(60_000) },
			roles,
			optional: true,
		},
		{
			point: 'engine-wait-sweep-interval',
			kind: 'set',
			file: FILES.engineWaitSweeper,
			target: '',
			values: { DEFAULT_WAIT_SWEEP_INTERVAL_MS: ms(60_000) },
			roles,
		},
	];
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
