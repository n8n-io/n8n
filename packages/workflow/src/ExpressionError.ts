/**
 * Class for instantiating an expression error
 */
export class ExpressionError extends Error {
	failExecution: boolean;

	itemIndex: number;

	runIndex: number;

	constructor(message: string, itemIndex: number, runIndex: number, failExecution = false) {
		super(message);
		this.name = this.constructor.name;
		this.itemIndex = itemIndex;
		this.runIndex = runIndex;
		this.failExecution = failExecution;
	}
}
