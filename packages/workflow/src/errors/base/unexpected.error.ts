import type { BaseErrorOptions } from '@/errors/base/base.error';
import { BaseError } from '@/errors/base/base.error';

export type UnexpectedErrorOptions = Omit<BaseErrorOptions, 'level'> & {
	level?: 'error' | 'fatal';
};

/**
 * Error that indicates something is wrong in the code: logic mistakes,
 * unhandled cases, assertions that fail. These are not recoverable and
 * should be brought to developers' attention.
 *
 * Default level: error
 * Default shouldReport: true
 */
export class UnexpectedError extends BaseError {
	constructor(message: string, opts: UnexpectedErrorOptions = {}) {
		opts.level = opts.level ?? 'error';
		opts.shouldReport = opts.shouldReport ?? true;

		super(message, opts);
	}
}
