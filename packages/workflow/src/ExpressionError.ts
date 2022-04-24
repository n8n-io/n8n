// eslint-disable-next-line import/no-cycle
import { ExecutionBaseError } from './NodeErrors';

/**
 * Class for instantiating an expression error
 */
export class ExpressionError extends ExecutionBaseError {
	constructor(
		message: string,
		options?: {
			description?: string;
			runIndex?: number;
			itemIndex?: number;
			parameter?: string;
			failExecution?: boolean;
		},
	) {
		super(new Error(message));

		if (options?.description !== undefined) {
			this.description = options.description;
		}

		if (options?.runIndex !== undefined) {
			this.context.runIndex = options.runIndex;
		}

		if (options?.itemIndex !== undefined) {
			this.context.itemIndex = options.itemIndex;
		}

		if (options?.parameter !== undefined) {
			this.context.parameter = options.parameter;
		}

		this.context.failExecution = !!options?.failExecution;
	}
}
