import { BaseError, type BaseErrorOptions } from '../base/base.error';
import type { Functionality, IDataObject, JsonObject } from '../../interfaces';

interface ExecutionBaseErrorOptions extends BaseErrorOptions {
	cause?: Error;
	errorResponse?: JsonObject;
}

export abstract class ExecutionBaseError extends BaseError {
	// `declare` is load-bearing on both fields: at target es2022 a plain
	// redeclaration is defined as `undefined` after `super()` runs, clobbering what
	// `super` set — `description` from `BaseError`, `cause` from native `Error`.
	// `description` is readonly on `BaseError`, but subclasses reassign it.
	declare description: string | null | undefined;

	declare cause?: Error;

	errorResponse?: JsonObject;

	timestamp: number;

	context: IDataObject = {};

	lineNumber: number | undefined;

	functionality: Functionality = 'regular';

	constructor(message: string, options: ExecutionBaseErrorOptions = {}) {
		super(message, options);

		// Defined, not assigned: assignment throws when `Error.prototype` is frozen (task runner secure mode)
		Object.defineProperty(this, 'name', {
			value: this.constructor.name,
			writable: true,
			enumerable: true,
			configurable: true,
		});
		this.timestamp = Date.now();

		// `cause` itself needs no assignment: `BaseError` forwards it to the native
		// `Error` constructor, which installs it as a non-enumerable own property.
		const { cause, errorResponse } = options;
		if (cause instanceof ExecutionBaseError) {
			this.context = cause.context;
		}

		if (errorResponse) this.errorResponse = errorResponse;
	}

	toJSON?() {
		return {
			message: this.message,
			lineNumber: this.lineNumber,
			timestamp: this.timestamp,
			name: this.name,
			description: this.description,
			context: this.context,
			// Bounded projection: an `Error` cause can be a raw axios error carrying
			// request headers and circular refs, and this output is persisted.
			cause:
				this.cause instanceof Error
					? { name: this.cause.name, message: this.cause.message }
					: this.cause,
		};
	}
}
