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
