import { BaseError } from './base.error';

/**
 * Error that indicates a runtime issue typically because of a programming mistake or misuse,
 * e.g. placing a decorator on a target that does not support it.
 *
 * Default level: info
 */
export class RuntimeError extends BaseError {
	constructor(message: string) {
		super(message, { level: 'info' });
	}
}
