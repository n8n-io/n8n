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

export function isTerminalExecutionStatus(
	status: ExecutionStatus | undefined,
): status is TerminalExecutionStatus {
	return (
		status === 'canceled' || status === 'crashed' || status === 'error' || status === 'success'
	);
}
