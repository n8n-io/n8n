export const ExecutionStatusList = [
	'canceled' as const,
	'crashed' as const,
	'error' as const,
	'new' as const,
	'running' as const,
	'success' as const,
	'unknown' as const,
	'waiting' as const,
	'warning' as const,
];

export type ExecutionStatus = (typeof ExecutionStatusList)[number];
