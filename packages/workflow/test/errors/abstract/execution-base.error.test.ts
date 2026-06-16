import fc from 'fast-check';

import { ExecutionBaseError } from '../../../src/errors/abstract/execution-base.error';
import type { IDataObject, JsonObject } from '../../../src/interfaces';

// `ExecutionBaseError` is abstract — we exercise it via a minimal concrete
// subclass so we can construct instances and prove the behaviour observable
// to its consumers (the UI error panel, Sentry, persisted execution data):
//
//   1. `this.name` reflects the concrete subclass, not the abstract base.
//   2. The `cause` branches:
//        a) `cause instanceof ExecutionBaseError` → inherits the parent's
//           `context` reference (so a rewrap keeps the original error
//           breadcrumb the UI / Sentry display).
//        b) `cause && !(cause instanceof Error)`  → the non-Error value lands
//           on `this.cause` (since `super(message, { cause })` cannot reliably
//           preserve it through the class-field re-init that follows).
//        c) plain `Error` (and not an `ExecutionBaseError`) → context stays a
//           fresh `{}`, and `cause` is wiped to `undefined` by the class-field
//           re-init (the documented current behaviour — pin it so any change
//           is intentional).
//   3. `errorResponse` is assigned only when truthy, so a default-constructed
//      error leaves the field at its declared default and doesn't accidentally
//      stamp a falsy value into the serialised payload.
//   4. `toJSON()` returns the exact public contract — `{ message, lineNumber,
//      timestamp, name, description, context, cause }` — because that object
//      is what gets persisted and rendered downstream.
//
// `this.timestamp = Date.now()` is intentionally not pinned to a clock mock:
// asserting `typeof timestamp === 'number'` kills the block-removal mutant
// without coupling to wall-clock semantics that no consumer relies on.

class TestExecutionError extends ExecutionBaseError {}
class AnotherExecutionError extends ExecutionBaseError {}

describe('ExecutionBaseError', () => {
	describe('message + super delegation', () => {
		it('preserves the message passed to the constructor for any string', () => {
			fc.assert(
				fc.property(fc.string(), (message) => {
					const error = new TestExecutionError(message);

					expect(error.message).toBe(message);
				}),
			);
		});

		it('is an instance of Error and ExecutionBaseError', () => {
			const error = new TestExecutionError('boom');

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ExecutionBaseError);
			expect(error).toBeInstanceOf(TestExecutionError);
		});
	});

	describe('this.name = this.constructor.name', () => {
		it("uses the concrete subclass's name, not the abstract base", () => {
			const a = new TestExecutionError('a');
			const b = new AnotherExecutionError('b');

			expect(a.name).toBe('TestExecutionError');
			expect(b.name).toBe('AnotherExecutionError');
			// Negative assertion kills mutants that hard-code `name = 'Error'`
			// or remove the assignment entirely (Error's prototype name is 'Error').
			expect(a.name).not.toBe('Error');
			expect(a.name).not.toBe('');
		});
	});

	describe('timestamp', () => {
		it('stamps a numeric timestamp on construction', () => {
			const before = Date.now();
			const error = new TestExecutionError('boom');
			const after = Date.now();

			expect(typeof error.timestamp).toBe('number');
			expect(Number.isFinite(error.timestamp)).toBe(true);
			expect(error.timestamp).toBeGreaterThanOrEqual(before);
			expect(error.timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe('default state without options', () => {
		it('exposes the documented defaults', () => {
			const error = new TestExecutionError('boom');

			expect(error.context).toEqual({});
			expect(error.functionality).toBe('regular');
			expect(error.lineNumber).toBeUndefined();
			expect(error.description).toBeUndefined();
			expect(error.errorResponse).toBeUndefined();
			expect(error.cause).toBeUndefined();
		});

		it('gives every instance its own fresh context object', () => {
			// Pins that `context: IDataObject = {}` is a per-instance default,
			// not a shared singleton — mutating one error must not leak into
			// the next one constructed.
			const a = new TestExecutionError('a');
			const b = new TestExecutionError('b');

			expect(a.context).not.toBe(b.context);

			a.context.tainted = true;

			expect(b.context).toEqual({});
		});
	});

	describe('cause branch: ExecutionBaseError (re-wrap)', () => {
		it('inherits the parent context by reference for any context shape', () => {
			fc.assert(
				fc.property(
					fc.string(),
					fc.string(),
					fc.dictionary(fc.string({ minLength: 1 }), fc.jsonValue()),
					(innerMessage, outerMessage, contextShape) => {
						const inner = new TestExecutionError(innerMessage);
						inner.context = contextShape as IDataObject;

						const outer = new TestExecutionError(outerMessage, { cause: inner });

						// Reference equality — not just structural — so a future
						// mutation of `inner.context` is visible on `outer.context`.
						// This is the property the UI error panel and Sentry rely on
						// when displaying breadcrumb context for a re-wrapped error.
						expect(outer.context).toBe(inner.context);
					},
				),
			);
		});

		it('propagates mutations to the inherited context (shared reference)', () => {
			const inner = new TestExecutionError('inner');
			inner.context = { stage: 'pre' };

			const outer = new TestExecutionError('outer', { cause: inner });

			inner.context.stage = 'post';

			expect(outer.context).toEqual({ stage: 'post' });
			expect(outer.context).toBe(inner.context);
		});

		it('inherits context even across different ExecutionBaseError subclasses', () => {
			// The `instanceof ExecutionBaseError` check must not be tightened
			// to a same-class check by a mutant — wrapping a sibling subclass
			// must still inherit context.
			const inner = new AnotherExecutionError('inner');
			inner.context = { from: 'sibling' };

			const outer = new TestExecutionError('outer', { cause: inner });

			expect(outer.context).toBe(inner.context);
		});
	});

	describe('cause branch: non-Error value', () => {
		it('assigns any non-Error truthy cause to `this.cause` by reference', () => {
			const nonErrorArb = fc.oneof(
				fc.string({ minLength: 1 }),
				fc.integer({ min: 1 }),
				fc.constant(true),
				fc.record({ tag: fc.string({ minLength: 1 }) }),
				fc.array(fc.string()),
			);

			fc.assert(
				fc.property(fc.string(), nonErrorArb, (message, cause) => {
					const error = new TestExecutionError(message, {
						cause: cause as unknown as Error,
					});

					expect(error.cause).toBe(cause);
					// Context is NOT inherited for non-ExecutionBaseError causes —
					// the value lives on `cause`, not `context`.
					expect(error.context).toEqual({});
				}),
			);
		});

		it('does not assign falsy non-Error causes (the `cause &&` guard)', () => {
			// `cause && !(cause instanceof Error)` must short-circuit on falsy
			// causes; otherwise `this.cause = 0` / `this.cause = ''` would mask
			// the absence of a real cause.
			for (const falsy of [undefined, null, 0, '', false]) {
				const error = new TestExecutionError('boom', {
					cause: falsy as unknown as Error,
				});

				expect(error.cause).toBeUndefined();
			}
		});

		it('does not inherit context when the cause is a non-Error value', () => {
			// Mutants that broaden the `instanceof ExecutionBaseError` branch
			// (e.g. flip to `true`) would try to read `.context` off a primitive
			// and either crash or wire a non-object into `this.context`.
			const error = new TestExecutionError('boom', {
				cause: 'plain-string' as unknown as Error,
			});

			expect(error.context).toEqual({});
			expect(error.cause).toBe('plain-string');
		});
	});

	describe('cause branch: plain Error (not ExecutionBaseError)', () => {
		it('leaves context as a fresh empty object and does not assign this.cause', () => {
			// Documents the (current) interaction between `super(message, options)`
			// and the `override cause?: Error` class-field re-init: the field
			// declaration runs after super() and overwrites whatever the native
			// Error constructor stored. The `else if` branch is skipped because
			// the cause IS an Error, so `this.cause` ends up undefined.
			fc.assert(
				fc.property(fc.string(), fc.string(), (outerMessage, innerMessage) => {
					const inner = new Error(innerMessage);

					const error = new TestExecutionError(outerMessage, { cause: inner });

					expect(error.context).toEqual({});
					expect(error.cause).toBeUndefined();
				}),
			);
		});

		it('does not inherit context from a plain Error', () => {
			const inner = new Error('inner');
			// Attach a `context`-like property to prove the `instanceof
			// ExecutionBaseError` check, not a duck-typed property probe, gates
			// the inheritance.
			(inner as unknown as { context: IDataObject }).context = { leaked: true };

			const outer = new TestExecutionError('outer', { cause: inner });

			expect(outer.context).toEqual({});
			expect(outer.context).not.toEqual({ leaked: true });
		});
	});

	describe('errorResponse assignment', () => {
		it('assigns the same object reference for any truthy errorResponse', () => {
			fc.assert(
				fc.property(
					fc.string(),
					fc.dictionary(fc.string({ minLength: 1 }), fc.jsonValue()),
					(message, response) => {
						const errorResponse = response as JsonObject;

						const error = new TestExecutionError(message, { errorResponse });

						expect(error.errorResponse).toBe(errorResponse);
					},
				),
			);
		});

		it('leaves errorResponse undefined when not provided', () => {
			const error = new TestExecutionError('boom');

			expect(error.errorResponse).toBeUndefined();
		});

		it('does not stamp falsy errorResponse values (the `if (errorResponse)` guard)', () => {
			// Kills the `if (errorResponse)` → `if (true)` mutant: a `true`
			// guard would assign the falsy value, leaving `errorResponse` set
			// to null / '' / 0 instead of the declared `undefined` default.
			for (const falsy of [null, '', 0, false]) {
				const error = new TestExecutionError('boom', {
					errorResponse: falsy as unknown as JsonObject,
				});

				expect(error.errorResponse).toBeUndefined();
			}
		});
	});

	describe('toJSON contract', () => {
		it('returns exactly the documented field set', () => {
			const error = new TestExecutionError('boom');

			expect(typeof error.toJSON).toBe('function');
			const json = error.toJSON!();

			// Exact key set — a mutant that drops or renames a field is caught
			// here, not only by the value assertions below.
			expect(Object.keys(json).sort()).toEqual(
				['cause', 'context', 'description', 'lineNumber', 'message', 'name', 'timestamp'].sort(),
			);
		});

		it('mirrors instance state into the serialised payload', () => {
			const cause = new TestExecutionError('inner');
			cause.context = { stage: 'pre' };

			const error = new TestExecutionError('outer', { cause });
			error.description = 'rich-description';
			error.lineNumber = 42;

			const json = error.toJSON!();

			expect(json.message).toBe('outer');
			expect(json.name).toBe('TestExecutionError');
			expect(json.description).toBe('rich-description');
			expect(json.lineNumber).toBe(42);
			expect(json.context).toBe(error.context);
			expect(json.context).toBe(cause.context);
			expect(json.timestamp).toBe(error.timestamp);
			expect(json.cause).toBe(error.cause);
		});

		it('serialises a non-Error cause through `cause`', () => {
			const error = new TestExecutionError('outer', {
				cause: 'plain-string' as unknown as Error,
			});

			const json = error.toJSON!();

			expect(json.cause).toBe('plain-string');
		});

		it('round-trips through JSON.stringify by calling toJSON()', () => {
			// `JSON.stringify` honours `toJSON()` — if a mutant breaks the
			// method (e.g. block-removes the return), the round-trip output
			// would be Error's default empty serialisation (`{}`) instead of
			// the documented shape. Populate every field so none are dropped
			// by JSON.stringify's undefined-elision.
			const cause = new TestExecutionError('inner');
			const error = new TestExecutionError('outer', { cause });
			error.description = 'detail';
			error.lineNumber = 7;

			// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify -- intentional round-trip via JSON.stringify to verify toJSON() is invoked, not a deep clone
			const serialised = JSON.parse(JSON.stringify(error)) as Record<string, unknown>;

			expect(serialised.message).toBe('outer');
			expect(serialised.name).toBe('TestExecutionError');
			expect(serialised.description).toBe('detail');
			expect(serialised.lineNumber).toBe(7);
			expect(serialised.context).toEqual({});
			expect(typeof serialised.timestamp).toBe('number');
			// `cause` is undefined for an Error-typed cause (the class-field
			// re-init wipes it) — JSON.stringify drops undefined keys, so we
			// instead assert the keys we DO expect to materialise.
			expect(Object.keys(serialised).sort()).toEqual(
				['context', 'description', 'lineNumber', 'message', 'name', 'timestamp'].sort(),
			);
		});
	});
});
