// @vitest-environment jsdom

/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */

import { evaluate, evaluateParam } from './helpers';
import { ExpressionExtensionError } from '../../src/errors/expression-extension.error';
import { extendTransform, extend, hasArrayWildcardSyntax } from '../../src/extensions';
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

	describe('Array wildcard [*] syntax', () => {
		describe('hasArrayWildcardSyntax detection', () => {
			test('detects [*] in expression', () => {
				expect(hasArrayWildcardSyntax('items[*].name')).toBe(true);
				expect(hasArrayWildcardSyntax('$json.items[*].title')).toBe(true);
				expect(hasArrayWildcardSyntax('data[ * ].field')).toBe(true);
			});

			test('does not detect false positives', () => {
				expect(hasArrayWildcardSyntax('items[0].name')).toBe(false);
				expect(hasArrayWildcardSyntax('items.name')).toBe(false);
				expect(hasArrayWildcardSyntax('items["*"].name')).toBe(false);
			});
		});

		describe('extendTransform for [*] syntax', () => {
			test('transforms simple [*] access to $jmesPath', () => {
				expect(extendTransform('items[*].name')?.code).toBe('$jmesPath(items, "[*].name")');
			});

			test('transforms $json prefixed [*] access', () => {
				expect(extendTransform('$json.items[*].title')?.code).toBe(
					'$jmesPath($json.items, "[*].title")',
				);
			});

			test('transforms nested path after [*]', () => {
				expect(extendTransform('$json.orders[*].customer.name')?.code).toBe(
					'$jmesPath($json.orders, "[*].customer.name")',
				);
			});

			test('transforms deeply nested path after [*]', () => {
				expect(extendTransform('data[*].address.city.zipCode')?.code).toBe(
					'$jmesPath(data, "[*].address.city.zipCode")',
				);
			});

			test('transforms with computed property access after [*]', () => {
				expect(extendTransform('items[*]["field-name"]')?.code).toBe(
					'$jmesPath(items, "[*].field-name")',
				);
			});
		});

		describe('evaluate [*] syntax end-to-end', () => {
			test('extracts single field from array of objects', () => {
				const data = [{ items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }] }];
				expect(evaluate('={{ $json.items[*].name }}', data)).toEqual(['Alice', 'Bob', 'Charlie']);
			});

			test('extracts nested field from array of objects', () => {
				const data = [
					{
						orders: [
							{ customer: { name: 'Alice', city: 'NYC' } },
							{ customer: { name: 'Bob', city: 'LA' } },
						],
					},
				];
				expect(evaluate('={{ $json.orders[*].customer.name }}', data)).toEqual(['Alice', 'Bob']);
			});

			test('works with empty array', () => {
				const data = [{ items: [] }];
				expect(evaluate('={{ $json.items[*].name }}', data)).toEqual([]);
			});

			test('filters out items with missing fields (JMESPath behavior)', () => {
				// JMESPath filters out items that don't have the requested field
				const data = [{ items: [{ name: 'Alice' }, { other: 'value' }, { name: 'Charlie' }] }];
				expect(evaluate('={{ $json.items[*].name }}', data)).toEqual(['Alice', 'Charlie']);
			});
		});

		describe('fixedCollection array expansion with [*] syntax', () => {
			test('expands single template with multiple [*] expressions into multiple objects', () => {
				const data = [
					{
						items: [
							{ name: 'Product A', price: 10 },
							{ name: 'Product B', price: 20 },
							{ name: 'Product C', price: 30 },
						],
					},
				];

				// Simulating a fixedCollection with lineItemValues array containing one template
				const paramValue = {
					lineItemValues: [
						{
							productName: '={{ $json.items[*].name }}',
							amount: '={{ $json.items[*].price }}',
						},
					],
				};

				const result = evaluateParam(paramValue, data);

				expect(result).toEqual({
					lineItemValues: [
						{ productName: 'Product A', amount: 10 },
						{ productName: 'Product B', amount: 20 },
						{ productName: 'Product C', amount: 30 },
					],
				});
			});

			test('preserves scalar values across expanded objects', () => {
				const data = [
					{
						items: [{ name: 'A' }, { name: 'B' }],
					},
				];

				const paramValue = {
					lineItemValues: [
						{
							productName: '={{ $json.items[*].name }}',
							currency: 'USD',
						},
					],
				};

				const result = evaluateParam(paramValue, data);

				expect(result).toEqual({
					lineItemValues: [
						{ productName: 'A', currency: 'USD' },
						{ productName: 'B', currency: 'USD' },
					],
				});
			});

			test('handles mismatched array lengths with undefined fill', () => {
				const data = [
					{
						items: [
							{ name: 'A', price: 10 },
							{ name: 'B', price: 20 },
							{ name: 'C' }, // No price
						],
					},
				];

				const paramValue = {
					lineItemValues: [
						{
							productName: '={{ $json.items[*].name }}',
							amount: '={{ $json.items[*].price }}',
						},
					],
				};

				const result = evaluateParam(paramValue, data);

				// JMESPath filters out items without the requested field,
				// so we get 3 names but only 2 prices
				expect(result).toEqual({
					lineItemValues: [
						{ productName: 'A', amount: 10 },
						{ productName: 'B', amount: 20 },
						{ productName: 'C', amount: undefined },
					],
				});
			});

			test('works with nested property extraction', () => {
				const data = [
					{
						orders: [
							{ customer: { name: 'Alice' }, total: 100 },
							{ customer: { name: 'Bob' }, total: 200 },
						],
					},
				];

				const paramValue = {
					lineItemValues: [
						{
							customerName: '={{ $json.orders[*].customer.name }}',
							orderTotal: '={{ $json.orders[*].total }}',
						},
					],
				};

				const result = evaluateParam(paramValue, data);

				expect(result).toEqual({
					lineItemValues: [
						{ customerName: 'Alice', orderTotal: 100 },
						{ customerName: 'Bob', orderTotal: 200 },
					],
				});
			});

			test('handles empty array input', () => {
				const data = [{ items: [] }];

				const paramValue = {
					lineItemValues: [
						{
							name: '={{ $json.items[*].name }}',
							price: '={{ $json.items[*].price }}',
						},
					],
				};

				const result = evaluateParam(paramValue, data);

				expect(result).toEqual({
					lineItemValues: [],
				});
			});

			test('works with multiple templates - expands each independently', () => {
				const data = [
					{
						products: [{ name: 'P1' }, { name: 'P2' }],
						services: [{ name: 'S1' }],
					},
				];

				const paramValue = {
					lineItemValues: [
						{
							itemName: '={{ $json.products[*].name }}',
							type: 'product',
						},
						{
							itemName: '={{ $json.services[*].name }}',
							type: 'service',
						},
					],
				};

				const result = evaluateParam(paramValue, data);

				expect(result).toEqual({
					lineItemValues: [
						{ itemName: 'P1', type: 'product' },
						{ itemName: 'P2', type: 'product' },
						{ itemName: 'S1', type: 'service' },
					],
				});
			});
		});
	});
});
