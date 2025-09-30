import { ExecutionBaseError } from './abstract/execution-base.error';

export class ExecutionCancelledError extends ExecutionBaseError {
	// NOTE: we make the constructor protected because we should always use a more specific sub-error.
	// If your case doesn't fit any of the sub-errors, then create a new one.
	protected constructor(executionId: string) {
		super('The execution was cancelled', {
			level: 'warning',
			extra: { executionId },
		});
	}
}

export class ManualExecutionCancelledError extends ExecutionCancelledError {
	constructor(executionId: string) {
		super(executionId);
		this.message = 'The execution was cancelled manually';
	}
}

export class TimeoutExecutionCancelledError extends ExecutionCancelledError {
	constructor(executionId: string) {
		super(executionId);
		this.message = 'The execution was cancelled because it timed out';
	}
}

export class SystemShutdownExecutionCancelledError extends ExecutionCancelledError {
	constructor(executionId: string) {
		super(executionId);
		this.message = 'The execution was cancelled because the system is shutting down';
	}
}
