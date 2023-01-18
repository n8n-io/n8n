import type { INode } from './Interfaces';

/**
 * Class for instantiating an operational error, e.g. a timeout error.
 */
export class WorkflowOperationError extends Error {
	node: INode | undefined;

	timestamp: number;

	lineNumber: number | undefined;

	constructor(message: string, node?: INode) {
		super(message);
		this.name = this.constructor.name;
		this.node = node;
		this.timestamp = Date.now();
	}
}

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

export class CliWorkflowOperationError extends SubworkflowOperationError {}
