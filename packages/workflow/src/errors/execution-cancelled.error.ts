import { ExecutionBaseError } from './abstract/execution-base.error';

export type ExecutionCancellationReason = 'timeout' | 'manual' | 'system' | 'unknown';

export class ExecutionCancelledError extends ExecutionBaseError {
	constructor(executionId: string, reason: ExecutionCancellationReason) {
		super('The execution was cancelled', {
			level: 'warning',
			extra: { executionId, reason },
		});
	}
}
