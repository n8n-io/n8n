/**
 * Base error class for all workflow factory-related errors
 */
export class WorkflowBuilderError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, WorkflowBuilderError);
		}
	}
}
