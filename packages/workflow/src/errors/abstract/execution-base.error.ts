import type { Functionality, IDataObject, JsonObject } from '../../Interfaces';
import { ApplicationError } from '../application.error';

interface ExecutionBaseErrorOptions {
	cause?: Error;
	errorResponse?: JsonObject;
}

export abstract class ExecutionBaseError extends ApplicationError {
	description: string | null | undefined;

	cause?: Error;

	errorResponse?: JsonObject;

	timestamp: number;

	context: IDataObject = {};

	lineNumber: number | undefined;

	functionality: Functionality = 'regular';

	constructor(message: string, { cause, errorResponse }: ExecutionBaseErrorOptions = {}) {
		const options = cause instanceof Error ? { cause } : {};
		super(message, options);

		this.name = this.constructor.name;
		this.timestamp = Date.now();

		if (cause instanceof ExecutionBaseError) {
			this.context = cause.context;
		} else if (cause && !(cause instanceof Error)) {
			this.cause = cause;
		}

		if (errorResponse) this.errorResponse = errorResponse;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	toJSON?(): any {
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
