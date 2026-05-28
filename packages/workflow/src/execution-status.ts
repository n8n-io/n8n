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

export const TERMINAL_EXECUTION_STATUSES = ['canceled', 'crashed', 'error', 'success'] as const;

export type TerminalExecutionStatus = (typeof TERMINAL_EXECUTION_STATUSES)[number];

export function isTerminalExecutionStatus(
	status: ExecutionStatus | undefined,
): status is TerminalExecutionStatus {
	return (
		status === 'canceled' || status === 'crashed' || status === 'error' || status === 'success'
	);
}
