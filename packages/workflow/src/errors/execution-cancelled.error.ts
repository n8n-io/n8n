import { ExecutionBaseError } from './abstract/execution-base.error';

export class ExecutionCancelledError extends ExecutionBaseError {
	constructor(executionId: string) {
		super('The execution was cancelled', {
			level: 'warning',
			extra: { executionId },
		});
	}
}
