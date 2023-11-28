import { WorkflowOperationError } from './workflow-operation.error';

export class SubworkflowOperationError extends WorkflowOperationError {
	description = '';

	cause: { message: string; stack: string };

	constructor(message: string, description: string) {
		super(message);
		this.name = this.constructor.name;
		this.description = description;

		this.cause = {
			message,
			stack: this.stack as string,
		};
	}
}
