// @vitest-environment jsdom

/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */

import { evaluate } from './helpers';
import { ExpressionExtensionError } from '../../src/errors/expression-extension.error';
import { extendTransform, extend } from '../../src/extensions';
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

	describe('extendSyntax()', () => {
		test('does not rewrite concise methods to function expressions', () => {
			const extended = extendSyntax(
				'={{ { __proto__: base, foo(){ return super.x } }.toJsonString() }}',
			);

			expect(extended).not.toMatch(/foo:\s*function/);
			expect(extended).toMatch(/foo\(\)\s*\{\s*return super\.x\s*\}/);
		});

		test('keeps forceExtend=false and forceExtend=true cache entries separate after a no-op result', () => {
			const expression = '={{ { "data": $json.body.choices } }}';

			expect(extendSyntax(expression, false)).toBe(expression);
			expect(extendSyntax(expression, true)).toBe('={{( { "data": $json.body.choices } )}}');
		});

		test('keeps forceExtend=true and forceExtend=false cache entries separate after a transform result', () => {
			const expression = '={{ { "items": $json.body.choices } }}';

			expect(extendSyntax(expression, true)).toBe('={{( { "items": $json.body.choices } )}}');
			expect(extendSyntax(expression, false)).toBe(expression);
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

		test('Expression containing object literals', () => {
			expect(splitExpression('{{ {values:{}} }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {values:{}} ', hasClosingBrackets: true },
			]);
		});

		test('Expression containing nested object literals', () => {
			expect(splitExpression('{{ {values:{ nested: {} }} }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {values:{ nested: {} }} ', hasClosingBrackets: true },
			]);
		});

		test('Expression containing nested object literals with multiple internal closing pairs', () => {
			expect(splitExpression('{{ {a:{c:{}}, b:{}} }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {a:{c:{}}, b:{}} ', hasClosingBrackets: true },
			]);
		});

		test('Expression containing bare object literals that end at the closing marker', () => {
			expect(splitExpression('{{ {a:1}}}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {a:1}', hasClosingBrackets: true },
			]);
		});

		test('Expression containing bare object literals with classic function bodies', () => {
			expect(splitExpression('{{ {foo:function(){return 1}}}}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {foo:function(){return 1}}', hasClosingBrackets: true },
			]);
		});

		test('Expression containing bare object literals with method bodies', () => {
			expect(splitExpression('{{ {foo(){return 1}}}}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {foo(){return 1}}', hasClosingBrackets: true },
			]);
		});

		test('Multiple expression regression', () => {
			expect(splitExpression('{{ 1 }} text {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' 1 ', hasClosingBrackets: true },
				{ type: 'text', text: ' text ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
		});

		test('Regex literals do not swallow following expressions', () => {
			expect(splitExpression('{{ /[/*]/.test($json.s) }} and {{ $json.n }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' /[/*]/.test($json.s) ', hasClosingBrackets: true },
				{ type: 'text', text: ' and ' },
				{ type: 'code', text: ' $json.n ', hasClosingBrackets: true },
			]);
		});

		test('String literals containing left braces do not swallow following expressions', () => {
			expect(splitExpression('{{ "{foo" }} and {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "{foo" ', hasClosingBrackets: true },
				{ type: 'text', text: ' and ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
		});

		test('Regex literals containing left braces do not swallow following expressions', () => {
			expect(splitExpression('{{ /{/.test(x) }} and {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' /{/.test(x) ', hasClosingBrackets: true },
				{ type: 'text', text: ' and ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
		});

		test('Comments containing left braces do not swallow following expressions', () => {
			expect(splitExpression('{{ /* { */ 1 }} and {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' /* { */ 1 ', hasClosingBrackets: true },
				{ type: 'text', text: ' and ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
		});

		test('Line comments containing closing braces do not swallow following expressions', () => {
			expect(splitExpression('{{ // }}\n1 }} and {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' // }}\n1 ', hasClosingBrackets: true },
				{ type: 'text', text: ' and ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
		});

		test('String literals containing closing braces do not swallow following expressions', () => {
			expect(splitExpression('{{ "{{foo}}" }} and {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "{{foo}}" ', hasClosingBrackets: true },
				{ type: 'text', text: ' and ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
		});

		test('Bare object literals do not swallow following expressions', () => {
			expect(splitExpression('{{ {a:1}}} tail {{ 2 }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' {a:1}', hasClosingBrackets: true },
				{ type: 'text', text: ' tail ' },
				{ type: 'code', text: ' 2 ', hasClosingBrackets: true },
			]);
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
		test('Regex literals in mixed templates still evaluate', () => {
			expect(
				evaluate('={{ /[/*]/.test($json.s) }} and {{ $json.n }}', [{ s: '/*', n: 2 }]),
			).toEqual('true and 2');
		});

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

		test('Optional chaining with undefined argument', () => {
			expect(evaluate('={{ [1, 2, 3, 4]?.sum((undefined)?.test) }}')).toBe(10);
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
