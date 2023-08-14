import type { INode } from './Interfaces';
import { ExecutionBaseError } from './NodeErrors';

interface WorkflowActivationErrorOptions {
	cause?: Error;
	node?: INode;
}

/**
 * Class for instantiating an workflow activation error
 */
export class WorkflowActivationError extends ExecutionBaseError {
	node: INode | undefined;

	constructor(message: string, { cause, node }: WorkflowActivationErrorOptions) {
		let error = cause as Error;
		if (cause instanceof ExecutionBaseError) {
			error = new Error(cause.message);
			error.constructor = cause.constructor;
			error.name = cause.name;
			error.stack = cause.stack;
		}
		super(message, { cause: error });
		this.node = node;
		this.message = message;
	}
}
