import type { IDataObject } from './Interfaces';
import { ExecutionBaseError } from './NodeErrors';

/**
 * Class for instantiating an expression error
 */
export class ExpressionError extends ExecutionBaseError {
	constructor(
		message: string,
		options?: {
			cause?: Error;
			causeDetailed?: string;
			description?: string;
			descriptionTemplate?: string;
			failExecution?: boolean;
			functionality?: 'pairedItem';
			itemIndex?: number;
			messageTemplate?: string;
			nodeCause?: string;
			parameter?: string;
			runIndex?: number;
			type?: string;
		},
	) {
		super(message, { cause: options?.cause });

		if (options?.description !== undefined) {
			this.description = options.description;
		}

		this.context.failExecution = !!options?.failExecution;

		const allowedKeys = [
			'causeDetailed',
			'descriptionTemplate',
			'functionality',
			'itemIndex',
			'messageTemplate',
			'nodeCause',
			'parameter',
			'runIndex',
			'type',
		];
		if (options !== undefined) {
			Object.keys(options as IDataObject).forEach((key) => {
				if (allowedKeys.includes(key)) {
					this.context[key] = (options as IDataObject)[key];
				}
			});
		}
	}
}

export class ExpressionExtensionError extends ExpressionError {
	constructor(message: string) {
		super(message);
		this.context.failExecution = true;
	}
}
