// eslint-disable-next-line import/no-cycle
import { ExecutionBaseError } from './NodeErrors';

/**
 * Class for instantiating an expression error
 */
export class ExpressionError extends ExecutionBaseError {
	constructor(
		message: string,
		options?: {
			causeDetailed?: string;
			description?: string;
			descriptionTemplate?: string;
			runIndex?: number;
			itemIndex?: number;
			messageTemplate?: string;
			parameter?: string;
			failExecution?: boolean;
		},
	) {
		super(new Error(message));

		if (options?.description !== undefined) {
			this.description = options.description;
		}

		if (options?.descriptionTemplate !== undefined) {
			this.context.descriptionTemplate = options.descriptionTemplate;
		}

		if (options?.causeDetailed !== undefined) {
			this.context.causeDetailed = options.causeDetailed;
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

		if (options?.messageTemplate !== undefined) {
			this.context.messageTemplate = options.messageTemplate;
		}

		this.context.failExecution = !!options?.failExecution;
	}
}
