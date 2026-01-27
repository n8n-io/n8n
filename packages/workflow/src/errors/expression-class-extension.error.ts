import { ExpressionError } from './expression.error';

export class ExpressionClassExtensionError extends ExpressionError {
	constructor(baseClass: string) {
		super(`Cannot extend "${baseClass}" due to security concerns`);
	}
}
