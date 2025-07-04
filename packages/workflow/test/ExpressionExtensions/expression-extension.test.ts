// @vitest-environment jsdom

/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */

import { evaluate } from './helpers';
import { ExpressionExtensionError } from '../../src/errors/expression-extension.error';
import { extendTransform, extend } from '../../src/extensions';
import { joinExpression, splitExpression } from '../../src/extensions/expression-parser';

describe('Expression Extension Transforms', () => {
	describe('extend() transform', () => {
		test('Basic transform with .isEmpty', () => {
			expect(extendTransform('"".isEmpty()')!.code).toEqual('extend("", "isEmpty", [])');
		});

		test('Chained transform with .toSnakeCase.toSentenceCase', () => {
			expect(extendTransform('"".toSnakeCase().toSentenceCase(2)')!.code).toEqual(
				'extend(extend("", "toSnakeCase", []), "toSentenceCase", [2])',
			);
		});

		test('Chained transform with native functions .toSnakeCase.trim.toSentenceCase', () => {
			expect(extendTransform('"aaa ".toSnakeCase().trim().toSentenceCase(2)')!.code).toEqual(
				'extend(extend("aaa ", "toSnakeCase", []).trim(), "toSentenceCase", [2])',
			);
		});
	});
});

describe('Expression Parser', () => {
	describe('Compatible splitting', () => {
		test('Lone expression', () => {
			expect(splitExpression('{{ "" }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "" ', hasClosingBrackets: true },
			]);
		});

		test('Multiple expression', () => {
			expect(splitExpression('{{ "test".toSnakeCase() }} you have ${{ (100).format() }}.')).toEqual(
				[
					{ type: 'text', text: '' },
					{ type: 'code', text: ' "test".toSnakeCase() ', hasClosingBrackets: true },
					{ type: 'text', text: ' you have $' },
					{ type: 'code', text: ' (100).format() ', hasClosingBrackets: true },
					{ type: 'text', text: '.' },
				],
			);
		});

		test('Unclosed expression', () => {
			expect(splitExpression('{{ "test".toSnakeCase() }} you have ${{ (100).format()')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "test".toSnakeCase() ', hasClosingBrackets: true },
				{ type: 'text', text: ' you have $' },
				{ type: 'code', text: ' (100).format()', hasClosingBrackets: false },
			]);
		});

		test('Escaped opening bracket', () => {
			expect(splitExpression('test \\{{ no code }}')).toEqual([
				{ type: 'text', text: 'test \\{{ no code }}' },
			]);
		});

		test('Escaped closinging bracket', () => {
			expect(splitExpression('test {{ code.test("\\}}") }}')).toEqual([
				{ type: 'text', text: 'test ' },
				{ type: 'code', text: ' code.test("}}") ', hasClosingBrackets: true },
			]);
		});
	});

	describe('Compatible joining', () => {
		test('Lone expression', () => {
			expect(joinExpression(splitExpression('{{ "" }}'))).toEqual('{{ "" }}');
		});

		test('Multiple expression', () => {
			expect(
				joinExpression(
					splitExpression('{{ "test".toSnakeCase() }} you have ${{ (100).format() }}.'),
				),
			).toEqual('{{ "test".toSnakeCase() }} you have ${{ (100).format() }}.');
		});

		test('Unclosed expression', () => {
			expect(
				joinExpression(splitExpression('{{ "test".toSnakeCase() }} you have ${{ (100).format()')),
			).toEqual('{{ "test".toSnakeCase() }} you have ${{ (100).format()');
		});

		test('Escaped opening bracket', () => {
			expect(joinExpression(splitExpression('test \\{{ no code }}'))).toEqual(
				'test \\{{ no code }}',
			);
		});

		test('Escaped closing bracket', () => {
			expect(joinExpression(splitExpression('test {{ code.test("\\}}") }}'))).toEqual(
				'test {{ code.test("\\}}") }}',
			);
		});
	});

	describe('Edge cases', () => {
		test("Nested member access with name of function inside a function doesn't result in function call", () => {
			expect(evaluate('={{ Math.floor([1, 2, 3, 4].length + 10) }}')).toEqual(14);

			expect(extendTransform('Math.floor([1, 2, 3, 4].length + 10)')?.code).toBe(
				'extend(Math, "floor", [[1, 2, 3, 4].length + 10])',
			);
		});
	});

	describe('Test newer ES syntax', () => {
		test('Optional chaining transforms', () => {
			expect(extendTransform('$json.something?.test.funcCall()')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = $json.something) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1.test.funcCall();',
			);

			expect(extendTransform('$json.something?.test.funcCall()?.somethingElse')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = $json.something) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainCancelToken1 = ((window.chainValue1 = window.chainValue1.test.funcCall()) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1.somethingElse;',
			);

			expect(extendTransform('$json.something?.test.funcCall().somethingElse')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = $json.something) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1.test.funcCall().somethingElse;',
			);

			expect(
				extendTransform('$json.something?.test.funcCall()?.somethingElse.otherCall()')?.code,
			).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = $json.something) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainCancelToken1 = ((window.chainValue1 = window.chainValue1.test.funcCall()) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1.somethingElse.otherCall();',
			);

			expect(evaluate('={{ [1, 2, 3, 4]?.sum() }}')).toBe(10);
		});

		test('Optional chaining transforms on calls', () => {
			expect(extendTransform('Math.min?.(1)')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = extendOptional(Math, "min")) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1(1);',
			);
			expect(extendTransform('Math?.min?.(1)')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = Math) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainCancelToken1 = ((window.chainValue1 = extendOptional(window.chainValue1, "min")) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1(1);',
			);

			expect(extendTransform('$json.test.test2?.sum()')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = $json.test.test2) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : extend(window.chainValue1, "sum", []);',
			);
			expect(extendTransform('$json.test.test2?.sum?.()')?.code).toBe(
				'window.chainCancelToken1 = ((window.chainValue1 = $json.test.test2) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainCancelToken1 = ((window.chainValue1 = extendOptional(window.chainValue1, "sum")) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1();',
			);

			expect(evaluate('={{ [1, 2, 3, 4].sum?.() }}')).toBe(10);
		});

		test('Multiple optional chains in an expression', () => {
			expect(extendTransform('$json.test?.test2($json.test?.test2)')?.code).toBe(`window.chainCancelToken2 = ((window.chainValue2 = $json.test) ?? undefined) === undefined, window.chainCancelToken2 === true ? undefined : window.chainValue2.test2(
  (window.chainCancelToken1 = ((window.chainValue1 = $json.test) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1.test2)
);`);

			expect(extendTransform('$json.test?.test2($json.test.sum?.())')?.code).toBe(`window.chainCancelToken2 = ((window.chainValue2 = $json.test) ?? undefined) === undefined, window.chainCancelToken2 === true ? undefined : window.chainValue2.test2(
  (window.chainCancelToken1 = ((window.chainValue1 = extendOptional($json.test, "sum")) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1())
);`);
		});

		expect(evaluate('={{ [1, 2, 3, 4]?.sum((undefined)?.test) }}')).toBe(10);
	});

	describe('Non dot extensions', () => {
		test('min', () => {
			expect(evaluate('={{ min(1, 2, 3, 4, 5, 6) }}')).toEqual(1);
			expect(evaluate('={{ min(1, NaN, 3, 4, 5, 6) }}')).toBeNaN();
		});

		test('max', () => {
			expect(evaluate('={{ max(1, 2, 3, 4, 5, 6) }}')).toEqual(6);
			expect(evaluate('={{ max(1, NaN, 3, 4, 5, 6) }}')).toBeNaN();
		});

		test('average', () => {
			expect(evaluate('={{ average(1, 2, 3, 4, 5, 6) }}')).toEqual(3.5);
			expect(evaluate('={{ average(1, NaN, 3, 4, 5, 6) }}')).toBeNaN();
		});

		test('numberList', () => {
			expect(evaluate('={{ numberList(1, 10) }}')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
			expect(evaluate('={{ numberList(1, -10) }}')).toEqual([
				1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10,
			]);
		});

		test('zip', () => {
			expect(evaluate('={{ zip(["test1", "test2", "test3"], [1, 2, 3]) }}')).toEqual({
				test1: 1,
				test2: 2,
				test3: 3,
			});
		});

		test('$if', () => {
			expect(evaluate('={{ $if("a"==="a", 1, 2) }}')).toEqual(1);
			expect(evaluate('={{ $if("a"==="b", 1, 2) }}')).toEqual(2);
			expect(evaluate('={{ $if("a"==="a", 1) }}')).toEqual(1);
			expect(evaluate('={{ $if("a"==="b", 1) }}')).toEqual(false);

			// This will likely break when sandboxing is implemented but it works for now.
			// If you're implementing sandboxing maybe provide a way to add functions to
			// sandbox we can check instead?
			const mockCallback = vi.fn(() => false);
			evaluate('={{ $if("a"==="a", true, $data.cb()) }}', [{ cb: mockCallback }]);
			expect(mockCallback.mock.calls.length).toEqual(0);

			evaluate('={{ $if("a"==="b", true, $data.cb()) }}', [{ cb: mockCallback }]);
			expect(mockCallback.mock.calls.length).toEqual(1);
		});

		test('$not', () => {
			expect(evaluate('={{ $not(1) }}')).toEqual(false);
			expect(evaluate('={{ $not(0) }}')).toEqual(true);
			expect(evaluate('={{ $not(true) }}')).toEqual(false);
			expect(evaluate('={{ $not(false) }}')).toEqual(true);
			expect(evaluate('={{ $not(undefined) }}')).toEqual(true);
			expect(evaluate('={{ $not(null) }}')).toEqual(true);
			expect(evaluate('={{ $not("") }}')).toEqual(true);
			expect(evaluate('={{ $not("a") }}')).toEqual(false);
		});
		test('$ifEmpty', () => {
			expect(evaluate('={{ $ifEmpty(1, "default") }}')).toEqual(1);
			expect(evaluate('={{ $ifEmpty(0, "default") }}')).toEqual(0);
			expect(evaluate('={{ $ifEmpty(false, "default") }}')).toEqual(false);
			expect(evaluate('={{ $ifEmpty(true, "default") }}')).toEqual(true);
			expect(evaluate('={{ $ifEmpty("", "default") }}')).toEqual('default');
			expect(evaluate('={{ $ifEmpty(null, "default") }}')).toEqual('default');
			expect(evaluate('={{ $ifEmpty(undefined, "default") }}')).toEqual('default');
			expect(evaluate('={{ $ifEmpty([], "default") }}')).toEqual('default');
			expect(evaluate('={{ $ifEmpty({}, "default") }}')).toEqual('default');
			expect(evaluate('={{ $ifEmpty([1], "default") }}')).toEqual([1]);
			expect(evaluate('={{ $ifEmpty({a: 1}, "default") }}')).toEqual({ a: 1 });
		});
	});

	describe('Test extend with undefined', () => {
		test('input is undefined', () => {
			try {
				extend(undefined, 'toDateTime', []);
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionExtensionError);
				expect(error).toHaveProperty('message', "toDateTime can't be used on undefined value");
			}
		});
		test('input is null', () => {
			try {
				extend(null, 'startsWith', []);
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionExtensionError);
				expect(error).toHaveProperty('message', "startsWith can't be used on null value");
			}
		});
		test('input should be converted to upper case', () => {
			const result = extend('TEST', 'toUpperCase', []);

			expect(result).toEqual('TEST');
		});
	});
});
