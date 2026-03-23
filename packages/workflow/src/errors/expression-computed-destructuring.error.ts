import { ExpressionError } from './expression.error';

export class ExpressionComputedDestructuringError extends ExpressionError {
	constructor() {
		super('Computed property names in destructuring are not allowed due to security concerns');
	}
}
