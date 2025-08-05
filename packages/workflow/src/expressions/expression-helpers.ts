/**
 * Checks if the given value is an expression. An expression is a string that
 * starts with '='.
 */
export const isExpression = (expr: unknown): expr is string => {
	if (typeof expr !== 'string') return false;

	return expr.charAt(0) === '=';
};
