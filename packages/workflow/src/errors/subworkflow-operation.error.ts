import { WorkflowOperationError } from './workflow-operation.error';

export class SubworkflowOperationError extends WorkflowOperationError {
	override description = '';

	override cause: Error;

	constructor(message: string, description: string) {
		super(message);
		this.name = this.constructor.name;
		this.description = description;

		this.cause = {
			name: this.name,
			message,
			stack: this.stack as string,
		};
	}
}
