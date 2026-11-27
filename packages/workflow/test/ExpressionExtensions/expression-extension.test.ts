// @vitest-environment jsdom

/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */

import { evaluate, evaluateParam } from './helpers';
import { ExpressionExtensionError } from '../../src/errors/expression-extension.error';
import { extendTransform, extend, hasArrayWildcardSyntax } from '../../src/extensions';
import { extendedFunctions } from '../../src/extensions/extended-functions';
import { extendSyntax } from '../../src/extensions/expression-extension';
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

		test('Multiple escaped closing brackets', () => {
			expect(splitExpression('{{ [{ a: { b: 1 \\}}, { a: { b: 2 \\}}] }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' [{ a: { b: 1 }}, { a: { b: 2 }}] ', hasClosingBrackets: true },
			]);
		});

		test('Empty input (CAT-3075)', () => {
			expect(splitExpression('')).toEqual([{ type: 'text', text: '' }]);
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

		test('Multiple escaped closing brackets', () => {
			expect(
				joinExpression([
					{ type: 'text', text: '' },
					{ type: 'code', text: ' [{ a: { b: 1 }}, { a: { b: 2 }}] ', hasClosingBrackets: true },
				]),
			).toEqual('{{ [{ a: { b: 1 \\}}, { a: { b: 2 \\}}] }}');
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
			expect(extendTransform('$json.test?.test2($json.test?.test2)')?.code)
				.toBe(`window.chainCancelToken2 = ((window.chainValue2 = $json.test) ?? undefined) === undefined, window.chainCancelToken2 === true ? undefined : window.chainValue2.test2(
  (window.chainCancelToken1 = ((window.chainValue1 = $json.test) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1.test2)
);`);

			expect(extendTransform('$json.test?.test2($json.test.sum?.())')?.code)
				.toBe(`window.chainCancelToken2 = ((window.chainValue2 = $json.test) ?? undefined) === undefined, window.chainCancelToken2 === true ? undefined : window.chainValue2.test2(
  (window.chainCancelToken1 = ((window.chainValue1 = extendOptional($json.test, "sum")) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1())
);`);
		});

		test('Optional chaining with undefined argument', () => {
			expect(evaluate('={{ [1, 2, 3, 4]?.sum((undefined)?.test) }}')).toBe(10);
		});

		describe('Nullish coalescing with an && or || operand next to an optional chain', () => {
			test.each([
				['$json.a?.[0] ?? ($json.a.last() && 1)', { a: [5, 6] }, 5],
				['$json.a?.[0] ?? ($json.a.last() && 1)', { a: [null, 6] }, 1],
				['$json.a?.[0] ?? ($json.a.last() || 1)', { a: [null, 0] }, 1],
				['($json.a.last() && 1) ?? $json.a?.[0]', { a: [5, 6] }, 1],
				['($json.a?.[0] || $json.b) ?? $json.a.last()', { a: [0, 6], b: null }, 6],
				['$json.a?.[0] ?? ($json.b && ($json.c || $json.a.last()))', { a: [null, 6], b: 1 }, 6],
			])('should keep the parentheses around the operand of "??" in %s', (code, data, result) => {
				expect(extendTransform(code)?.code).toBeDefined();
				expect(evaluate(`={{ ${code} }}`, [data])).toBe(result);
			});

			test('should print the parentheses once', () => {
				expect(extendTransform('$json.a?.[0] ?? ($json.a.last() && 1)')?.code).toBe(
					'(window.chainCancelToken1 = ((window.chainValue1 = $json.a) ?? undefined) === undefined, window.chainCancelToken1 === true ? undefined : window.chainValue1[0]) ?? (extend($json.a, "last", []) && 1)',
				);
				expect(extendTransform('1 ?? ($json.a.last() && 2)')?.code).toBe(
					'1 ?? (extend($json.a, "last", []) && 2)',
				);
			});
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

		test('zip should reject non-array keys', () => {
			expect(() =>
				evaluate(
					'={{ (function(){ obj = { length: 1, reduce: (fn) => fn({}, "a", "constructor") }; return zip(obj, Object); })() }}',
				),
			).toThrow('keys and values must be arrays');
		});

		test('zip should reject non-array values', () => {
			expect(() =>
				evaluate(
					'={{ (function(){ arr = ["a"]; arr.reduce = (fn) => fn({}, "a", "constructor"); return zip(arr, Object); })() }}',
				),
			).toThrow('keys and values must be arrays');
		});

		test('zip should ignore overridden reduce on array instances', () => {
			// Even if an attacker overrides .reduce on an array, we use Array.prototype.reduce
			expect(
				evaluate(
					'={{ (function(){ keys = ["a"]; keys.reduce = () => "not a"; return zip(keys, [1]); })() }}',
				),
			).toEqual({ a: 1 });
		});

		test('zip should treat a key named __proto__ as an ordinary field', () => {
			const result = extendedFunctions.zip(['__proto__'], [{ marker: 'set' }]) as Record<
				string,
				unknown
			>;

			expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
			expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
			expect(({} as Record<string, unknown>).marker).toBeUndefined();
		});

		test('$if', () => {
			expect(evaluate('={{ $if("a"==="a", 1, 2) }}')).toEqual(1);
			expect(evaluate('={{ $if("a"==="b", 1, 2) }}')).toEqual(2);
			expect(evaluate('={{ $if("a"==="a", 1) }}')).toEqual(1);
			expect(evaluate('={{ $if("a"==="b", 1) }}')).toEqual(false);
			expect(evaluate('={{ $if("a"==="a", 1, 2) }}')).toEqual(1);
			expect(evaluate('={{ $if("a"==="b", 1, 2) }}')).toEqual(2);

			// Short-circuit: $if is AST-rewritten to a JS ternary, so the
			// unselected branch is not evaluated. Probe with a throwing IIFE
			// in the else position — the throw is swallowed by the
			// evaluator's E() handler, but a non-undefined result for the
			// true case proves the IIFE didn't run, and the undefined
			// result for the false case proves it did.
			const throwingExpr = "(function(){ throw new Error('side effect'); })()";
			expect(evaluate(`={{ $if(true, 1, ${throwingExpr}) }}`)).toEqual(1);
			expect(evaluate(`={{ $if(false, 1, ${throwingExpr}) }}`)).toBeUndefined();
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
				expect(extendTransform('items[*].name')?.code).toBe(
					'$jmesPath(items, "map(&\\"name\\", [*] || `[]`)")',
				);
			});

			test('transforms $json prefixed [*] access', () => {
				expect(extendTransform('$json.items[*].title')?.code).toBe(
					'$jmesPath($json.items, "map(&\\"title\\", [*] || `[]`)")',
				);
			});

			test('transforms nested path after [*]', () => {
				expect(extendTransform('$json.orders[*].customer.name')?.code).toBe(
					'$jmesPath($json.orders, "map(&\\"customer\\".\\"name\\", [*] || `[]`)")',
				);
			});

			test('transforms deeply nested path after [*]', () => {
				expect(extendTransform('data[*].address.city.zipCode')?.code).toBe(
					'$jmesPath(data, "map(&\\"address\\".\\"city\\".\\"zipCode\\", [*] || `[]`)")',
				);
			});

			test('quotes computed property names after [*]', () => {
				expect(extendTransform('items[*]["field-name"]')?.code).toBe(
					'$jmesPath(items, "map(&\\"field-name\\", [*] || `[]`)")',
				);
			});

			test('transforms a trailing [*] with no path after it', () => {
				expect(extendTransform('$json.orders[*]')?.code).toBe('$jmesPath($json.orders, "[*]")');
			});

			test('leaves [*] inside string literals unchanged', () => {
				expect(hasArrayWildcardSyntax('"prefix" + "[*]"')).toBe(false);
				expect(hasArrayWildcardSyntax("$json['[*]']")).toBe(false);
				expect(hasArrayWildcardSyntax('$json.items[*].name + "[*]"')).toBe(true);
			});

			test('runs a method called after the path on the resulting array', () => {
				expect(extendTransform("items[*].name.join(', ')")?.code).toBe(
					'$jmesPath(items, "map(&\\"name\\", [*] || `[]`)").join(\', \')',
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

			test('keeps null for items without the field', () => {
				// JMESPath filters out items that don't have the requested field
				const data = [{ items: [{ name: 'Alice' }, { other: 'value' }, { name: 'Charlie' }] }];
				expect(evaluate('={{ $json.items[*].name }}', data)).toEqual(['Alice', null, 'Charlie']);
			});

			test('returns the array itself for a trailing [*]', () => {
				const data = [{ items: [{ name: 'Alice' }, { name: 'Bob' }] }];
				expect(evaluate('={{ $json.items[*] }}', data)).toEqual([
					{ name: 'Alice' },
					{ name: 'Bob' },
				]);
			});

			test('runs array methods on the result', () => {
				const data = [{ items: [{ name: 'Alice' }, { name: 'Bob' }] }];
				expect(evaluate("={{ $json.items[*].name.join(', ') }}", data)).toBe('Alice, Bob');
			});

			test('selects quoted field names', () => {
				const data = [{ items: [{ 'field-name': 'a' }, { 'field-name': 'b' }] }];
				expect(evaluate('={{ $json.items[*]["field-name"] }}', data)).toEqual(['a', 'b']);
			});

			test('keeps [*] inside a string literal as text', () => {
				expect(evaluate('={{ "prefix" + "[*]" }}', [{}])).toBe('prefix[*]');
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

				// An item without the field gets null, so values stay on their own row
				expect(result).toEqual({
					lineItemValues: [
						{ productName: 'A', amount: 10 },
						{ productName: 'B', amount: 20 },
						{ productName: 'C', amount: null },
					],
				});
			});

			test('keeps sibling arrays that do not use [*] unchanged', () => {
				const data = [{ items: [{ name: 'A' }, { name: 'B' }], tags: ['x', 'y', 'z'] }];

				const result = evaluateParam(
					{
						lineItemValues: [
							{ productName: '={{ $json.items[*].name }}', tags: '={{ $json.tags }}' },
						],
					},
					data,
				);

				expect(result).toEqual({
					lineItemValues: [
						{ productName: 'A', tags: ['x', 'y', 'z'] },
						{ productName: 'B', tags: ['x', 'y', 'z'] },
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

describe('extendSyntax', () => {
	test.each(['toString', 'constructor'])(
		'should return the bracketed text %s unchanged, both uncached and cached',
		(bracketedExpression) => {
			expect(extendSyntax(bracketedExpression, true)).toBe(bracketedExpression);
			expect(extendSyntax(bracketedExpression, true)).toBe(bracketedExpression);
		},
	);
});
