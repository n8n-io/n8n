/**
 * Class for instantiating an expression error
 */
export class ExpressionError extends Error {
	failExecution: boolean;

	itemIndex: number;

	runIndex: number;

	parameter: string | undefined;

	constructor(
		message: string,
		runIndex: number,
		itemIndex: number,
		failExecution = false,
		parameter?: string,
	) {
		super(message);
		this.runIndex = runIndex;
		this.itemIndex = itemIndex;
		this.failExecution = failExecution;
		this.parameter = parameter;
	}
}
