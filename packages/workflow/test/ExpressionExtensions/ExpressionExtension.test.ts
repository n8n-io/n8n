/**
 * @jest-environment jsdom
 */

import { extendTransform } from '@/Extensions';
import { joinExpression, splitExpression } from '@/Extensions/ExpressionParser';
import { evaluate } from './Helpers';

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

describe('tmpl Expression Parser', () => {
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

		test('Escaped closinging bracket', () => {
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
			const mockCallback = jest.fn(() => false);
			// @ts-ignore
			evaluate('={{ $if("a"==="a", true, $data["cb"]()) }}', [{ cb: mockCallback }]);
			expect(mockCallback.mock.calls.length).toEqual(0);

			// @ts-ignore
			evaluate('={{ $if("a"==="b", true, $data["cb"]()) }}', [{ cb: mockCallback }]);
			expect(mockCallback.mock.calls.length).toEqual(0);
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
	});
});
