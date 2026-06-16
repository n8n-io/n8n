import { ApplicationError } from '@n8n/errors';
import fc from 'fast-check';

import { ExecutionBaseError } from '../../../src/errors/abstract/execution-base.error';
import type { JsonObject } from '../../../src/interfaces';

class ConcreteExecutionError extends ExecutionBaseError {}

class AnotherConcreteExecutionError extends ExecutionBaseError {}

describe('ExecutionBaseError', () => {
	const fixedNow = 1_700_000_000_000;

	beforeEach(() => {
		vi.useFakeTimers({ now: fixedNow });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('inheritance', () => {
		it('is an instance of ApplicationError, Error and ExecutionBaseError', () => {
			const error = new ConcreteExecutionError('boom');
			expect(error).toBeInstanceOf(ConcreteExecutionError);
			expect(error).toBeInstanceOf(ExecutionBaseError);
			expect(error).toBeInstanceOf(ApplicationError);
			expect(error).toBeInstanceOf(Error);
		});
	});

	describe('default property values', () => {
		it('initialises context to an empty plain object', () => {
			const error = new ConcreteExecutionError('boom');
			expect(error.context).toEqual({});
			// Identity guard: a fresh literal, not a shared reference
			expect(Object.keys(error.context)).toHaveLength(0);
			expect(Object.getPrototypeOf(error.context)).toBe(Object.prototype);
		});

		it("sets functionality to the literal string 'regular'", () => {
			const error = new ConcreteExecutionError('boom');
			expect(error.functionality).toBe('regular');
			expect(error.functionality).toHaveLength('regular'.length);
		});

		it('leaves description, lineNumber, errorResponse and cause undefined by default', () => {
			const error = new ConcreteExecutionError('boom');
			expect(error.description).toBeUndefined();
			expect(error.lineNumber).toBeUndefined();
			expect(error.errorResponse).toBeUndefined();
			expect(error.cause).toBeUndefined();
		});

		it('preserves the message passed to the constructor', () => {
			const error = new ConcreteExecutionError('something went wrong');
			expect(error.message).toBe('something went wrong');
		});
	});

	describe('name is taken from the concrete subclass constructor', () => {
		it('reflects the concrete subclass name (not a hardcoded literal)', () => {
			const a = new ConcreteExecutionError('a');
			const b = new AnotherConcreteExecutionError('b');
			expect(a.name).toBe('ConcreteExecutionError');
			expect(b.name).toBe('AnotherConcreteExecutionError');
			expect(a.name).not.toBe(b.name);
			// guards against `this.name = this.constructor.name` becoming `this.name = ''`
			expect(a.name.length).toBeGreaterThan(0);
		});

		it('property: any concrete subclass uses its own class name', () => {
			fc.assert(
				fc.property(
					fc.stringMatching(/^[A-Z][A-Za-z0-9]{0,20}$/),
					fc.string(),
					(className, message) => {
						const SubClass = {
							[className]: class extends ExecutionBaseError {},
						}[className];
						const error = new SubClass(message);
						expect(error.name).toBe(className);
					},
				),
			);
		});
	});

	describe('timestamp is set from Date.now() at construction time', () => {
		it('captures the current value of Date.now() (not 0)', () => {
			const error = new ConcreteExecutionError('boom');
			expect(error.timestamp).toBe(fixedNow);
			expect(error.timestamp).not.toBe(0);
		});

		it('reflects time advancement between two constructions', () => {
			const first = new ConcreteExecutionError('first');
			vi.advanceTimersByTime(5_000);
			const second = new ConcreteExecutionError('second');
			expect(first.timestamp).toBe(fixedNow);
			expect(second.timestamp).toBe(fixedNow + 5_000);
			expect(second.timestamp - first.timestamp).toBe(5_000);
		});

		it('property: timestamp always equals Date.now() at construction time', () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 10_000_000 }), (offset) => {
					vi.setSystemTime(fixedNow + offset);
					const error = new ConcreteExecutionError('boom');
					expect(error.timestamp).toBe(fixedNow + offset);
				}),
			);
		});
	});

	describe('cause that is an ExecutionBaseError instance', () => {
		it('inherits the cause context by reference', () => {
			const cause = new ConcreteExecutionError('cause');
			cause.context = { workflowId: 'wf-1', extra: 42 };

			const error = new ConcreteExecutionError('wrap', { cause });

			expect(error.context).toBe(cause.context);
			expect(error.context).toEqual({ workflowId: 'wf-1', extra: 42 });
		});

		it('inherits an empty context when the cause has not populated one', () => {
			const cause = new ConcreteExecutionError('cause');
			const error = new ConcreteExecutionError('wrap', { cause });
			expect(error.context).toBe(cause.context);
		});

		it('mutating the wrapped context reflects in the cause (shared reference)', () => {
			const cause = new ConcreteExecutionError('cause');
			cause.context = { initial: true };
			const error = new ConcreteExecutionError('wrap', { cause });
			error.context.added = 'yes';
			expect(cause.context).toEqual({ initial: true, added: 'yes' });
		});

		it('does not assign the ExecutionBaseError cause to this.cause (only context is inherited)', () => {
			const cause = new ConcreteExecutionError('cause');
			const error = new ConcreteExecutionError('wrap', { cause });
			// The class-field declaration `override cause?: Error` re-initialises
			// `this.cause` to undefined after super(); the ExecutionBaseError branch
			// in the constructor body intentionally only assigns context.
			expect(error.cause).toBeUndefined();
		});
	});

	describe('cause that is a generic Error instance', () => {
		it('does not inherit any context from the cause', () => {
			const cause = new Error('plain error');
			const error = new ConcreteExecutionError('wrap', { cause });

			expect(error.context).toEqual({});
			// must remain a fresh, owned object — not the cause itself
			expect(error.context).not.toBe(cause);
		});

		it('does not assign a generic Error cause to this.cause', () => {
			// `cause instanceof Error` is true, so the non-Error branch is skipped.
			// The `override cause?: Error` field initialiser leaves this.cause undefined.
			const cause = new Error('plain error');
			const error = new ConcreteExecutionError('wrap', { cause });
			expect(error.cause).toBeUndefined();
		});
	});

	describe('cause that is not an Error at all', () => {
		it('sets cause when given a plain object via the non-Error branch', () => {
			const causeObj = { foo: 'bar' } as unknown as Error;
			const error = new ConcreteExecutionError('wrap', { cause: causeObj });
			expect(error.cause).toBe(causeObj);
			expect(error.context).toEqual({});
		});

		it('sets cause when given a string', () => {
			const error = new ConcreteExecutionError('wrap', {
				cause: 'literal-string-cause' as unknown as Error,
			});
			expect(error.cause).toBe('literal-string-cause');
		});

		it('sets cause when given a number', () => {
			const error = new ConcreteExecutionError('wrap', { cause: 42 as unknown as Error });
			expect(error.cause).toBe(42);
		});
	});

	describe('cause omitted', () => {
		it('leaves cause undefined when no options are provided', () => {
			const error = new ConcreteExecutionError('boom');
			expect(error.cause).toBeUndefined();
			expect(error.context).toEqual({});
		});

		it('leaves cause undefined when options has no cause', () => {
			const error = new ConcreteExecutionError('boom', {});
			expect(error.cause).toBeUndefined();
		});
	});

	describe('errorResponse', () => {
		it('assigns the provided errorResponse reference when truthy', () => {
			const errorResponse: JsonObject = { status: 'error', code: 500 };
			const error = new ConcreteExecutionError('boom', { errorResponse });
			expect(error.errorResponse).toBe(errorResponse);
		});

		it('leaves errorResponse undefined when omitted', () => {
			const error = new ConcreteExecutionError('boom', {});
			expect(error.errorResponse).toBeUndefined();
		});

		it('leaves errorResponse undefined when explicitly undefined', () => {
			const error = new ConcreteExecutionError('boom', { errorResponse: undefined });
			expect(error.errorResponse).toBeUndefined();
		});

		it('does not assign errorResponse when it is a falsy value coerced through the type', () => {
			// `if (errorResponse)` guards against null/undefined — null must not be assigned
			const error = new ConcreteExecutionError('boom', {
				errorResponse: null as unknown as JsonObject,
			});
			expect(error.errorResponse).toBeUndefined();
		});

		it('property: any truthy errorResponse object is assigned by identity', () => {
			fc.assert(
				fc.property(
					fc.dictionary(fc.string({ minLength: 1 }), fc.oneof(fc.string(), fc.integer())),
					(payload) => {
						const errorResponse = payload as JsonObject;
						const error = new ConcreteExecutionError('m', { errorResponse });
						expect(error.errorResponse).toBe(errorResponse);
					},
				),
			);
		});
	});

	describe('toJSON', () => {
		it('is defined as a method', () => {
			const error = new ConcreteExecutionError('boom');
			expect(typeof error.toJSON).toBe('function');
		});

		it('returns exactly the documented keys', () => {
			const error = new ConcreteExecutionError('boom');
			const json = error.toJSON!();
			expect(Object.keys(json).sort()).toEqual(
				['cause', 'context', 'description', 'lineNumber', 'message', 'name', 'timestamp'].sort(),
			);
		});

		it('reflects the current values of the error fields', () => {
			const causeValue = { custom: 'cause' } as unknown as Error;
			const error = new ConcreteExecutionError('boom', { cause: causeValue });
			error.description = 'a description';
			error.lineNumber = 7;
			error.context = { key: 'value' };

			const json = error.toJSON!();

			expect(json.message).toBe('boom');
			expect(json.name).toBe('ConcreteExecutionError');
			expect(json.timestamp).toBe(fixedNow);
			expect(json.description).toBe('a description');
			expect(json.lineNumber).toBe(7);
			expect(json.context).toBe(error.context);
			expect(json.cause).toBe(causeValue);
		});

		it('does not leak non-serialised fields such as errorResponse, functionality, tags', () => {
			const errorResponse: JsonObject = { x: 1 };
			const error = new ConcreteExecutionError('boom', { errorResponse });
			const json = error.toJSON!();
			expect(json).not.toHaveProperty('errorResponse');
			expect(json).not.toHaveProperty('functionality');
			expect(json).not.toHaveProperty('tags');
			expect(json).not.toHaveProperty('level');
		});

		it('returns null cause when no cause was provided', () => {
			const error = new ConcreteExecutionError('boom');
			const json = error.toJSON!();
			expect(json.cause).toBeUndefined();
		});

		it('reflects context by reference (mutations after toJSON propagate when accessed via the returned ref)', () => {
			const error = new ConcreteExecutionError('boom');
			error.context = { initial: true };
			const json = error.toJSON!();
			expect(json.context).toBe(error.context);
		});

		it('property: name in JSON tracks the concrete subclass for any subclass', () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[A-Z][A-Za-z0-9]{0,15}$/), (className) => {
					const SubClass = {
						[className]: class extends ExecutionBaseError {},
					}[className];
					const error = new SubClass('m');
					expect(error.toJSON!().name).toBe(className);
				}),
			);
		});
	});

	describe('metamorphic: identity invariants', () => {
		it('two distinct instances do not share a context object by default', () => {
			const a = new ConcreteExecutionError('a');
			const b = new ConcreteExecutionError('b');
			expect(a.context).not.toBe(b.context);
		});

		it('errorResponse is preserved by identity (not cloned)', () => {
			const errorResponse: JsonObject = { foo: 'bar' };
			const error = new ConcreteExecutionError('m', { errorResponse });
			errorResponse.foo = 'baz';
			expect((error.errorResponse as JsonObject).foo).toBe('baz');
		});

		it('context inheritance is by reference (chain of ExecutionBaseError causes)', () => {
			const root = new ConcreteExecutionError('root');
			root.context = { rootKey: 'root' };
			const middle = new ConcreteExecutionError('middle', { cause: root });
			const top = new ConcreteExecutionError('top', { cause: middle });
			expect(middle.context).toBe(root.context);
			expect(top.context).toBe(root.context);
			expect(top.context).toEqual({ rootKey: 'root' });
		});
	});
});
