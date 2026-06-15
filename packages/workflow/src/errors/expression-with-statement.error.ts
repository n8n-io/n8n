import { ExpressionError } from './expression.error';

export class ExpressionWithStatementError extends ExpressionError {
	constructor() {
		super('Cannot use "with" statements due to security concerns');
	}
}
