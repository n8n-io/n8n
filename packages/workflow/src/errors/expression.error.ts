import type { IDataObject } from '../interfaces';
import { ExecutionBaseError } from './abstract/execution-base.error';

export interface ExpressionErrorOptions {
	cause?: Error;
	causeDetailed?: string;
	description?: string;
	descriptionKey?: string;
	descriptionTemplate?: string;
	functionality?: 'pairedItem';
	itemIndex?: number;
	messageTemplate?: string;
	nodeCause?: string;
	parameter?: string;
	runIndex?: number;
	type?:
		| 'no_execution_data'
		| 'no_node_execution_data'
		| 'no_input_connection'
		| 'internal'
		| 'paired_item_invalid_info'
		| 'paired_item_no_info'
		| 'paired_item_multiple_matches'
		| 'paired_item_no_connection'
		| 'paired_item_intermediate_nodes';
}

/**
 * Class for instantiating an expression error
 */
export class ExpressionError extends ExecutionBaseError {
	constructor(message: string, options?: ExpressionErrorOptions) {
		super(message, { cause: options?.cause, level: 'warning' });

		if (options?.description !== undefined) {
			this.description = options.description;
		}

		const allowedKeys = [
			'causeDetailed',
			'descriptionTemplate',
			'descriptionKey',
			'itemIndex',
			'messageTemplate',
			'nodeCause',
			'parameter',
			'runIndex',
			'type',
		];

		if (options !== undefined) {
			if (options.functionality !== undefined) {
				this.functionality = options.functionality;
			}

			Object.keys(options as IDataObject).forEach((key) => {
				if (allowedKeys.includes(key)) {
					this.context[key] = (options as IDataObject)[key];
				}
			});
		}
	}
}
