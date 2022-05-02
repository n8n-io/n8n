// eslint-disable-next-line import/no-cycle
import { INode } from '.';

/**
 * Class for instantiating an operational error, e.g. a timeout error.
 */
export class WorkflowOperationError extends Error {
	node: INode | undefined;

	timestamp: number;

	constructor(message: string, node?: INode) {
		super(message);
		this.name = this.constructor.name;
		this.node = node;
		this.timestamp = Date.now();
	}
}
