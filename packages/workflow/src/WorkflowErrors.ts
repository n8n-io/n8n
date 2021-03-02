import { INode } from '.';

/**
 * Class for instantiating an operational error, e.g. a timeout error.
 */
export class WorkflowOperationError extends Error {
	node: INode | undefined;
	timestamp: number;

	constructor(error: string, node?: INode, ) {
		super(error);
		this.name = this.constructor.name;
		this.node = node;
		this.timestamp = Date.now();
	}
}
