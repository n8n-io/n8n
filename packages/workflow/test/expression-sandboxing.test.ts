import { Tournament } from '@n8n/tournament';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	ExpressionClassExtensionError,
	ExpressionComputedDestructuringError,
	ExpressionDestructuringError,
	ExpressionError,
	ExpressionWithStatementError,
} from '../src/errors';
import { expressionSandboxHooks, sanitizer, DOLLAR_SIGN_ERROR } from '../src/expression-sandboxing';

const tournament = new Tournament(
	(e) => {
		throw e;
	},
	undefined,
	undefined,
	expressionSandboxHooks,
);

const errorRegex = /^Cannot access ".*" due to security concerns$/;

describe('PrototypeSanitizer', () => {
	describe('Static analysis', () => {
		it('should not allow access to __proto__', () => {
			expect(() => {
				tournament.execute('{{ ({}).__proto__.__proto__ }}', {});
			}).toThrowError(errorRegex);

			expect(() => {
				tournament.execute('{{ ({})["__proto__"]["__proto__"] }}', {});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to prototype', () => {
			expect(() => {
				tournament.execute('{{ Number.prototype }}', { Number });
			}).toThrowError(errorRegex);

			expect(() => {
				tournament.execute('{{ Number["prototype"] }}', { Number });
			}).toThrowError(errorRegex);
		});

		it('should not allow access to constructor', () => {
			expect(() => {
				tournament.execute('{{ Number.constructor }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);

			expect(() => {
				tournament.execute('{{ Number["constructor"] }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);
		});

		it.each([
			['dot notation', '{{ Error.prepareStackTrace }}'],
			['bracket notation', '{{ Error["prepareStackTrace"] }}'],
			['assignment', '{{ Error.prepareStackTrace = (e, s) => s }}'],
		])('should not allow access to prepareStackTrace via %s', (_, expression) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer, Error });
			}).toThrowError(errorRegex);
		});

		it.each([
			['constructor', '{{ Number[`constructor`] }}', { Number }],
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			['constructor (Number)', '{{ Number[`constr${`uct`}or`] }}', { Number }],
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			['constructor (Object)', "{{ Object[`constr${'uct'}or`] }}", { Object }],
			['__proto__', '{{ ({})[`__proto__`] }}', {}],
			['mainModule', '{{ process[`mainModule`] }}', { process: {} }],
		])('should not allow access to %s via template literal', (_, expression, context) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer, ...context });
			}).toThrowError(errorRegex);
		});

		it.each([
			['getPrototypeOf', '{{ Object.getPrototypeOf }}'],
			['binding', '{{ process.binding }}'],
			['_load', '{{ module._load }}'],
		])('should not allow access to %s', (_, expression) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer, Object, process: {}, module: {} });
			}).toThrowError(errorRegex);
		});

		it.each([
			['dot notation', '{{ (()=>{}).caller }}'],
			['bracket notation', '{{ (()=>{})["caller"] }}'],
		])('should not allow access to caller via %s', (_, expression) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer });
			}).toThrowError(errorRegex);
		});

		it.each([
			['dot notation', '{{ (()=>{}).arguments }}'],
			['bracket notation', '{{ (()=>{})["arguments"] }}'],
		])('should not allow access to arguments via %s', (_, expression) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer });
			}).toThrowError(errorRegex);
		});

		it.each([
			['getBuiltinModule', '{{ ({}).getBuiltinModule }}'],
			['_linkedBinding', '{{ ({})._linkedBinding }}'],
			['dlopen', '{{ ({}).dlopen }}'],
			['execve', '{{ ({}).execve }}'],
			['loadEnvFile', '{{ ({}).loadEnvFile }}'],
			['getOwnPropertyDescriptor', '{{ ({}).getOwnPropertyDescriptor }}'],
			['getOwnPropertyDescriptors', '{{ ({}).getOwnPropertyDescriptors }}'],
			['defineProperty', '{{ ({}).defineProperty }}'],
			['defineProperties', '{{ ({}).defineProperties }}'],
			['setPrototypeOf', '{{ ({}).setPrototypeOf }}'],
		])('should not allow access to %s', (_, expression) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer });
			}).toThrowError(errorRegex);
		});

		it.each([
			['getOwnPropertyDescriptor', '{{ ({})["getOwnPropertyDescriptor"] }}'],
			['getOwnPropertyDescriptors', '{{ ({})["getOwnPropertyDescriptors"] }}'],
			['defineProperty', '{{ ({})["defineProperty"] }}'],
			['defineProperties', '{{ ({})["defineProperties"] }}'],
			['setPrototypeOf', '{{ ({})["setPrototypeOf"] }}'],
		])('should not allow access to %s via bracket notation', (_, expression) => {
			expect(() => {
				tournament.execute(expression, { __sanitize: sanitizer });
			}).toThrowError(errorRegex);
		});

		describe('Dollar sign identifier handling', () => {
			it('should not allow bare $ identifier', () => {
				expect(() => {
					tournament.execute('{{ $ }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{$}}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);
			});

			it('should not allow $ in expressions', () => {
				expect(() => {
					tournament.execute('{{ "prefix" + $ }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ $ + "suffix" }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ 1 + $ }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ [1, 2, $] }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ {value: $} }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);
			});

			it('should not allow $ with property access', () => {
				expect(() => {
					tournament.execute('{{ $.something }}', { $: { something: 'value' } });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ $["property"] }}', { $: { property: 'value' } });
				}).toThrowError(DOLLAR_SIGN_ERROR);
			});

			it('should allow $ as function call', () => {
				const mockFunction = () => 'result';
				expect(() => {
					tournament.execute('{{ $() }}', { $: mockFunction });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ $("node_name") }}', { $: mockFunction });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ $().someMethod() }}', { $: () => ({ someMethod: () => 'test' }) });
				}).not.toThrow();
			});

			it('should allow $ in strings', () => {
				expect(() => {
					tournament.execute('{{ "test$test" }}', {});
				}).not.toThrow();

				expect(() => {
					tournament.execute("{{ 'price: $100' }}", {});
				}).not.toThrow();

				expect(() => {
					// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
					tournament.execute('{{ `template ${100}$` }}', {});
				}).not.toThrow();
			});

			it('should allow $ as part of variable names', () => {
				expect(() => {
					tournament.execute('{{ $json }}', { $json: { test: 'value' } });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ price$ }}', { price$: 100 });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ my$var }}', { my$var: 'test' });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ _$_ }}', { _$_: 'underscore' });
				}).not.toThrow();
			});

			it('should allow $ as a property name', () => {
				// $ is a valid property name in JavaScript, so obj.$ should be allowed
				expect(() => {
					tournament.execute('{{ obj.$ }}', { obj: { $: 'value' } });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ data["$"] }}', { data: { $: 'value' } });
				}).not.toThrow();

				expect(() => {
					const obj = { nested: { $: 'deep' } };
					tournament.execute('{{ obj.nested.$ }}', { obj });
				}).not.toThrow();
			});

			it('should allow $ in conditional expressions with function calls', () => {
				const mockFunction = () => 'result';

				expect(() => {
					tournament.execute('{{ true ? $() : "fallback" }}', { $: mockFunction });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ $() || "default" }}', { $: mockFunction });
				}).not.toThrow();

				expect(() => {
					tournament.execute('{{ $() && "continue" }}', { $: mockFunction });
				}).not.toThrow();
			});

			it('should not allow $ in conditional expressions without function calls', () => {
				expect(() => {
					tournament.execute('{{ true ? $ : "fallback" }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ $ || "default" }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);

				expect(() => {
					tournament.execute('{{ $ && "continue" }}', { $: () => 'test' });
				}).toThrowError(DOLLAR_SIGN_ERROR);
			});
		});
	});

	describe('Runtime', () => {
		it('should not allow access to __proto__', () => {
			expect(() => {
				tournament.execute('{{ ({})["__" + (() => "proto")() + "__"] }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to prototype', () => {
			expect(() => {
				tournament.execute('{{ Number["pro" + (() => "toty")() + "pe"] }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to constructor', () => {
			expect(() => {
				tournament.execute('{{ Number["cons" + (() => "truc")() + "tor"] }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to caller via concatenation', () => {
			expect(() => {
				tournament.execute('{{ (()=>{})["cal" + "ler"] }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to arguments via concatenation', () => {
			expect(() => {
				tournament.execute('{{ (()=>{})["arg" + "uments"] }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(errorRegex);
		});

		describe('Array-based property access bypass attempts', () => {
			it('should not allow access to __proto__ via array', () => {
				expect(() => {
					tournament.execute('{{ ({})[["__proto__"]] }}', {
						__sanitize: sanitizer,
					});
				}).toThrowError(errorRegex);
			});

			it('should not allow access to constructor via array', () => {
				expect(() => {
					tournament.execute('{{ ({})[["constructor"]] }}', {
						__sanitize: sanitizer,
					});
				}).toThrowError(errorRegex);
			});

			it('should not allow access to prototype via array', () => {
				expect(() => {
					tournament.execute('{{ Number[["prototype"]] }}', {
						__sanitize: sanitizer,
						Number,
					});
				}).toThrowError(errorRegex);
			});

			it('should not allow prototype pollution via array access', () => {
				expect(() => {
					tournament.execute('{{ ({})[["__proto__"]].polluted = 1 }}', {
						__sanitize: sanitizer,
					});
				}).toThrowError(errorRegex);
			});

			it('should not allow RCE via chained array access', () => {
				expect(() => {
					tournament.execute('{{ ({})[["toString"]][["constructor"]]("return 1")() }}', {
						__sanitize: sanitizer,
					});
				}).toThrowError(errorRegex);
			});

			it('should not allow access to prepareStackTrace via array', () => {
				expect(() => {
					tournament.execute('{{ Error[["prepareStackTrace"]] }}', {
						__sanitize: sanitizer,
						Error,
					});
				}).toThrowError(errorRegex);
			});
		});
	});

	describe('callee and caller access', () => {
		const marker = join(tmpdir(), `expr-sandbox-${Date.now()}`);

		afterEach(() => {
			try {
				unlinkSync(marker);
			} catch {
				// nothing written — expected
			}
		});

		it('should reject static access to callee', () => {
			expect(() => tournament.execute('{{ (()=>arguments)().callee }}', {})).toThrowError(
				errorRegex,
			);
		});

		it('should reject static access to caller', () => {
			expect(() => tournament.execute('{{ (()=>arguments)().caller }}', {})).toThrowError(
				errorRegex,
			);
		});

		it('should reject caller access on a named function', () => {
			expect(() =>
				tournament.execute('{{ (function f(){ return f.caller })() }}', {}),
			).toThrowError(errorRegex);
		});

		it('should reject computed access to callee', () => {
			expect(() => tournament.execute('{{ (()=>arguments)()["callee"] }}', {})).toThrowError(
				errorRegex,
			);
			expect(() =>
				tournament.execute('{{ (()=>arguments)()["cal" + "lee"] }}', { __sanitize: sanitizer }),
			).toThrowError(errorRegex);
		});

		it('should not evaluate an expression that rebinds the sanitizer context', () => {
			const payload = `{{ (()=>arguments)().length>1 ? ({})["con"+"structor"]["con"+"structor"]("return require('fs').writeFileSync(${JSON.stringify(marker)}, 'x'), true")() : (()=>arguments)().callee.call({__sanitize:(x)=>x}, (()=>arguments)()[0], 1) }}`;
			expect(() => tournament.execute(payload, { __sanitize: sanitizer })).toThrow();
			expect(existsSync(marker)).toBe(false);
		});
	});

	describe('Class extension bypass attempts', () => {
		it('should not allow class extending Function', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends Function {} return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrowError(ExpressionClassExtensionError);
		});

		it('should not allow class expression extending Function', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { const Z = class extends Function {}; return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrowError(ExpressionClassExtensionError);
		});

		it('should not allow class extending GeneratorFunction', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends GeneratorFunction {} return new Z("yield 1"); })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrowError(ExpressionClassExtensionError);
		});

		it('should not allow class extending AsyncFunction', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends AsyncFunction {} return new Z("return 1"); })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrowError(ExpressionClassExtensionError);
		});

		it('should not allow class extending AsyncGeneratorFunction', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends AsyncGeneratorFunction {} return new Z("yield 1"); })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrowError(ExpressionClassExtensionError);
		});

		it('should not allow class extending Buffer', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends Buffer {} return Z.allocUnsafe(32).length; })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrow(ExpressionClassExtensionError);
		});

		it('should allow class extending safe classes', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Child extends Array {} return new Child(1, 2, 3).length; })() }}',
					{ __sanitize: sanitizer, Array },
				);
			}).not.toThrow();
		});

		it('should allow class without extends', () => {
			expect(() => {
				tournament.execute('{{ (() => { class MyClass {} return new MyClass(); })() }}', {
					__sanitize: sanitizer,
				});
			}).not.toThrow();
		});

		it('should not allow class extending via CallExpression bypass', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends (() => Function)() {} return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer, Function },
				);
			}).toThrowError(ExpressionError);
		});

		it('should not allow class expression extending via CallExpression bypass', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { const Z = class extends (() => Function)() {}; return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer, Function },
				);
			}).toThrowError(ExpressionError);
		});

		it('should not allow class extending via ConditionalExpression bypass', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends (true ? Function : Object) {} return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer, Function, Object },
				);
			}).toThrowError(ExpressionError);
		});

		it('should not allow class extending via SequenceExpression bypass', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends (0, Function) {} return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer, Function },
				);
			}).toThrowError(ExpressionError);
		});

		it('should not allow class extending via LogicalExpression bypass', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { class Z extends (Function || Object) {} return new Z("return 1")(); })() }}',
					{ __sanitize: sanitizer, Function, Object },
				);
			}).toThrowError(ExpressionError);
		});
	});

	describe('Destructuring patterns', () => {
		it('should not allow destructuring constructor from arrow function', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { const {constructor} = ()=>{}; return constructor; })() }}',
					{
						__sanitize: sanitizer,
					},
				);
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring constructor from regular function', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { const {constructor} = function(){}; return constructor; })() }}',
					{
						__sanitize: sanitizer,
					},
				);
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring constructor with alias', () => {
			expect(() => {
				tournament.execute('{{ (() => { const {constructor: c} = ()=>{}; return c; })() }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring __proto__', () => {
			expect(() => {
				tournament.execute('{{ (() => { const {__proto__} = {}; return __proto__; })() }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring prototype', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { const {prototype} = function(){}; return prototype; })() }}',
					{
						__sanitize: sanitizer,
					},
				);
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring mainModule', () => {
			expect(() => {
				tournament.execute('{{ (() => { const {mainModule} = process; return mainModule; })() }}', {
					__sanitize: sanitizer,
					process: { mainModule: {} },
				});
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring caller', () => {
			expect(() => {
				tournament.execute('{{ (() => { const {caller} = ()=>{}; return caller; })() }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should not allow destructuring arguments', () => {
			expect(() => {
				tournament.execute('{{ (() => { const {arguments: a} = function(){}; return a; })() }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(ExpressionDestructuringError);
		});

		it('should allow destructuring safe properties', () => {
			const result = tournament.execute(
				'{{ (() => { const {name, value} = {name: "test", value: 42}; return name + value; })() }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe('test42');
		});

		it('should allow destructuring multiple safe properties', () => {
			const result = tournament.execute(
				'{{ (() => { const {a, b, c} = {a: 1, b: 2, c: 3}; return a + b + c; })() }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe(6);
		});

		it('should not allow computed property destructuring', () => {
			expect(() => {
				tournament.execute(
					'{{ (() => { const a = "constructor"; const {[a]: c} = {}; return c; })() }}',
					{
						__sanitize: sanitizer,
					},
				);
			}).toThrowError(ExpressionComputedDestructuringError);
		});
	});

	describe('Spread of host globals', () => {
		it.each([
			'process',
			'global',
			'globalThis',
			'Buffer',
			'console',
			'Error',
			'crypto',
			'navigator',
			'performance',
			'Intl',
			'Atomics',
			'URL',
			'TextEncoder',
			'TextDecoder',
			'fetch',
			'Headers',
			'Request',
			'Response',
			'Blob',
			'File',
			'FormData',
			'AbortController',
			'Event',
			'EventTarget',
			'MessageChannel',
			'SharedArrayBuffer',
			'ReadableStream',
			'WritableStream',
			'WeakRef',
			'FinalizationRegistry',
			'AggregateError',
		])('should not expose the host %s through a spread', (name) => {
			expect(tournament.execute(`{{ ({...${name}}) }}`, { __sanitize: sanitizer })).toEqual({});
		});

		it.each([
			['nested spread', '{{ ({...({...process})}) }}'],
			['spread inside an arrow function', '{{ (() => ({...process}))() }}'],
			['spread among other spreads', '{{ ({...{}, ...process}) }}'],
		])('should not expose a host global through a %s', (_, expression) => {
			expect(tournament.execute(expression, { __sanitize: sanitizer })).toEqual({});
		});

		it.each([
			['process.env', '{{ typeof ({...process}).env }}'],
			['process.pid', '{{ typeof ({...process}).pid }}'],
			['Buffer.allocUnsafe', '{{ typeof ({...Buffer}).allocUnsafe }}'],
			['console.log', '{{ typeof ({...console}).log }}'],
		])('should not expose the host %s through a spread', (_, expression) => {
			expect(tournament.execute(expression, { __sanitize: sanitizer })).toBe('undefined');
		});

		it.each([
			['an array literal', '{{ [...process] }}'],
			['call arguments', '{{ ((a) => a)(...process) }}'],
		])('should not iterate the host process in %s', (_, expression) => {
			expect(() => tournament.execute(expression, { __sanitize: sanitizer })).toThrow(
				/is not iterable/,
			);
		});

		it('should not hand out a reference to a host function', () => {
			expect(() => {
				tournament.execute('{{ ({...console}).log.toString() }}', { __sanitize: sanitizer });
			}).toThrow(/Cannot read properties of undefined/);
		});

		it('should not write to a host function', () => {
			expect(() => {
				tournament.execute('{{ Object.assign(({...console}).log, {written: 1}).name }}', {
					__sanitize: sanitizer,
					Object,
				});
			}).toThrow(/Cannot convert undefined or null to object/);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
			expect((console.log as any).written).toBeUndefined();
		});

		it.each([
			['an array literal', '{{ [...arguments][0] }}'],
			['an object literal', '{{ ({...arguments}) }}'],
			['a function body', '{{ (() => [...arguments][0])() }}'],
		])("should not expose the evaluator's own arguments in %s", (_, expression) => {
			expect(() => tournament.execute(expression, { __sanitize: sanitizer })).toThrow(errorRegex);
		});

		it('should not reach a built-in module through a spread', () => {
			expect(() => {
				tournament.execute(
					"{{ ((g) => g.getBuiltinModule('child_process').execSync('id').toString())({...process}) }}",
					{ __sanitize: sanitizer },
				);
			}).toThrow(errorRegex);
		});

		it('should not expose the host process through a template expression', () => {
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			const result = tournament.execute('{{ `${JSON.stringify({...process})}` }}', {
				__sanitize: sanitizer,
				JSON,
			});
			expect(result).toBe('{}');
		});

		it('should not expose the host process as a computed key', () => {
			const result = tournament.execute('{{ Object.keys({[process]: 1})[0] }}', {
				__sanitize: sanitizer,
				Object,
			});
			expect(result).toBe('undefined');
		});

		/**
		 * `Buffer` is additionally named in `blockedBaseClasses`, so these use a
		 * global that is not, to show that containment comes from the polyfill
		 * rather than from that list.
		 */
		it.each([
			['Error', '{{ (() => { class X extends Error {} return X.captureStackTrace; })() }}'],
			['Array', '{{ (() => { class X extends Array {} return X.from; })() }}'],
		])('should not expose the host %s as a base class', (_, expression) => {
			expect(() => tournament.execute(expression, { __sanitize: sanitizer })).toThrow(
				/is not a constructor or null/,
			);
		});

		it('should not expose the host process as a switch case', () => {
			const result = tournament.execute(
				'{{ (() => { switch (1) { case process: return "host"; } return "safe"; })() }}',
				{ __sanitize: sanitizer },
			);
			expect(result).toBe('safe');
		});
	});

	describe('Spread of data context values', () => {
		it('should spread an object from the data context', () => {
			const result = tournament.execute('{{ ({...$json}).greeting }}', {
				__sanitize: sanitizer,
				$json: { greeting: 'hello' },
			});
			expect(result).toBe('hello');
		});

		it('should merge a spread data context object with additional properties', () => {
			const result = tournament.execute('{{ JSON.stringify({...$json, b: 2}) }}', {
				__sanitize: sanitizer,
				$json: { a: 1 },
				JSON,
			});
			expect(result).toBe('{"a":1,"b":2}');
		});

		it('should spread an array from the data context', () => {
			const result = tournament.execute('{{ [...$arr].length }}', {
				__sanitize: sanitizer,
				$arr: [1, 2, 3],
			});
			expect(result).toBe(3);
		});

		it('should spread a data context value into call arguments', () => {
			const result = tournament.execute('{{ Math.max(...$arr) }}', {
				__sanitize: sanitizer,
				$arr: [1, 5, 3],
			});
			expect(result).toBe(5);
		});

		it('should prefer a data context value over the host global of the same name', () => {
			const result = tournament.execute('{{ ({...process}).pid }}', {
				__sanitize: sanitizer,
				process: { pid: -1 },
			});
			expect(result).toBe(-1);
		});

		it.each([
			['const', '{{ (() => { const process = { a: 1 }; return {...process}.a; })() }}'],
			['function scope', '{{ (function(){ const Buffer = { a: 1 }; return {...Buffer}.a; })() }}'],
			['parameter', '{{ ((process) => ({...process}).a)({ a: 1 }) }}'],
		])('should spread a local variable declared in %s scope', (_, expression) => {
			expect(tournament.execute(expression, { __sanitize: sanitizer })).toBe(1);
		});

		it('should resolve a computed key from the data context', () => {
			const result = tournament.execute('{{ ({[$key]: 1}).dynamic }}', {
				__sanitize: sanitizer,
				$key: 'dynamic',
			});
			expect(result).toBe(1);
		});

		it('should resolve a base class from the data context', () => {
			class Base {
				greet() {
					return 'hello';
				}
			}

			const result = tournament.execute(
				'{{ (() => { class X extends Base {} return new X().greet(); })() }}',
				{ __sanitize: sanitizer, Base },
			);
			expect(result).toBe('hello');
		});

		it('should resolve a switch case from the data context', () => {
			const result = tournament.execute(
				'{{ (() => { switch ($key) { case $key: return "matched"; } return "unmatched"; })() }}',
				{ __sanitize: sanitizer, $key: 'a' },
			);
			expect(result).toBe('matched');
		});
	});

	describe('`with` statement', () => {
		it('should not allow `with` statements', () => {
			expect(() => {
				tournament.execute('{{ (() => { with({}) { return 1; } })() }}', { __sanitize: sanitizer });
			}).toThrowError(ExpressionWithStatementError);
		});

		it('should not allow constructor access via `with` statement', () => {
			expect(() => {
				tournament.execute(
					'{{ (function(){ var constructor = 123; with(function(){}){ return constructor("return 1")() } })() }}',
					{ __sanitize: sanitizer },
				);
			}).toThrowError(ExpressionWithStatementError);
		});

		it('should not allow RCE via with statement', () => {
			expect(() => {
				tournament.execute(
					"{{ (function(){ var constructor = 123; with(function(){}){ return constructor(\"return process.mainModule.require('child_process').execSync('env').toString().trim()\")() } })() }}",
					{
						__sanitize: sanitizer,
					},
				);
			}).toThrowError(ExpressionWithStatementError);
		});

		it('should not allow nested `with` statements', () => {
			expect(() => {
				tournament.execute('{{ (() => { with({a:1}) { with({b:2}) { return a + b; } } })() }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(ExpressionWithStatementError);
		});

		it('should not allow `with` statement accessing prototype chain', () => {
			expect(() => {
				tournament.execute('{{ (() => { with(Object) { return getPrototypeOf({}); } })() }}', {
					__sanitize: sanitizer,
					Object,
				});
			}).toThrowError(ExpressionWithStatementError);
		});
	});
});

describe('ThisSanitizer', () => {
	describe('call expression where callee is function expression', () => {
		it('should transform call expression', () => {
			const result = tournament.execute('{{ (function() { return this.process; })() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({});
		});

		it('should handle recursive call expression', () => {
			const result = tournament.execute(
				'{{ (function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); })(5) }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe(120);
		});

		it('should not expose process.env through named function', () => {
			const result = tournament.execute('{{ (function test(){ return this.process.env })() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toBe(undefined);
		});

		it('should still allow access to workflow data via variables', () => {
			const result = tournament.execute('{{ (function() { return $json.value; })() }}', {
				__sanitize: sanitizer,
				$json: { value: 'test-value' },
			});
			expect(result).toBe('test-value');
		});

		it('should handle nested call expression', () => {
			const result = tournament.execute(
				'{{ (function() { return (function() { return this.process; })(); })() }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toEqual({});
		});

		it('should handle nested recursive call expression', () => {
			const result = tournament.execute(
				'{{ (function() { return (function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); })(5); })() }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe(120);
		});
	});

	describe('function expression', () => {
		it('should transform function expression', () => {
			const result = tournament.execute('{{ [1].map(function() { return this.process; }) }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual([{}]);
		});

		it('should handle recursive function expression', () => {
			const result = tournament.execute(
				'{{ [1, 2, 3, 4, 5].map(function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }) }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toEqual([1, 2, 6, 24, 120]);
		});

		it('should handle nested function expression', () => {
			const result = tournament.execute(
				'{{ [1, 2, 3].map(function(n) { return function() { return n * 2; }; }).map(function(fn) { return fn(); }) }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toEqual([2, 4, 6]);
		});

		it('should handle nested recursion', () => {
			const result = tournament.execute(
				'{{ (function fibonacci(n) { return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2); })(7) }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe(13);
		});
	});

	describe('process.env security', () => {
		it('should bind function expressions to empty process object', () => {
			const processResult = tournament.execute('{{ (function(){ return this.process })() }}', {
				__sanitize: sanitizer,
			});
			expect(processResult).toEqual({});
			expect(Object.keys(processResult as object)).toEqual([]);

			const envResult = tournament.execute('{{ (function(){ return this.process.env })() }}', {
				__sanitize: sanitizer,
			});
			expect(envResult).toBe(undefined);
		});

		it('should block process.env in nested functions', () => {
			const result = tournament.execute(
				'{{ (function outer(){ return (function inner(){ return this.process.env })(); })() }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe(undefined);
		});

		it('should block process.env in callbacks', () => {
			const result = tournament.execute(
				'{{ [1].map(function(){ return this.process.env; })[0] }}',
				{
					__sanitize: sanitizer,
				},
			);
			expect(result).toBe(undefined);
		});

		it('should still allow access to workflow variables', () => {
			const result = tournament.execute('{{ (function(){ return $json.value })() }}', {
				__sanitize: sanitizer,
				$json: { value: 'workflow-data' },
			});
			expect(result).toBe('workflow-data');
		});
	});

	describe('globalThis access via arrow functions', () => {
		it('should replace globalThis with empty object', () => {
			const result = tournament.execute('{{ (() => globalThis)() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({});
			expect(result).not.toBe(globalThis);
		});

		it('should block process.env access via globalThis', () => {
			const result = tournament.execute('{{ (() => globalThis.process)() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toBe(undefined);
		});

		it('should block chained globalThis access', () => {
			const result = tournament.execute('{{ ((g) => g.process)((() => globalThis)()) }}', {
				__sanitize: sanitizer,
			});
			expect(result).toBe(undefined);
		});

		it('should block env access via nested arrow functions', () => {
			// This payload attempts to access process.env via chained arrow functions
			// With the fix, globalThis becomes {}, so g.process is undefined,
			// and accessing .env on undefined throws an error - which is the desired security outcome
			expect(() => {
				tournament.execute('{{ ((p) => p.env)(((g) => g.process)((() => globalThis)())) }}', {
					__sanitize: sanitizer,
				});
			}).toThrow();
		});

		it('should replace globalThis with empty object in non-arrow contexts too', () => {
			// globalThis is replaced with {} at AST level, regardless of context
			const result = tournament.execute('{{ globalThis }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({});
		});

		it('should still allow access to workflow data via variables', () => {
			const result = tournament.execute('{{ (() => $json.value)() }}', {
				__sanitize: sanitizer,
				$json: { value: 'test-value' },
			});
			expect(result).toBe('test-value');
		});
	});

	describe('this access via arrow functions', () => {
		it('should replace this with safe context in arrow functions', () => {
			const result = tournament.execute('{{ (() => this)() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({ process: {}, require: {}, module: {}, Buffer: {} });
		});

		it('should block process.env access via this in arrow functions', () => {
			const result = tournament.execute('{{ (() => this?.process)() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({});
			expect(result).not.toHaveProperty('env');
		});

		it('should block this access in nested arrow functions', () => {
			const result = tournament.execute('{{ (() => (() => this)())() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({ process: {}, require: {}, module: {}, Buffer: {} });
		});

		it('should block this?.process?.env access pattern', () => {
			const result = tournament.execute('{{ (() => this?.process?.env)() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toBe(undefined);
		});

		it('should still work with this in regular function expressions', () => {
			const result = tournament.execute('{{ (function() { return this.process; })() }}', {
				__sanitize: sanitizer,
			});
			expect(result).toEqual({});
		});
	});

	describe('global access via concise arrow bodies', () => {
		it('should resolve a concise arrow body identifier from the data context', () => {
			const result = tournament.execute('{{ (() => safeVar)() }}', {
				__sanitize: sanitizer,
				safeVar: 'ok',
			});
			expect(result).toBe('ok');
		});

		it('should not expose real process members via a concise arrow body', () => {
			const result = tournament.execute('{{ typeof (() => process)().arch }}', {
				__sanitize: sanitizer,
				process: {},
			});
			expect(result).toBe('undefined');
		});

		it('should not expose real Reflect via a concise arrow body', () => {
			const result = tournament.execute('{{ typeof (() => Reflect)().get }}', {
				__sanitize: sanitizer,
				Reflect: {},
			});
			expect(result).toBe('undefined');
		});

		it('should not resolve host globals through arrow-captured identifiers', () => {
			expect(() => {
				tournament.execute(
					// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
					"{{ ((R,p)=>R.get(p,'getBuiltinModule'))((()=>Reflect)(),(()=>process)())('child_process').execSync('id').toString() }}",
					{ __sanitize: sanitizer },
				);
			}).toThrow();
		});

		it('should not rewrite arrow parameters used in a concise body', () => {
			const result = tournament.execute('{{ ((x) => x)(42) }}', { __sanitize: sanitizer });
			expect(result).toBe(42);
		});
	});
});
