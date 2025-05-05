import { ExecutionBaseError } from './abstract/execution-base.error';

export type ExecutionCancellationReason = 'manual' | 'timeout' | 'server-restarted';

export class ExecutionCancelledError extends ExecutionBaseError {
	constructor(
		executionId: string,
		readonly reason: ExecutionCancellationReason,
	) {
		super('The execution was cancelled', {
			level: 'warning',
			extra: { executionId },
		});
	}
}
