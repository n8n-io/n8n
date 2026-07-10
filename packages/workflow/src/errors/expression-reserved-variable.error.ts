import { ExpressionError } from './expression.error';

export class ExpressionReservedVariableError extends ExpressionError {
	constructor(variableName: string) {
		super(`Cannot use "${variableName}" due to security concerns`);
	}
}
