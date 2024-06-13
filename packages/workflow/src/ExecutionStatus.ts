export const ExecutionStatusList = [
	'canceled',
	'crashed',
	'error',
	'new',
	'running',
	'success',
	'unknown',
	'waiting',
	'warning',
] as const;

export type ExecutionStatus = (typeof ExecutionStatusList)[number];
