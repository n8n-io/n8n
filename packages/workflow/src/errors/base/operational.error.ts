import type { BaseErrorOptions } from '@/errors/base/base.error';
import { BaseError } from '@/errors/base/base.error';

export type OperationalErrorOptions = Omit<BaseErrorOptions, 'level'> & {
	level?: 'info' | 'warning' | 'error';
};

/**
 * Error that indicates a transient issue, like a network request failing,
 * a database query timing out, etc. These are expected to happen and should
 * be handled gracefully.
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
