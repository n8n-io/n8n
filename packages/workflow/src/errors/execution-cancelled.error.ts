import { ExecutionBaseError } from './abstract/execution-base.error';

export type CancellationReason = 'manual' | 'timeout' | 'shutdown';

export abstract class ExecutionCancelledError extends ExecutionBaseError {
	readonly reason: CancellationReason;

	// NOTE: prefer one of the more specific
	constructor(executionId: string, reason: CancellationReason) {
		super('The execution was cancelled', {
			level: 'warning',
			extra: { executionId },
		});
		this.reason = reason;
	}
}

export class ManualExecutionCancelledError extends ExecutionCancelledError {
	constructor(executionId: string) {
		super(executionId, 'manual');
		this.message = 'The execution was cancelled manually';
	}
}

export class TimeoutExecutionCancelledError extends ExecutionCancelledError {
	constructor(executionId: string) {
		super(executionId, 'timeout');
		this.message = 'The execution was cancelled because it timed out';
	}
}

export class SystemShutdownExecutionCancelledError extends ExecutionCancelledError {
	constructor(executionId: string) {
		super(executionId, 'shutdown');
		this.message = 'The execution was cancelled because the system is shutting down';
	}
}
