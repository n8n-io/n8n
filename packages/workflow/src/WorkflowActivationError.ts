import { INode } from './Interfaces';
import { ExecutionBaseError } from './NodeErrors';

/**
 * Class for instantiating an workflow activation error
 */
export class WorkflowActivationError extends ExecutionBaseError {
	node: INode | undefined;

	constructor(message: string, error: Error, node?: INode) {
		super(error);
		this.node = node;
		this.cause = {
			message: error.message,
			stack: error.stack as string,
		};
		this.message = message;
	}
}
