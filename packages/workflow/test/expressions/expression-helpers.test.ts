import { isExpression } from '../../src/expressions/expression-helpers';

describe('ExpressionHelpers', () => {
	describe('isExpression', () => {
		describe('should return true for valid expressions', () => {
			test.each([
				['=1', 'simple number expression'],
				['=true', 'boolean expression'],
				['="hello"', 'string expression'],
				['={{ $json.field }}', 'complex expression with spaces'],
			])('"$s" should be an expression', (expr) => {
				expect(isExpression(expr)).toBe(true);
			});
		});

		describe('should return false for invalid expressions', () => {
			test.each([[null], [undefined], [1], [true], [''], ['hello']])(
				'"$s" should not be an expression',
				(expr) => {
					expect(isExpression(expr)).toBe(false);
				},
			);
		});
	});
});
