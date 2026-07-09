import { BaseError, type BaseErrorOptions } from '../base/base.error';
import type { Functionality, IDataObject, JsonObject } from '../../interfaces';

interface ExecutionBaseErrorOptions extends BaseErrorOptions {
	cause?: Error;
	errorResponse?: JsonObject;
}

export abstract class ExecutionBaseError extends BaseError {
	// `BaseError.description` is readonly, but subclasses (e.g. NodeApiError,
	// ExpressionError) reassign it, so redeclare it as writable here. `declare`
	// avoids re-initializing the field and clobbering the value set by `super`.
	declare description: string | null | undefined;

	override cause?: Error;

	errorResponse?: JsonObject;

	timestamp: number;

	context: IDataObject = {};

	lineNumber: number | undefined;

	functionality: Functionality = 'regular';

	constructor(message: string, options: ExecutionBaseErrorOptions = {}) {
		super(message, options);

		this.name = this.constructor.name;
		this.timestamp = Date.now();

		const { cause, errorResponse } = options;
		if (cause instanceof ExecutionBaseError) {
			this.context = cause.context;
		} else if (cause && !(cause instanceof Error)) {
			this.cause = cause;
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
			cause: this.cause,
		};
	}
}
