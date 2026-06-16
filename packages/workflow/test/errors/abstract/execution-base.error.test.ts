import fc from 'fast-check';

import { ExecutionBaseError } from '../../../src/errors/abstract/execution-base.error';
import type { Functionality, IDataObject, JsonObject } from '../../../src/interfaces';

class TestExecutionError extends ExecutionBaseError {}

class AnotherTestExecutionError extends ExecutionBaseError {}

describe('ExecutionBaseError', () => {
	describe('constructor — name', () => {
		it('sets `name` to the concrete constructor name', () => {
			const error = new TestExecutionError('boom');
			expect(error.name).toBe('TestExecutionError');
		});

		it('uses the concrete subclass name even when subclassed twice', () => {
			class DeepError extends TestExecutionError {}
			const error = new DeepError('boom');
			expect(error.name).toBe('DeepError');
		});

		it('differs across distinct subclasses sharing the same message', () => {
			const a = new TestExecutionError('same message');
			const b = new AnotherTestExecutionError('same message');
			expect(a.name).not.toBe(b.name);
			expect(a.name).toBe('TestExecutionError');
			expect(b.name).toBe('AnotherTestExecutionError');
		});
	});

	describe('constructor — timestamp', () => {
		it('captures Date.now() at construction time', () => {
			const fixed = 1_700_000_000_000;
			vi.useFakeTimers({ now: fixed });
			try {
				const error = new TestExecutionError('boom');
				expect(error.timestamp).toBe(fixed);
			} finally {
				vi.useRealTimers();
			}
		});

		it('moves forward when wall-clock advances between constructions', () => {
			vi.useFakeTimers({ now: 1_000 });
			try {
				const first = new TestExecutionError('a');
				vi.setSystemTime(2_500);
				const second = new TestExecutionError('b');
				expect(second.timestamp).toBeGreaterThan(first.timestamp);
				expect(second.timestamp - first.timestamp).toBe(1_500);
			} finally {
				vi.useRealTimers();
			}
		});

		it('timestamp is a finite number for every instance (property)', () => {
			fc.assert(
				fc.property(fc.string(), (message) => {
					const before = Date.now();
					const error = new TestExecutionError(message);
					const after = Date.now();
					expect(typeof error.timestamp).toBe('number');
					expect(Number.isFinite(error.timestamp)).toBe(true);
					expect(error.timestamp).toBeGreaterThanOrEqual(before);
					expect(error.timestamp).toBeLessThanOrEqual(after);
				}),
			);
		});
	});

	describe('constructor — defaults', () => {
		it('initialises `context` to a fresh empty object', () => {
			const error = new TestExecutionError('boom');
			expect(error.context).toEqual({});
			expect(Object.keys(error.context)).toHaveLength(0);
		});

		it('gives each instance its own `context` reference when no cause is provided', () => {
			const a = new TestExecutionError('a');
			const b = new TestExecutionError('b');
			a.context.shared = 'a-only';
			expect(b.context).toEqual({});
			expect(a.context).not.toBe(b.context);
		});

		it('initialises `functionality` to "regular"', () => {
			const error = new TestExecutionError('boom');
			expect(error.functionality).toBe<Functionality>('regular');
		});

		it('initialises `lineNumber` to undefined', () => {
			const error = new TestExecutionError('boom');
			expect(error.lineNumber).toBeUndefined();
		});

		it('initialises `description` to undefined', () => {
			const error = new TestExecutionError('boom');
			expect(error.description).toBeUndefined();
		});

		it('initialises `errorResponse` to undefined when not passed', () => {
			const error = new TestExecutionError('boom');
			expect(error.errorResponse).toBeUndefined();
		});
	});

	describe('constructor — cause routing', () => {
		it('inherits context (by reference) when cause is an ExecutionBaseError', () => {
			const inner = new TestExecutionError('inner');
			inner.context = { traceId: 'abc', step: 1 };
			const outer = new AnotherTestExecutionError('outer', { cause: inner });
			expect(outer.context).toBe(inner.context);
			expect(outer.context).toEqual({ traceId: 'abc', step: 1 });
		});

		it('reflects later mutations of the inherited context (same reference)', () => {
			const inner = new TestExecutionError('inner');
			inner.context = { traceId: 'abc' };
			const outer = new AnotherTestExecutionError('outer', { cause: inner });
			inner.context.added = 'later';
			expect(outer.context.added).toBe('later');
		});

		it('does NOT route a regular Error into `this.cause` via the non-Error branch', () => {
			const inner = new Error('plain');
			const error = new TestExecutionError('outer', { cause: inner });
			// The `else if (cause && !(cause instanceof Error))` branch must NOT
			// match a real Error — so the explicit `this.cause = cause` assignment
			// in that branch must not run. The non-ExecutionBaseError Error path
			// also leaves `context` untouched (still its default empty object).
			expect(error.context).toEqual({});
			expect(error.context).not.toBe(inner as unknown as IDataObject);
		});

		it('routes a non-Error truthy cause into `this.cause`', () => {
			const nonErrorCause = { code: 'X', detail: 'opaque' } as unknown as Error;
			const error = new TestExecutionError('outer', { cause: nonErrorCause });
			expect(error.cause).toBe(nonErrorCause);
		});

		it('routes a primitive non-Error cause into `this.cause`', () => {
			const stringCause = 'string cause' as unknown as Error;
			const error = new TestExecutionError('outer', { cause: stringCause });
			expect(error.cause).toBe(stringCause);
		});

		it('leaves context as the default when cause is non-Error truthy', () => {
			const nonErrorCause = { code: 'X' } as unknown as Error;
			const error = new TestExecutionError('outer', { cause: nonErrorCause });
			expect(error.context).toEqual({});
		});

		it('does NOT set `this.cause` from a non-Error branch when no cause is passed', () => {
			const error = new TestExecutionError('outer');
			expect(error.cause).toBeUndefined();
		});

		it('handles cause being explicitly undefined (no branch matches)', () => {
			const error = new TestExecutionError('outer', { cause: undefined });
			expect(error.cause).toBeUndefined();
			expect(error.context).toEqual({});
		});

		// `else if (cause && !(cause instanceof Error))` — a falsy non-undefined
		// cause (null, 0, '', false) must NOT enter the branch. These cases catch
		// mutants that flip the conditional to `true` or `||`, which would assign
		// the falsy value onto `this.cause`.
		it.each([
			['null', null],
			['empty string', ''],
			['zero', 0],
			['false', false],
		])('does NOT assign a falsy non-undefined cause (%s) to `this.cause`', (_label, falsy) => {
			const error = new TestExecutionError('outer', { cause: falsy as unknown as Error });
			expect(error.cause).toBeUndefined();
		});

		it('PROPERTY: any ExecutionBaseError cause makes outer.context === cause.context', () => {
			fc.assert(
				fc.property(
					fc.string(),
					fc.dictionary(fc.string({ minLength: 1, maxLength: 8 }), fc.jsonValue()),
					(outerMessage, ctx) => {
						const inner = new TestExecutionError('inner');
						inner.context = ctx as IDataObject;
						const outer = new AnotherTestExecutionError(outerMessage, { cause: inner });
						expect(outer.context).toBe(inner.context);
					},
				),
			);
		});

		it('PROPERTY: a non-Error truthy cause is stored as-is on `this.cause`', () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.string({ minLength: 1 }),
						fc.integer({ min: 1 }),
						fc.record({ code: fc.string(), reason: fc.string() }),
					),
					(cause) => {
						const error = new TestExecutionError('m', { cause: cause as unknown as Error });
						expect(error.cause).toBe(cause);
					},
				),
			);
		});
	});

	describe('constructor — errorResponse', () => {
		it('assigns errorResponse when provided', () => {
			const errorResponse: JsonObject = { status: 500, body: 'oops' };
			const error = new TestExecutionError('m', { errorResponse });
			expect(error.errorResponse).toBe(errorResponse);
		});

		it('does NOT assign errorResponse when omitted', () => {
			const error = new TestExecutionError('m');
			expect('errorResponse' in error ? error.errorResponse : undefined).toBeUndefined();
		});

		it('does NOT assign errorResponse when explicitly undefined', () => {
			const error = new TestExecutionError('m', { errorResponse: undefined });
			expect(error.errorResponse).toBeUndefined();
		});

		it('assigns errorResponse even when it is an empty object (truthy)', () => {
			const errorResponse: JsonObject = {};
			const error = new TestExecutionError('m', { errorResponse });
			expect(error.errorResponse).toBe(errorResponse);
		});

		// `if (errorResponse) this.errorResponse = errorResponse` — a falsy
		// non-undefined value (null, 0, '', false) must NOT be assigned. These
		// cases catch a mutant that flips the condition to `true`, which would
		// store the falsy value as `errorResponse`.
		it.each([
			['null', null],
			['empty string', ''],
			['zero', 0],
			['false', false],
		])('does NOT assign a falsy non-undefined errorResponse (%s)', (_label, falsy) => {
			const error = new TestExecutionError('m', {
				errorResponse: falsy as unknown as JsonObject,
			});
			expect(error.errorResponse).toBeUndefined();
		});

		it('PROPERTY: any JsonObject passed as errorResponse is stored by reference', () => {
			fc.assert(
				fc.property(
					fc.dictionary(fc.string({ minLength: 1, maxLength: 6 }), fc.jsonValue()),
					(payload) => {
						const error = new TestExecutionError('m', {
							errorResponse: payload as JsonObject,
						});
						expect(error.errorResponse).toBe(payload);
					},
				),
			);
		});
	});

	describe('message propagation', () => {
		it('forwards the message string to the underlying Error', () => {
			const error = new TestExecutionError('a specific message');
			expect(error.message).toBe('a specific message');
		});

		it('PROPERTY: message round-trips for arbitrary strings', () => {
			fc.assert(
				fc.property(fc.string(), (message) => {
					const error = new TestExecutionError(message);
					expect(error.message).toBe(message);
				}),
			);
		});
	});

	describe('toJSON', () => {
		const fixedNow = 1_700_000_000_000;

		beforeEach(() => {
			vi.useFakeTimers({ now: fixedNow });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('returns an object with every documented field', () => {
			const error = new TestExecutionError('boom');
			error.description = 'a description';
			error.lineNumber = 42;
			error.context = { foo: 'bar' };
			const cause = { code: 'X' } as unknown as Error;
			error.cause = cause;

			const json = error.toJSON?.();
			expect(json).toEqual({
				message: 'boom',
				lineNumber: 42,
				timestamp: fixedNow,
				name: 'TestExecutionError',
				description: 'a description',
				context: { foo: 'bar' },
				cause,
			});
		});

		it('exposes exactly the documented keys (no extra leakage)', () => {
			const error = new TestExecutionError('boom');
			const json = error.toJSON?.() as Record<string, unknown>;
			expect(Object.keys(json).sort()).toEqual(
				['cause', 'context', 'description', 'lineNumber', 'message', 'name', 'timestamp'].sort(),
			);
		});

		it('returns the live values of each property (not snapshots from construction)', () => {
			const error = new TestExecutionError('initial');
			// Mutate fields after construction.
			error.description = 'late description';
			error.lineNumber = 7;
			error.context = { changed: true };
			const json = error.toJSON?.();
			expect(json).toMatchObject({
				message: 'initial',
				name: 'TestExecutionError',
				description: 'late description',
				lineNumber: 7,
				context: { changed: true },
			});
		});

		it('reflects context inherited from a cause that is an ExecutionBaseError', () => {
			const inner = new TestExecutionError('inner');
			inner.context = { traceId: 'abc' };
			const outer = new AnotherTestExecutionError('outer', { cause: inner });
			const json = outer.toJSON?.();
			expect(json?.context).toEqual({ traceId: 'abc' });
			expect(json?.name).toBe('AnotherTestExecutionError');
		});

		it('reflects a non-Error cause routed onto `this.cause`', () => {
			const nonErrorCause = { code: 'X' } as unknown as Error;
			const error = new TestExecutionError('outer', { cause: nonErrorCause });
			expect(error.toJSON?.()?.cause).toBe(nonErrorCause);
		});

		it('uses the same timestamp captured during construction', () => {
			const error = new TestExecutionError('boom');
			vi.setSystemTime(fixedNow + 10_000);
			expect(error.toJSON?.()?.timestamp).toBe(fixedNow);
		});

		it('PROPERTY: toJSON.message === instance.message for arbitrary strings', () => {
			fc.assert(
				fc.property(fc.string(), (message) => {
					const error = new TestExecutionError(message);
					expect(error.toJSON?.()?.message).toBe(error.message);
				}),
			);
		});

		it('PROPERTY: toJSON.name === instance.name across subclasses', () => {
			class SubclassA extends ExecutionBaseError {}
			class SubclassB extends ExecutionBaseError {}
			fc.assert(
				fc.property(fc.constantFrom(SubclassA, SubclassB), (subclass) => {
					const error = new subclass('m');
					expect(error.toJSON?.()?.name).toBe(error.name);
				}),
			);
		});
	});

	describe('inheritance', () => {
		it('is an instance of Error', () => {
			const error = new TestExecutionError('m');
			expect(error).toBeInstanceOf(Error);
		});

		it('is an instance of ExecutionBaseError', () => {
			const error = new TestExecutionError('m');
			expect(error).toBeInstanceOf(ExecutionBaseError);
		});
	});
});
