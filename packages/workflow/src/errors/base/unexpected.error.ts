import type { BaseErrorOptions } from './base.error';
import { BaseError } from './base.error';

export type UnexpectedErrorOptions = Omit<BaseErrorOptions, 'level'> & {
	level?: 'error' | 'fatal';
};

/**
 * Error that indicates something is wrong in the code: logic mistakes,
 * unhandled cases, assertions that fail. These are not recoverable and
 * should be brought to developers' attention.
 *
 * Default level: error
 */
export class UnexpectedError extends BaseError {
	constructor(message: string, opts: UnexpectedErrorOptions = {}) {
		opts.level = opts.level ?? 'error';

		super(message, opts);
	}
}
