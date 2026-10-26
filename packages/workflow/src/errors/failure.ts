/** Causes where the source comes back on its own, so a wait can help. */
export const TIMED_CAUSES = [
	/** The source is throttling requests. */
	'rate-limited',
	/** A usage quota is used up until it resets. */
	'quota-exhausted',
	/** The source is down or degraded right now. */
	'temporarily-unavailable',
] as const;

/** Causes where someone has to act before the operation can succeed. */
export const ACTIONABLE_CAUSES = [
	/** The credential is dead and the user has to reconnect it. */
	'credential-invalid',
	/** The node points at something that no longer exists or is no longer allowed. */
	'configuration-invalid',
	/** A bug in the node itself, neither the credential nor the configuration is to blame. */
	'node-defect',
] as const;

export type TimedCause = (typeof TIMED_CAUSES)[number];
export type ActionableCause = (typeof ACTIONABLE_CAUSES)[number];

/**
 * Why an operation failed, declared by the node that ran it. Carried as plain data on the
 * error's `failure`, so a reader needs neither `instanceof` nor this exact copy of the
 * package. It says why the operation failed, never what to do about it.
 *
 * Wait hints only exist on the causes a wait can help. Nothing to wait for on the others.
 */
export type Failure =
	| {
			cause: TimedCause;
			/** Minimum wait the source asked for, in ms. */
			retryAfterMs?: number;
			/** When the source says the operation will work again, as Unix epoch ms. */
			resetsAtEpochMs?: number;
	  }
	| { cause: ActionableCause };
