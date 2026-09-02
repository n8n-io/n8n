export const ExecutionStatusList = [
	'canceled',
	'crashed',
	'error',
	'new',
	'running',
	'success',
	'unknown',
	'waiting',
] as const;

export type ExecutionStatus = (typeof ExecutionStatusList)[number];
export type CompletedExecutionStatus = 'crashed' | 'error' | 'success';
export type TerminalExecutionStatus = CompletedExecutionStatus | 'canceled';

export function isCompletedExecutionStatus(
	status: ExecutionStatus,
): status is CompletedExecutionStatus {
	return status === 'crashed' || status === 'error' || status === 'success';
}

/**
 * Statuses that may be overwritten to `crashed` by recovery. These are the in-progress
 * and indeterminate states; `waiting` and the terminal statuses are deliberately excluded
 * so a legitimately paused or finished execution is never marked as crashed.
 */
export const CRASHABLE_EXECUTION_STATUSES = ['new', 'running', 'unknown'] as const;

export function isTerminalExecutionStatus(
	status: ExecutionStatus | undefined,
): status is TerminalExecutionStatus {
	return (
		status === 'canceled' || status === 'crashed' || status === 'error' || status === 'success'
	);
}
