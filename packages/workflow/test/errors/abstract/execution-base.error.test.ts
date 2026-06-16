import { ApplicationError } from '@n8n/errors';
import * as fc from 'fast-check';

import { ExecutionBaseError } from '../../../src/errors/abstract/execution-base.error';
import type { IDataObject, JsonObject } from '../../../src/interfaces';

class TestExecutionError extends ExecutionBaseError {}
class AnotherTestError extends ExecutionBaseError {}

describe('ExecutionBaseError', () => {
	describe('inheritance', () => {
		it('is an instance of ApplicationError and Error', () => {
			const err = new TestExecutionError('msg');
			expect(err).toBeInstanceOf(ApplicationError);
			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(ExecutionBaseError);
			expect(err).toBeInstanceOf(TestExecutionError);
		});

		it('forwards the message argument to the parent Error', () => {
			fc.assert(
				fc.property(fc.string(), (msg) => {
					const err = new TestExecutionError(msg);
					expect(err.message).toBe(msg);
				}),
			);
		});

		it('forwards reporting options to the parent ApplicationError', () => {
			const err = new TestExecutionError('msg', { level: 'warning' });
			expect(err.level).toBe('warning');

			const err2 = new TestExecutionError('msg');
			expect(err2.level).toBe('error');
		});

		it('forwards tags through to the parent ApplicationError', () => {
			const err = new TestExecutionError('msg', { tags: { foo: 'bar' } });
			expect(err.tags).toMatchObject({ foo: 'bar' });
		});
	});

	describe('default field values', () => {
		it('sets `name` to the concrete subclass constructor name', () => {
			expect(new TestExecutionError('msg').name).toBe('TestExecutionError');
			expect(new AnotherTestError('msg').name).toBe('AnotherTestError');
		});

		it('sets `name` per instance via `this.constructor.name` (not hard-coded)', () => {
			// Two distinct subclasses with the same parent must end up with
			// different `name` values — proves `this.constructor.name` is used,
			// not a literal or `ExecutionBaseError.name`.
			const a = new TestExecutionError('x').name;
			const b = new AnotherTestError('x').name;
			expect(a).not.toBe(b);
			expect(a).not.toBe('ExecutionBaseError');
			expect(b).not.toBe('ExecutionBaseError');
		});

		it('defaults `context` to an empty plain object', () => {
			const err = new TestExecutionError('msg');
			expect(err.context).toEqual({});
			expect(Object.keys(err.context)).toHaveLength(0);
			expect(typeof err.context).toBe('object');
			expect(err.context).not.toBeNull();
			expect(Array.isArray(err.context)).toBe(false);
		});

		it('gives each instance its own fresh `context` object', () => {
			const e1 = new TestExecutionError('a');
			const e2 = new TestExecutionError('b');
			expect(e1.context).not.toBe(e2.context);
			e1.context.foo = 1;
			expect(e2.context).toEqual({});
		});

		it("defaults `functionality` to the exact string 'regular'", () => {
			const err = new TestExecutionError('msg');
			expect(err.functionality).toBe('regular');
			expect(err.functionality).toHaveLength('regular'.length);
		});

		it('leaves `description`, `lineNumber`, `cause` and `errorResponse` undefined by default', () => {
			const err = new TestExecutionError('msg');
			expect(err.description).toBeUndefined();
			expect(err.lineNumber).toBeUndefined();
			expect(err.cause).toBeUndefined();
			expect(err.errorResponse).toBeUndefined();
		});

		it('sets `timestamp` to a finite number close to Date.now() at construction time', () => {
			const before = Date.now();
			const err = new TestExecutionError('msg');
			const after = Date.now();
			expect(Number.isFinite(err.timestamp)).toBe(true);
			expect(err.timestamp).toBeGreaterThanOrEqual(before);
			expect(err.timestamp).toBeLessThanOrEqual(after);
		});

		it('uses the current clock value via Date.now() (mockable)', () => {
			const fixed = 1_700_000_000_000;
			const spy = vi.spyOn(Date, 'now').mockReturnValue(fixed);
			try {
				const err = new TestExecutionError('msg');
				expect(err.timestamp).toBe(fixed);
				expect(spy).toHaveBeenCalled();
			} finally {
				spy.mockRestore();
			}
		});

		it('captures a fresh timestamp per instance (monotonic non-decreasing)', () => {
			const spy = vi.spyOn(Date, 'now');
			spy.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);
			try {
				const e1 = new TestExecutionError('a');
				const e2 = new TestExecutionError('b');
				expect(e1.timestamp).toBe(1_000);
				expect(e2.timestamp).toBe(2_000);
			} finally {
				spy.mockRestore();
			}
		});
	});

	describe('cause handling', () => {
		it('shares the `context` reference when `cause` is an ExecutionBaseError', () => {
			const original = new TestExecutionError('original');
			original.context.foo = 'bar';
			const wrapper = new AnotherTestError('wrapped', { cause: original });
			// Same reference — wrapper takes over the cause's context object.
			expect(wrapper.context).toBe(original.context);
			expect(wrapper.context).toEqual({ foo: 'bar' });
			// Mutating either side is visible on the other (proves shared ref).
			wrapper.context.baz = 1;
			expect(original.context).toEqual({ foo: 'bar', baz: 1 });
		});

		it('does NOT share `context` when `cause` is a plain Error (the ExecutionBaseError branch must be specific)', () => {
			const cause = new Error('plain');
			const err = new TestExecutionError('msg', { cause });
			// The fresh empty context survives — proves the instanceof check
			// rejects non-ExecutionBaseError values.
			expect(err.context).toEqual({});
			expect(err.context).not.toBe((cause as unknown as { context?: object }).context);
		});

		it('does NOT take context from a sibling ExecutionBaseError sub-instance when the cause is a non-ExecutionBaseError Error subclass', () => {
			class SomethingElse extends Error {
				context = { stolen: true };
			}
			const cause = new SomethingElse('nope');
			const err = new TestExecutionError('msg', { cause });
			// Even though the cause has a `context` property, the branch must
			// only fire for ExecutionBaseError instances.
			expect(err.context).toEqual({});
			expect(err.context).not.toBe(cause.context);
		});

		it('assigns `this.cause` when `cause` is truthy but not an Error', () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.string({ minLength: 1 }),
						fc.integer({ min: 1, max: 1_000_000 }),
						fc.record({ code: fc.string({ minLength: 1 }) }),
						fc.array(fc.integer(), { minLength: 1 }),
					),
					(value) => {
						const err = new TestExecutionError('msg', { cause: value as unknown as Error });
						expect(err.cause).toBe(value);
					},
				),
			);
		});

		it('leaves `this.cause` undefined when cause is a plain Error', () => {
			// The body only assigns `this.cause` for non-Error truthy values.
			// The `override cause?` field initializer also resets the slot post-super.
			const cause = new Error('inner');
			const err = new TestExecutionError('msg', { cause });
			expect(err.cause).toBeUndefined();
		});

		it('leaves `this.cause` undefined when cause is an ExecutionBaseError (context is shared instead)', () => {
			// ExecutionBaseError branch only copies context, not the cause itself.
			const cause = new TestExecutionError('inner');
			const err = new AnotherTestError('outer', { cause });
			expect(err.cause).toBeUndefined();
			expect(err.context).toBe(cause.context);
		});

		it('leaves `cause` undefined when no cause is supplied', () => {
			const err = new TestExecutionError('msg');
			expect(err.cause).toBeUndefined();
		});

		it('does not assign cause from falsy values (empty string, 0, false, null, undefined)', () => {
			const falsyCauses: unknown[] = ['', 0, false, null, undefined];
			for (const value of falsyCauses) {
				const err = new TestExecutionError('msg', { cause: value as Error | undefined });
				expect(err.cause).toBeUndefined();
			}
		});

		it('non-Error cause does not touch context', () => {
			fc.assert(
				fc.property(fc.oneof(fc.string({ minLength: 1 }), fc.integer({ min: 1 })), (value) => {
					const err = new TestExecutionError('msg', { cause: value as unknown as Error });
					expect(err.context).toEqual({});
				}),
			);
		});
	});

	describe('errorResponse handling', () => {
		it('stores the same reference when `errorResponse` is provided', () => {
			const response: JsonObject = { code: 500, message: 'boom' };
			const err = new TestExecutionError('msg', { errorResponse: response });
			expect(err.errorResponse).toBe(response);
		});

		it('stores arbitrary truthy JsonObject responses by reference', () => {
			fc.assert(
				fc.property(
					fc.dictionary(
						fc.string({ minLength: 1 }),
						fc.oneof(fc.string(), fc.integer(), fc.boolean()),
						{ minKeys: 1 },
					),
					(response) => {
						const err = new TestExecutionError('msg', {
							errorResponse: response as JsonObject,
						});
						expect(err.errorResponse).toBe(response);
					},
				),
			);
		});

		it('leaves `errorResponse` undefined when not provided', () => {
			const err = new TestExecutionError('msg');
			expect(err.errorResponse).toBeUndefined();
		});

		it('leaves `errorResponse` undefined when explicitly undefined', () => {
			const err = new TestExecutionError('msg', { errorResponse: undefined });
			expect(err.errorResponse).toBeUndefined();
		});

		it('does not store a null errorResponse (truthy check, not a presence check)', () => {
			// Distinguishes `if (errorResponse)` from `if (true)`: with `true`,
			// the assignment would run and `errorResponse` would become `null`.
			const err = new TestExecutionError('msg', {
				errorResponse: null as unknown as JsonObject,
			});
			expect(err.errorResponse).toBeUndefined();
		});

		it('does not store falsy non-object errorResponse values', () => {
			const cases: unknown[] = [null, 0, false, '', NaN];
			for (const value of cases) {
				const err = new TestExecutionError('msg', {
					errorResponse: value as JsonObject,
				});
				expect(err.errorResponse).toBeUndefined();
			}
		});
	});

	describe('toJSON()', () => {
		it('returns an object with exactly the documented keys', () => {
			const err = new TestExecutionError('msg');
			const json = err.toJSON?.() as Record<string, unknown>;
			expect(json).toBeDefined();
			expect(Object.keys(json).sort()).toEqual(
				['cause', 'context', 'description', 'lineNumber', 'message', 'name', 'timestamp'].sort(),
			);
		});

		it('returns current values for each property at call time', () => {
			const err = new TestExecutionError('initial');
			err.message = 'updated';
			err.lineNumber = 42;
			err.description = 'desc';
			err.context.key = 'value';
			(err as { cause?: unknown }).cause = new Error('inner');
			const json = err.toJSON?.() as Record<string, unknown>;
			expect(json.message).toBe('updated');
			expect(json.lineNumber).toBe(42);
			expect(json.description).toBe('desc');
			expect(json.context).toBe(err.context);
			expect(json.cause).toBe(err.cause);
			expect(json.timestamp).toBe(err.timestamp);
			expect(json.name).toBe('TestExecutionError');
		});

		it('uses the live `timestamp` (does not freeze a different value)', () => {
			const err = new TestExecutionError('msg');
			err.timestamp = 12345;
			const json = err.toJSON?.() as Record<string, unknown>;
			expect(json.timestamp).toBe(12345);
		});

		it('reflects subclass name in JSON', () => {
			const err = new AnotherTestError('msg');
			const json = err.toJSON?.() as Record<string, unknown>;
			expect(json.name).toBe('AnotherTestError');
		});

		it('reflects current field values across arbitrary mutations (property-based)', () => {
			fc.assert(
				fc.property(
					fc.string(),
					fc.integer(),
					fc.option(fc.string(), { nil: undefined }),
					fc.dictionary(fc.string(), fc.string()),
					(message, lineNumber, description, context) => {
						const err = new TestExecutionError(message);
						err.lineNumber = lineNumber;
						err.description = description;
						err.context = context as IDataObject;
						const json = err.toJSON?.() as Record<string, unknown>;
						expect(json.message).toBe(message);
						expect(json.lineNumber).toBe(lineNumber);
						expect(json.description).toBe(description);
						expect(json.context).toBe(context);
						expect(json.name).toBe('TestExecutionError');
					},
				),
			);
		});

		it('serialises a freshly-constructed error consistently with its own fields', () => {
			fc.assert(
				fc.property(fc.string(), (msg) => {
					const err = new TestExecutionError(msg);
					const json = err.toJSON?.() as Record<string, unknown>;
					expect(json.message).toBe(err.message);
					expect(json.context).toBe(err.context);
					expect(json.timestamp).toBe(err.timestamp);
					expect(json.name).toBe(err.name);
					expect(json.cause).toBe(err.cause);
					expect(json.lineNumber).toBe(err.lineNumber);
					expect(json.description).toBe(err.description);
				}),
			);
		});
	});

	describe('metamorphic invariants', () => {
		it('chained re-wraps share context across the chain (transitivity)', () => {
			const root = new TestExecutionError('root');
			root.context.requestId = 'req-1';
			const middle = new AnotherTestError('middle', { cause: root });
			const outer = new TestExecutionError('outer', { cause: middle });
			expect(outer.context).toBe(middle.context);
			expect(middle.context).toBe(root.context);
			expect(outer.context).toEqual({ requestId: 'req-1' });
			// Mutating the outer context propagates to the root (proof of shared ref).
			outer.context.added = true;
			expect(root.context).toEqual({ requestId: 'req-1', added: true });
		});

		it('re-wrap of an ExecutionBaseError leaves the wrapper cause undefined but inherits its context', () => {
			const root = new TestExecutionError('root');
			root.context.tag = 'preserve';
			const middle = new AnotherTestError('middle', { cause: root });
			expect(middle.cause).toBeUndefined();
			expect(middle.context).toBe(root.context);
		});

		it('constructor is idempotent on functionality default (always `regular`, regardless of options)', () => {
			fc.assert(
				fc.property(fc.string(), fc.option(fc.string(), { nil: undefined }), (msg, _extra) => {
					const err = new TestExecutionError(msg);
					expect(err.functionality).toBe('regular');
				}),
			);
		});

		it('errorResponse, when provided, is the same object passed in (referential identity preserved)', () => {
			const a: JsonObject = { x: 1 };
			const b: JsonObject = { y: 2 };
			const e1 = new TestExecutionError('m', { errorResponse: a });
			const e2 = new TestExecutionError('m', { errorResponse: b });
			expect(e1.errorResponse).toBe(a);
			expect(e2.errorResponse).toBe(b);
			expect(e1.errorResponse).not.toBe(e2.errorResponse);
		});
	});
});
