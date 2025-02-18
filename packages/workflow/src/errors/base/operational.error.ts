import type { BaseErrorOptions } from './base.error';
import { BaseError } from './base.error';

export type OperationalErrorOptions = Omit<BaseErrorOptions, 'level'> & {
	level?: 'info' | 'warning' | 'error';
};

/**
 * Error that indicates a transient issue, like a network request failing,
 * a database query timing out, etc. These are expected to happen, are
 * transient by nature and should be handled gracefully.
 *
 * Default level: warning
 * Default shouldReport: false
 */
export class OperationalError extends BaseError {
	constructor(message: string, opts: OperationalErrorOptions = {}) {
		opts.level = opts.level ?? 'warning';
		opts.shouldReport = opts.shouldReport ?? false;

		super(message, opts);
	}
}

/** Convenience function to check if an error is an instance of OperationalError */
export function isOperationalError(error: Error): error is OperationalError {
	return error instanceof OperationalError;
}
