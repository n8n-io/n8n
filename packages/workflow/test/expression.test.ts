// @vitest-environment jsdom

import { DateTime, Duration, Interval } from 'luxon';

import { workflow } from './ExpressionExtensions/helpers';
import { baseFixtures } from './ExpressionFixtures/base';
import type { ExpressionTestEvaluation, ExpressionTestTransform } from './ExpressionFixtures/base';
import * as Helpers from './helpers';
import { ExpressionError } from '../src/errors/expression.error';
import { extendSyntax } from '../src/extensions/expression-extension';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

describe('Expression', () => {
	describe('getParameterValue()', () => {
		const nodeTypes = Helpers.NodeTypes();
		const workflow = new Workflow({
			id: '1',
			nodes: [
				{
					name: 'node',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-1234',
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			active: false,
			nodeTypes,
		});
		const expression = workflow.expression;

		const evaluate = (value: string) =>
			expression.getParameterValue(value, null, 0, 0, 'node', [], 'manual', {});

		it('should not be able to use global built-ins from denylist', () => {
			expect(evaluate('={{document}}')).toEqual({});
			expect(evaluate('={{window}}')).toEqual({});

			expect(evaluate('={{Window}}')).toEqual({});
			expect(evaluate('={{globalThis}}')).toEqual({});
			expect(evaluate('={{self}}')).toEqual({});

			expect(evaluate('={{alert}}')).toEqual({});
			expect(evaluate('={{prompt}}')).toEqual({});
			expect(evaluate('={{confirm}}')).toEqual({});

			expect(evaluate('={{eval}}')).toEqual({});
			expect(evaluate('={{uneval}}')).toEqual({});
			expect(evaluate('={{setTimeout}}')).toEqual({});
			expect(evaluate('={{setInterval}}')).toEqual({});
			expect(evaluate('={{Function}}')).toEqual({});

			expect(evaluate('={{fetch}}')).toEqual({});
			expect(evaluate('={{XMLHttpRequest}}')).toEqual({});

			expect(evaluate('={{Promise}}')).toEqual({});
			expect(evaluate('={{Generator}}')).toEqual({});
			expect(evaluate('={{GeneratorFunction}}')).toEqual({});
			expect(evaluate('={{AsyncFunction}}')).toEqual({});
			expect(evaluate('={{AsyncGenerator}}')).toEqual({});
			expect(evaluate('={{AsyncGeneratorFunction}}')).toEqual({});

			expect(evaluate('={{WebAssembly}}')).toEqual({});

			expect(evaluate('={{Reflect}}')).toEqual({});
			expect(evaluate('={{Proxy}}')).toEqual({});

			vi.useFakeTimers({ now: new Date() });
			expect(() => evaluate('={{constructor}}')).toThrowError(
				new ExpressionError('Cannot access "constructor" due to security concerns'),
			);
			vi.useRealTimers();

			expect(evaluate('={{escape}}')).toEqual({});
			expect(evaluate('={{unescape}}')).toEqual({});
		});

		it('should be able to use global built-ins from allowlist', () => {
			expect(evaluate('={{new Date()}}')).toBeInstanceOf(Date);
			expect(evaluate('={{DateTime.now().toLocaleString()}}')).toEqual(
				DateTime.now().toLocaleString(),
			);

			vi.useFakeTimers({ now: new Date() });
			expect(evaluate('={{Interval.after(new Date(), 100)}}')).toEqual(
				Interval.after(new Date(), 100),
			);
			vi.useRealTimers();

			expect(evaluate('={{Duration.fromMillis(100)}}')).toEqual(Duration.fromMillis(100));

			expect(evaluate('={{new Object()}}')).toEqual(new Object());

			expect(evaluate('={{new Array()}}')).toEqual([]);
			expect(evaluate('={{new Int8Array()}}')).toEqual(new Int8Array());
			expect(evaluate('={{new Uint8Array()}}')).toEqual(new Uint8Array());
			expect(evaluate('={{new Uint8ClampedArray()}}')).toEqual(new Uint8ClampedArray());
			expect(evaluate('={{new Int16Array()}}')).toEqual(new Int16Array());
			expect(evaluate('={{new Uint16Array()}}')).toEqual(new Uint16Array());
			expect(evaluate('={{new Int32Array()}}')).toEqual(new Int32Array());
			expect(evaluate('={{new Uint32Array()}}')).toEqual(new Uint32Array());
			expect(evaluate('={{new Float32Array()}}')).toEqual(new Float32Array());
			expect(evaluate('={{new Float64Array()}}')).toEqual(new Float64Array());
			expect(evaluate('={{new BigInt64Array()}}')).toEqual(new BigInt64Array());
			expect(evaluate('={{new BigUint64Array()}}')).toEqual(new BigUint64Array());

			expect(evaluate('={{new Map()}}')).toEqual(new Map());
			expect(evaluate('={{new WeakMap()}}')).toEqual(new WeakMap());
			expect(evaluate('={{new Set()}}')).toEqual(new Set());
			expect(evaluate('={{new WeakSet()}}')).toEqual(new WeakSet());

			expect(evaluate('={{new Error()}}')).toEqual(new Error());
			expect(evaluate('={{new TypeError()}}')).toEqual(new TypeError());
			expect(evaluate('={{new SyntaxError()}}')).toEqual(new SyntaxError());
			expect(evaluate('={{new EvalError()}}')).toEqual(new EvalError());
			expect(evaluate('={{new RangeError()}}')).toEqual(new RangeError());
			expect(evaluate('={{new ReferenceError()}}')).toEqual(new ReferenceError());
			expect(evaluate('={{new URIError()}}')).toEqual(new URIError());

			expect(evaluate('={{Intl}}')).toEqual(Intl);

			expect(evaluate('={{new String()}}')).toEqual(new String());
			expect(evaluate("={{new RegExp('')}}")).toEqual(new RegExp(''));

			expect(evaluate('={{Math}}')).toEqual(Math);
			expect(evaluate('={{new Number()}}')).toEqual(new Number());
			expect(evaluate("={{BigInt('1')}}")).toEqual(BigInt('1'));
			expect(evaluate('={{Infinity}}')).toEqual(Infinity);
			expect(evaluate('={{NaN}}')).toEqual(NaN);
			expect(evaluate('={{isFinite(1)}}')).toEqual(isFinite(1));
			expect(evaluate('={{isNaN(1)}}')).toEqual(isNaN(1));
			expect(evaluate("={{parseFloat('1')}}")).toEqual(parseFloat('1'));
			expect(evaluate("={{parseInt('1', 10)}}")).toEqual(parseInt('1', 10));

			expect(evaluate('={{JSON.stringify({})}}')).toEqual(JSON.stringify({}));
			expect(evaluate('={{new ArrayBuffer(10)}}')).toEqual(new ArrayBuffer(10));
			expect(evaluate('={{new SharedArrayBuffer(10)}}')).toEqual(new SharedArrayBuffer(10));
			expect(evaluate('={{Atomics}}')).toEqual(Atomics);
			expect(evaluate('={{new DataView(new ArrayBuffer(1))}}')).toEqual(
				new DataView(new ArrayBuffer(1)),
			);

			expect(evaluate("={{encodeURI('https://google.com')}}")).toEqual(
				encodeURI('https://google.com'),
			);
			expect(evaluate("={{encodeURIComponent('https://google.com')}}")).toEqual(
				encodeURIComponent('https://google.com'),
			);
			expect(evaluate("={{decodeURI('https://google.com')}}")).toEqual(
				decodeURI('https://google.com'),
			);
			expect(evaluate("={{decodeURIComponent('https://google.com')}}")).toEqual(
				decodeURIComponent('https://google.com'),
			);

			expect(evaluate('={{Boolean(1)}}')).toEqual(Boolean(1));
			expect(evaluate('={{Symbol(1).toString()}}')).toEqual(Symbol(1).toString());
		});

		it('should not able to do arbitrary code execution', () => {
			const testFn = vi.fn();
			Object.assign(global, { testFn });

			vi.useFakeTimers({ now: new Date() });
			expect(() => evaluate("={{ Date['constructor']('testFn()')()}}")).toThrowError(
				new ExpressionError('Cannot access "constructor" due to security concerns'),
			);
			vi.useRealTimers();

			expect(testFn).not.toHaveBeenCalled();
		});

		describe('SafeObject security wrapper', () => {
			it('should block Object.defineProperty', () => {
				expect(evaluate('={{Object.defineProperty}}')).toBeUndefined();
			});

			it('should block Object.defineProperties', () => {
				expect(evaluate('={{Object.defineProperties}}')).toBeUndefined();
			});

			it('should block Object.setPrototypeOf', () => {
				expect(evaluate('={{Object.setPrototypeOf}}')).toBeUndefined();
			});

			it('should block Object.getPrototypeOf', () => {
				expect(() => evaluate('={{Object.getPrototypeOf}}')).toThrow();
			});

			it('should block Object.getOwnPropertyDescriptor', () => {
				expect(evaluate('={{Object.getOwnPropertyDescriptor}}')).toBeUndefined();
			});

			it('should block Object.getOwnPropertyDescriptors', () => {
				expect(evaluate('={{Object.getOwnPropertyDescriptors}}')).toBeUndefined();
			});

			it('should block __defineGetter__ on Object', () => {
				expect(evaluate('={{Object.__defineGetter__}}')).toBeUndefined();
			});

			it('should block __defineSetter__ on Object', () => {
				expect(evaluate('={{Object.__defineSetter__}}')).toBeUndefined();
			});

			it('should block __lookupGetter__ on Object', () => {
				expect(evaluate('={{Object.__lookupGetter__}}')).toBeUndefined();
			});

			it('should block __lookupSetter__ on Object', () => {
				expect(evaluate('={{Object.__lookupSetter__}}')).toBeUndefined();
			});

			it('should allow safe Object methods', () => {
				expect(evaluate('={{Object.keys({a: 1})}}')).toEqual(['a']);
				expect(evaluate('={{Object.values({a: 1})}}')).toEqual([1]);
				expect(evaluate('={{Object.entries({a: 1})}}')).toEqual([['a', 1]]);
				expect(evaluate('={{Object.assign({}, {a: 1})}}')).toEqual({ a: 1 });
				expect(evaluate('={{Object.fromEntries([["a", 1]])}}')).toEqual({ a: 1 });
				expect(evaluate('={{Object.is(1, 1)}}')).toEqual(true);
				expect(evaluate('={{Object.hasOwn({a: 1}, "a")}}')).toEqual(true);
			});

			it('should allow Object.create with single argument', () => {
				// Object.create with null prototype
				expect(evaluate('={{Object.create(null) !== null}}')).toEqual(true);
			});

			it('should prevent Object.defineProperty attack on Error.prepareStackTrace', () => {
				// Object.defineProperty is undefined, so calling it returns undefined (no-op)
				// The attack fails silently - prepareStackTrace is never set
				const result = evaluate(
					"={{Object.defineProperty(Error, 'prepareStackTrace', { value: (e, s) => s })}}",
				);
				expect(result).toBeUndefined();
			});
		});

		describe('SafeError security wrapper', () => {
			it('should block Error.prepareStackTrace access', () => {
				expect(() => evaluate('={{Error.prepareStackTrace}}')).toThrow();
			});

			it('should block Error.captureStackTrace access', () => {
				// captureStackTrace is blocked by the SafeError proxy, returns undefined
				expect(evaluate('={{Error.captureStackTrace}}')).toBeUndefined();
			});

			it('should block Error.stackTraceLimit access', () => {
				// stackTraceLimit is blocked by the SafeError proxy, returns undefined
				expect(evaluate('={{Error.stackTraceLimit}}')).toBeUndefined();
			});

			it('should block __defineGetter__ on Error', () => {
				expect(evaluate('={{Error.__defineGetter__}}')).toBeUndefined();
			});

			it('should block __defineSetter__ on Error', () => {
				expect(evaluate('={{Error.__defineSetter__}}')).toBeUndefined();
			});

			it('should prevent setting Error.prepareStackTrace via assignment', () => {
				// Assignment fails because the sanitizer blocks access to prepareStackTrace
				expect(() =>
					evaluate('={{Error.prepareStackTrace = (e, s) => s, Error.prepareStackTrace}}'),
				).toThrow();
			});

			it('should allow normal Error functionality', () => {
				expect(evaluate('={{new Error("test").message}}')).toEqual('test');
				expect(evaluate('={{new Error("test") instanceof Error}}')).toEqual(true);
			});
		});

		describe('Error subclass security wrappers', () => {
			it('should block __defineGetter__ on TypeError', () => {
				expect(evaluate('={{TypeError.__defineGetter__}}')).toBeUndefined();
			});

			it('should block __defineGetter__ on SyntaxError', () => {
				expect(evaluate('={{SyntaxError.__defineGetter__}}')).toBeUndefined();
			});

			it('should block prepareStackTrace on all error types', () => {
				expect(() => evaluate('={{TypeError.prepareStackTrace}}')).toThrow();
				expect(() => evaluate('={{SyntaxError.prepareStackTrace}}')).toThrow();
				expect(() => evaluate('={{RangeError.prepareStackTrace}}')).toThrow();
				expect(() => evaluate('={{ReferenceError.prepareStackTrace}}')).toThrow();
				expect(() => evaluate('={{EvalError.prepareStackTrace}}')).toThrow();
				expect(() => evaluate('={{URIError.prepareStackTrace}}')).toThrow();
			});

			it('should allow normal Error subclass functionality', () => {
				expect(evaluate('={{new TypeError("test").message}}')).toEqual('test');
				expect(evaluate('={{new TypeError("test").name}}')).toEqual('TypeError');
				expect(evaluate('={{new SyntaxError("test") instanceof Error}}')).toEqual(true);
			});
		});

		describe('RCE prevention', () => {
			it('should block the Object.defineProperty + prepareStackTrace RCE attack', () => {
				// This is the actual attack payload that was used
				// Attack fails because Object.defineProperty is undefined,
				// calling undefined(...) throws TypeError, and the expression returns undefined
				const payload = `={{(() => {
					Object.defineProperty(Error, 'prepareStackTrace', {
						value: (e, stack) => {
							try {
								const g = stack[0].getThis();
								if (!g || !g.global || !g.global.process) return "no_global";
								const p = g.global.process;
								const gbm = p.getBuiltinModule;
								if (!gbm) return "no_gbm";
								const cp = gbm('child_process');
								return cp.execSync('echo pwned').toString();
							} catch (x) {
								return "err:" + x.message;
							}
						},
						configurable: true
					});
					return new Error().stack;
				})()}}`;

				// Attack is blocked - calling undefined() throws, result is undefined
				const result = evaluate(payload);
				expect(result).toBeUndefined();
			});

			it('should block __defineGetter__ bypass attack', () => {
				// Alternative attack using __defineGetter__ to set prepareStackTrace
				// Attack fails because __defineGetter__ is undefined,
				// calling undefined(...) throws TypeError
				const payload = `={{(() => {
					Error.__defineGetter__('prepareStackTrace', function() {
						return (e, stack) => 'ATTACK_WORKED';
					});
					return new Error().stack;
				})()}}`;

				// Attack is blocked - calling undefined() throws, result is undefined
				const result = evaluate(payload);
				expect(result).toBeUndefined();
			});

			it('should block getOwnPropertyDescriptor bypass attempt', () => {
				// Attempt to read blocked properties via getOwnPropertyDescriptor
				// getOwnPropertyDescriptor is undefined, calling it throws TypeError
				const payload = `={{(() => {
					const desc = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
					return desc ? 'HAS_DESC' : 'NO_DESC';
				})()}}`;

				// getOwnPropertyDescriptor is undefined, calling undefined() throws
				const result = evaluate(payload);
				expect(result).toBeUndefined();
			});

			it('should block indirect access to defineProperty via bracket notation', () => {
				expect(evaluate("={{Object['defineProperty']}}")).toBeUndefined();
			});

			it('should block storing defineProperty in a variable', () => {
				// Even if you try to store it, you get undefined
				const result = evaluate('={{(() => { const dp = Object.defineProperty; return dp; })()}}');
				expect(result).toBeUndefined();
			});
		});
	});

	describe('Test all expression value fixtures', () => {
		const expression = workflow.expression;

		const evaluate = (value: string, data: INodeExecutionData[]) => {
			const itemIndex = data.length === 0 ? -1 : 0;
			return expression.getParameterValue(value, null, 0, itemIndex, 'node', data, 'manual', {});
		};

		for (const t of baseFixtures) {
			if (!t.tests.some((test) => test.type === 'evaluation')) {
				continue;
			}
			test(t.expression, () => {
				vi.spyOn(workflow, 'getParentNodes').mockReturnValue(['Parent']);

				const evaluationTests = t.tests.filter(
					(test): test is ExpressionTestEvaluation => test.type === 'evaluation',
				);

				for (const test of evaluationTests) {
					const input = test.input.map((d) => ({ json: d })) as any;

					if ('error' in test) {
						vi.useFakeTimers({ now: test.error.timestamp });

						expect(() => evaluate(t.expression, input)).toThrowError(test.error);

						vi.useRealTimers();
					} else {
						expect(evaluate(t.expression, input)).toStrictEqual(test.output);
					}
				}
			});
		}
	});

	describe('Test all expression transform fixtures', () => {
		for (const t of baseFixtures) {
			if (!t.tests.some((test) => test.type === 'transform')) {
				continue;
			}
			test(t.expression, () => {
				vi.useFakeTimers({ now: new Date() });

				for (const test of t.tests.filter(
					(test): test is ExpressionTestTransform => test.type === 'transform',
				)) {
					const expr = t.expression;
					expect(extendSyntax(expr, test.forceTransform)).toEqual(test.result ?? expr);
				}

				vi.useRealTimers();
			});
		}
	});
});
