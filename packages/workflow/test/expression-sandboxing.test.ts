import { Tournament } from '@n8n/tournament';

import {
	DollarSignValidator,
	FunctionThisSanitizer,
	PrototypeSanitizer,
	sanitizer,
	DOLLAR_SIGN_ERROR,
} from '../src/expression-sandboxing';

const tournament = new Tournament(
	(e) => {
		throw e;
	},
	undefined,
	undefined,
	{
		before: [FunctionThisSanitizer],
		after: [PrototypeSanitizer, DollarSignValidator],
	},
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
	});
});

describe('FunctionThisSanitizer', () => {
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
});
