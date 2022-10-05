import { INode } from './Interfaces';

/**
 * Class for instantiating an operational error, e.g. a timeout error.
 */
export class WorkflowOperationError extends Error {
	node: INode | undefined;

	description = '';

	cause: object;

	timestamp: number;

	constructor(message: string, description?: string, node?: INode) {
		super(message);
		this.name = this.constructor.name;
		this.node = node;
		this.timestamp = Date.now();
		if (description) this.description = description;

		this.cause = {
			message,
			stack: this.stack as string,
		};
	}
}
