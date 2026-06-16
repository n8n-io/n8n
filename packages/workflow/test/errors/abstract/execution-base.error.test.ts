import fc from 'fast-check';

import { ExecutionBaseError } from '../../../src/errors/abstract/execution-base.error';
import type { IDataObject, JsonObject } from '../../../src/interfaces';

class TestError extends ExecutionBaseError {}

class OtherTestError extends ExecutionBaseError {}

describe('ExecutionBaseError', () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: new Date('2025-01-02T03:04:05.000Z') });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('constructor — message propagation', () => {
		it('passes message through to the Error super (Error.message)', () => {
			const error = new TestError('hello world');
			expect(error.message).toBe('hello world');
		});

		it('property: any message string is preserved verbatim on the instance', () => {
			fc.assert(
				fc.property(fc.string(), (msg) => {
					const error = new TestError(msg);
					expect(error.message).toBe(msg);
				}),
			);
		});
	});

	describe('constructor — name is set from constructor.name', () => {
		it('sets name to the concrete subclass name (not "Error")', () => {
			const error = new TestError('m');
			expect(error.name).toBe('TestError');
			expect(error.name).not.toBe('Error');
			expect(error.name).not.toBe('ExecutionBaseError');
		});

		it('two different subclasses get two different names', () => {
			const a = new TestError('m');
			const b = new OtherTestError('m');
			expect(a.name).toBe('TestError');
			expect(b.name).toBe('OtherTestError');
			expect(a.name).not.toEqual(b.name);
		});
	});

	describe('constructor — timestamp', () => {
		it('captures Date.now() into timestamp', () => {
			const now = new Date('2025-06-15T10:00:00.000Z').getTime();
			vi.setSystemTime(now);

			const error = new TestError('m');
			expect(error.timestamp).toBe(now);
		});

		it('timestamp advances when system time advances between instantiations', () => {
			vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
			const first = new TestError('m');

			vi.setSystemTime(new Date('2025-01-01T00:00:01.000Z'));
			const second = new TestError('m');

			expect(second.timestamp).toBeGreaterThan(first.timestamp);
			expect(second.timestamp - first.timestamp).toBe(1000);
		});

		it('timestamp is a finite number, not undefined or NaN', () => {
			const error = new TestError('m');
			expect(typeof error.timestamp).toBe('number');
			expect(Number.isFinite(error.timestamp)).toBe(true);
		});
	});

	describe('constructor — defaults', () => {
		it('initializes context to an empty object when no cause provided', () => {
			const error = new TestError('m');
			expect(error.context).toEqual({});
		});

		it('leaves cause undefined when no cause is provided', () => {
			const error = new TestError('m');
			expect(error.cause).toBeUndefined();
		});

		it('leaves errorResponse undefined when not provided', () => {
			const error = new TestError('m');
			expect(error.errorResponse).toBeUndefined();
		});

		it('defaults functionality to "regular"', () => {
			const error = new TestError('m');
			expect(error.functionality).toBe('regular');
		});

		it('lineNumber is undefined by default', () => {
			const error = new TestError('m');
			expect(error.lineNumber).toBeUndefined();
		});
	});

	describe('constructor — cause is an ExecutionBaseError (re-wrap branch)', () => {
		it('inherits context by reference from the cause', () => {
			const inner = new TestError('inner');
			inner.context = { foo: 'bar', n: 42 };

			const outer = new TestError('outer', { cause: inner });
			expect(outer.context).toBe(inner.context);
			expect(outer.context).toEqual({ foo: 'bar', n: 42 });
		});

		it('uses the cause.context object (mutating one is visible on the other)', () => {
			const inner = new TestError('inner');
			inner.context.shared = 'before';

			const outer = new TestError('outer', { cause: inner });
			inner.context.shared = 'after';

			expect(outer.context.shared).toBe('after');
		});

		it('inherits context even across different ExecutionBaseError subclasses', () => {
			const inner = new OtherTestError('inner');
			inner.context = { k: 'v' };

			const outer = new TestError('outer', { cause: inner });
			expect(outer.context).toEqual({ k: 'v' });
		});

		it('does NOT assign cause field when cause is an ExecutionBaseError', () => {
			// The else-if branch is mutually exclusive with the ExecutionBaseError branch.
			// When the cause is an ExecutionBaseError, this.cause is NOT assigned by this class —
			// the field declaration `override cause?: Error` re-initializes it to undefined post-super.
			const inner = new TestError('inner');
			const outer = new TestError('outer', { cause: inner });
			expect(outer.cause).toBeUndefined();
		});

		it('starts with empty context but inherits non-empty context only when cause is set', () => {
			const noCause = new TestError('m');
			expect(noCause.context).toEqual({});

			const withCause = new TestError('m', { cause: new TestError('c') });
			// New empty Execution error has empty context, so child also has empty (by reference).
			expect(withCause.context).toEqual({});
		});

		it('property: arbitrary context payloads propagate to the rewrap', () => {
			const contextArb: fc.Arbitrary<IDataObject> = fc.dictionary(
				fc.string({ minLength: 1, maxLength: 6 }),
				fc.oneof(fc.string(), fc.integer(), fc.boolean()),
				{ maxKeys: 5 },
			);
			fc.assert(
				fc.property(contextArb, fc.string(), fc.string(), (ctx, msgInner, msgOuter) => {
					const inner = new TestError(msgInner);
					inner.context = { ...ctx };
					const outer = new TestError(msgOuter, { cause: inner });
					expect(outer.context).toEqual(inner.context);
				}),
			);
		});
	});

	describe('constructor — cause is a plain Error (not ExecutionBaseError)', () => {
		it('does NOT copy context from a plain Error cause', () => {
			const cause = new Error('boom');
			const error = new TestError('m', { cause });
			// context stays at its default empty object — plain Error has no context to copy.
			expect(error.context).toEqual({});
		});

		it('this.cause is undefined for a plain Error cause (no branch assigns it)', () => {
			// Branch: `cause instanceof ExecutionBaseError` → false
			// Branch: `cause && !(cause instanceof Error)` → false (Error IS an Error)
			// → Neither branch runs; the `override cause?: Error` field declaration
			// re-initializes the property to undefined after super().
			const cause = new Error('boom');
			const error = new TestError('m', { cause });
			expect(error.cause).toBeUndefined();
		});

		it('property: any plain Error cause leaves context as empty {}', () => {
			fc.assert(
				fc.property(fc.string(), fc.string(), (msg, causeMsg) => {
					const cause = new Error(causeMsg);
					const error = new TestError(msg, { cause });
					expect(error.context).toEqual({});
				}),
			);
		});
	});

	describe('constructor — cause is non-Error (the else-if assignment branch)', () => {
		it('assigns a string cause directly to this.cause', () => {
			// Forced via cast — runtime allows it even though the type says Error.
			const error = new TestError('m', { cause: 'a string cause' as unknown as Error });
			expect(error.cause).toBe('a string cause');
		});

		it('assigns an object literal cause directly to this.cause', () => {
			const causeObj = { code: 500, info: 'oops' };
			const error = new TestError('m', { cause: causeObj as unknown as Error });
			expect(error.cause).toBe(causeObj);
		});

		it('assigns a number cause directly to this.cause', () => {
			const error = new TestError('m', { cause: 42 as unknown as Error });
			expect(error.cause).toBe(42);
		});

		it('non-Error causes leave context at the default empty {}', () => {
			const error = new TestError('m', { cause: { foo: 'bar' } as unknown as Error });
			expect(error.context).toEqual({});
		});

		it('property: arbitrary truthy non-Error cause values are stored as-is', () => {
			// The constructor guards with `cause && !(cause instanceof Error)`, so only
			// truthy non-Error values flow into `this.cause = cause`. Falsy values are
			// covered by the dedicated short-circuit test below.
			const nonErrorArb = fc.oneof(
				fc.string({ minLength: 1 }),
				fc.integer({ min: 1 }),
				fc.constant(true),
				fc.record({ code: fc.integer() }),
			);
			fc.assert(
				fc.property(nonErrorArb, fc.string(), (cause, msg) => {
					const error = new TestError(msg, { cause: cause as unknown as Error });
					expect(error.cause).toBe(cause);
				}),
			);
		});

		it('falsy non-Error causes (0, "") do NOT trigger the assignment (short-circuit on cause &&)', () => {
			// The condition is `cause && !(cause instanceof Error)`. Falsy `cause` short-circuits to false,
			// so this.cause is whatever super() set (undefined for falsy values).
			const errZero = new TestError('m', { cause: 0 as unknown as Error });
			expect(errZero.cause).toBeUndefined();

			const errEmpty = new TestError('m', { cause: '' as unknown as Error });
			expect(errEmpty.cause).toBeUndefined();
		});

		it('null cause is treated as no cause', () => {
			const error = new TestError('m', { cause: null as unknown as Error });
			expect(error.cause).toBeUndefined();
		});
	});

	describe('constructor — errorResponse', () => {
		it('assigns errorResponse when provided', () => {
			const errorResponse: JsonObject = { status: 'failed', code: 500 };
			const error = new TestError('m', { errorResponse });
			expect(error.errorResponse).toBe(errorResponse);
		});

		it('does NOT assign errorResponse when undefined', () => {
			const error = new TestError('m', { errorResponse: undefined });
			expect(error.errorResponse).toBeUndefined();
		});

		it('does NOT assign errorResponse when omitted', () => {
			const error = new TestError('m');
			expect(error.errorResponse).toBeUndefined();
		});

		it('property: any truthy JsonObject errorResponse is assigned by reference', () => {
			const jsonObjArb: fc.Arbitrary<JsonObject> = fc.dictionary(
				fc.string({ minLength: 1, maxLength: 4 }),
				fc.oneof(fc.string(), fc.integer(), fc.boolean()),
				{ minKeys: 1, maxKeys: 3 },
			);
			fc.assert(
				fc.property(jsonObjArb, fc.string(), (resp, msg) => {
					const error = new TestError(msg, { errorResponse: resp });
					expect(error.errorResponse).toBe(resp);
				}),
			);
		});

		it('errorResponse and cause can coexist independently', () => {
			const cause = new TestError('inner');
			cause.context = { src: 'inner' };
			const errorResponse: JsonObject = { ok: false };

			const error = new TestError('m', { cause, errorResponse });
			expect(error.errorResponse).toBe(errorResponse);
			expect(error.context).toBe(cause.context);
		});
	});

	describe('toJSON', () => {
		it('is defined on the instance', () => {
			const error = new TestError('m');
			expect(typeof error.toJSON).toBe('function');
		});

		it('returns exactly the documented seven fields and no others', () => {
			const error = new TestError('the message');
			const json = error.toJSON!();
			expect(Object.keys(json).sort()).toEqual(
				['cause', 'context', 'description', 'lineNumber', 'message', 'name', 'timestamp'].sort(),
			);
		});

		it('reflects message, name, timestamp, context, lineNumber, description, cause', () => {
			vi.setSystemTime(new Date('2025-03-04T05:06:07.000Z'));
			const causeValue = { detail: 'boom' };
			const error = new TestError('the message', {
				cause: causeValue as unknown as Error,
			});
			error.description = 'extra info';
			error.lineNumber = 17;
			error.context.k = 'v';

			const json = error.toJSON!();
			expect(json).toEqual({
				message: 'the message',
				name: 'TestError',
				timestamp: new Date('2025-03-04T05:06:07.000Z').getTime(),
				context: { k: 'v' },
				lineNumber: 17,
				description: 'extra info',
				cause: causeValue,
			});
		});

		it('reflects null/undefined description faithfully (not omitted)', () => {
			const error = new TestError('m');
			error.description = null;
			const json = error.toJSON!();
			expect('description' in json).toBe(true);
			expect(json.description).toBeNull();

			error.description = undefined;
			const json2 = error.toJSON!();
			expect('description' in json2).toBe(true);
			expect(json2.description).toBeUndefined();
		});

		it('serializes after mutation — context updates are reflected on each call', () => {
			const error = new TestError('m');
			error.context.first = 1;
			const json1 = error.toJSON!();
			expect(json1.context).toEqual({ first: 1 });

			error.context.second = 2;
			const json2 = error.toJSON!();
			expect(json2.context).toEqual({ first: 1, second: 2 });
		});

		it('property: toJSON.message and .name always match instance fields', () => {
			fc.assert(
				fc.property(fc.string(), (msg) => {
					const error = new TestError(msg);
					const json = error.toJSON!();
					expect(json.message).toBe(error.message);
					expect(json.name).toBe(error.name);
					expect(json.timestamp).toBe(error.timestamp);
					expect(json.context).toBe(error.context);
					expect(json.lineNumber).toBe(error.lineNumber);
					expect(json.description).toBe(error.description);
					expect(json.cause).toBe(error.cause);
				}),
			);
		});

		it('toJSON.cause is undefined when cause is an ExecutionBaseError (only context is copied)', () => {
			const inner = new TestError('inner');
			const outer = new TestError('outer', { cause: inner });
			expect(outer.toJSON!().cause).toBeUndefined();
		});

		it('toJSON.cause reflects a non-Error cause value', () => {
			const error = new TestError('m', { cause: { x: 1 } as unknown as Error });
			expect(error.toJSON!().cause).toEqual({ x: 1 });
		});
	});

	describe('inheritance contract', () => {
		it('is an Error', () => {
			const error = new TestError('m');
			expect(error).toBeInstanceOf(Error);
		});

		it('is an ExecutionBaseError', () => {
			const error = new TestError('m');
			expect(error).toBeInstanceOf(ExecutionBaseError);
		});

		it('has level "error" by default (inherited from ApplicationError)', () => {
			const error = new TestError('m');
			expect(error.level).toBe('error');
		});

		it('forwards level option through to super', () => {
			const error = new TestError('m', { level: 'warning' });
			expect(error.level).toBe('warning');
		});
	});
});
