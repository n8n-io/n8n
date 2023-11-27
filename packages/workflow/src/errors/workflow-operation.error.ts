import type { INode } from '..';
import { ExecutionBaseError } from './abstract/execution-base.error';

/**
 * Class for instantiating an operational error, e.g. a timeout error.
 */
export class WorkflowOperationError extends ExecutionBaseError {
	node: INode | undefined;

	timestamp: number;

	lineNumber: number | undefined;

	description: string | undefined;

	constructor(message: string, node?: INode) {
		super(message, { cause: undefined });
		this.severity = 'warning';
		this.name = this.constructor.name;
		this.node = node;
		this.timestamp = Date.now();
	}
}
