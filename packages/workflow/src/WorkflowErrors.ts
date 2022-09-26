import { INode } from './Interfaces';

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
