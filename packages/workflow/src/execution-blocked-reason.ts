/** Why a run stopped before its first node. `callerPolicy`: the workflow refused its caller. */
export const EXECUTION_BLOCKED_REASONS = [
	'policy',
	'callerPolicy',
	'credentialAccess',
	'invalidWorkflow',
	'contextHook',
	'startFailed',
] as const;

export type ExecutionBlockedReason = (typeof EXECUTION_BLOCKED_REASONS)[number];

export function isExecutionBlockedReason(value: unknown): value is ExecutionBlockedReason {
	return EXECUTION_BLOCKED_REASONS.some((reason) => reason === value);
}

/** The stored marker. Runs saved before the marker held a reason have `true`. */
export type FailedBeforeStartMarker = ExecutionBlockedReason | true;
