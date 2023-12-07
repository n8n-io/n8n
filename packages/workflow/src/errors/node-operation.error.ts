import type { INode, JsonObject } from '..';
import type { NodeOperationErrorOptions } from './node-api.error';
import { NodeError } from './abstract/node.error';

/**
 * Class for instantiating an operational error, e.g. an invalid credentials error.
 */
export class NodeOperationError extends NodeError {
	lineNumber: number | undefined;

	constructor(
		node: INode,
		error: Error | string | JsonObject,
		options: NodeOperationErrorOptions = {},
	) {
		if (typeof error === 'string') {
			error = new Error(error);
		}
		super(node, error);

		if (options.message) this.message = options.message;
		if (options.level) this.level = options.level;
		if (options.functionality) this.functionality = options.functionality;
		this.description = options.description;
		this.context.runIndex = options.runIndex;
		this.context.itemIndex = options.itemIndex;

		if (this.message === this.description) {
			this.description = undefined;
		}

		[this.message, this.description] = this.setDescriptiveErrorMessage(
			this.message,
			this.description,
			undefined,
			options.messageMapping,
		);
	}
}
