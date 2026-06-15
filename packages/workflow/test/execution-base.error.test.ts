import fc from 'fast-check';

import { ExecutionBaseError } from '../src/errors/abstract/execution-base.error';

// Two concrete subclasses give us distinct `constructor.name` values so we can
// pin the `this.name = this.constructor.name` behaviour rather than asserting
// against a single hard-coded string.
class FirstExecutionError extends ExecutionBaseError {}
class SecondExecutionError extends ExecutionBaseError {}

const toJson = (instance: ExecutionBaseError) => {
	const json = instance.toJSON?.();
	if (json === undefined) {
		throw new Error('toJSON() returned undefined — body was emptied by a mutation');
	}
	return json;
};

describe('ExecutionBaseError', () => {
	describe('constructor', () => {
		it('sets `name` to the subclass constructor name', () => {
			const first = new FirstExecutionError('a');
			const second = new SecondExecutionError('b');

			expect(first.name).toBe('FirstExecutionError');
			expect(second.name).toBe('SecondExecutionError');
			expect(first.name).not.toBe(second.name);
		});

		it('sets `timestamp` to a value within the Date.now() bracket', () => {
			const before = Date.now();
			const error = new FirstExecutionError('msg');
			const after = Date.now();

			expect(typeof error.timestamp).toBe('number');
			expect(error.timestamp).toBeGreaterThanOrEqual(before);
			expect(error.timestamp).toBeLessThanOrEqual(after);
		});

		it('defaults `functionality` to "regular"', () => {
			const error = new FirstExecutionError('msg');
			expect(error.functionality).toBe('regular');
		});

		it('gives each instance a fresh empty `context` (no shared default)', () => {
			const a = new FirstExecutionError('a');
			const b = new FirstExecutionError('b');

			expect(a.context).toEqual({});
			expect(b.context).toEqual({});
			// Mutating one must not leak into the other — proves we don't share
			// a single module-level object as the default.
			a.context.shared = 'no';
			expect(b.context).toEqual({});
			expect(a.context).not.toBe(b.context);
		});
	});

	describe('cause handling', () => {
		it('copies `context` BY REFERENCE when cause is an ExecutionBaseError', () => {
			const inner = new FirstExecutionError('inner');
			inner.context = { source: 'inner', nested: { depth: 1 } };

			const outer = new FirstExecutionError('outer', { cause: inner });

			// Reference equality is the load-bearing invariant: a `{...inner.context}`
			// mutation would still satisfy `toEqual` but lose the share.
			expect(outer.context).toBe(inner.context);
			expect(outer.context).toEqual({ source: 'inner', nested: { depth: 1 } });
		});

		it('reference-share of context lets a mutation on the wrapper bleed into the cause', () => {
			const inner = new FirstExecutionError('inner');
			inner.context = { keep: 1 };

			const outer = new FirstExecutionError('outer', { cause: inner });
			outer.context.added = 2;

			expect(inner.context).toEqual({ keep: 1, added: 2 });
		});

		it('keeps `context` as a fresh empty object when cause is a plain Error', () => {
			const plain = new Error('plain');
			(plain as unknown as { context: unknown }).context = { tainted: true };

			const wrapper = new FirstExecutionError('wrap', { cause: plain });

			// Kills the conditional-flip mutation on `cause instanceof ExecutionBaseError`:
			// if flipped, this branch would read `plain.context` (the tainted one).
			expect(wrapper.context).toEqual({});
			expect(wrapper.context).not.toBe((plain as unknown as { context: unknown }).context);
		});

		it('leaves `this.cause` undefined when cause is an ExecutionBaseError', () => {
			// The `override cause?: Error` class field declaration emits a
			// defineProperty that overwrites whatever super set, so the only way
			// `this.cause` ends up non-undefined is through the explicit else-if
			// branch — which doesn't fire for Error causes.
			const inner = new FirstExecutionError('inner');
			const outer = new FirstExecutionError('outer', { cause: inner });

			expect(outer.cause).toBeUndefined();
		});

		it('leaves `this.cause` undefined when cause is a plain Error', () => {
			const plain = new Error('plain');
			const wrapper = new FirstExecutionError('wrap', { cause: plain });

			expect(wrapper.cause).toBeUndefined();
		});

		it('assigns non-Error truthy causes to `this.cause` without copying context', () => {
			// This is the only branch that actually populates `this.cause`.
			// Bypass the typing to exercise the runtime contract.
			const fakeCause = {
				message: 'I look like an error',
				context: { leaked: true },
			} as unknown as Error;

			const wrapper = new FirstExecutionError('wrap', { cause: fakeCause });

			expect(wrapper.cause).toBe(fakeCause);
			// The context-copy branch must not fire for non-Error causes.
			expect(wrapper.context).toEqual({});
		});

		it('does not assign falsy non-Error causes (0, "") to `this.cause`', () => {
			// Kills mutations that flip the `cause && ...` guard to `cause || ...`,
			// which would let falsy values reach `this.cause = cause`.
			const a = new FirstExecutionError('a', { cause: 0 as unknown as Error });
			const b = new FirstExecutionError('b', { cause: '' as unknown as Error });

			expect(a.cause).toBeUndefined();
			expect(b.cause).toBeUndefined();
		});
	});

	describe('errorResponse handling', () => {
		it('assigns the errorResponse object by reference when provided', () => {
			const response = { code: 500, details: 'oops', nested: { ok: false } };
			const error = new FirstExecutionError('msg', { errorResponse: response });

			expect(error.errorResponse).toBe(response);
			expect(error.errorResponse).toEqual({ code: 500, details: 'oops', nested: { ok: false } });
		});
	});

	describe('toJSON()', () => {
		it('returns exactly these seven keys', () => {
			const error = new FirstExecutionError('msg');
			const json = toJson(error);

			expect(Object.keys(json).sort()).toEqual([
				'cause',
				'context',
				'description',
				'lineNumber',
				'message',
				'name',
				'timestamp',
			]);
		});

		it('reflects every live property on the instance', () => {
			const bare = new FirstExecutionError('outer');
			// Drive `this.cause` via the only branch that actually populates it
			// (non-Error truthy value) so we can assert toJSON forwards it.
			const cause = { fake: true } as unknown as Error;
			const populated = new FirstExecutionError('outer', { cause });
			populated.description = 'a description';
			populated.lineNumber = 42;
			populated.context = { trace: 'abc' };

			const json = toJson(populated);

			expect(json.message).toBe('outer');
			expect(json.name).toBe('FirstExecutionError');
			expect(json.description).toBe('a description');
			expect(json.lineNumber).toBe(42);
			expect(json.timestamp).toBe(populated.timestamp);
			expect(json.context).toBe(populated.context);
			expect(json.cause).toBe(cause);

			// Default cause stays undefined on a bare instance.
			expect(toJson(bare).cause).toBeUndefined();
		});

		it('returns context by identity (not a clone)', () => {
			const error = new FirstExecutionError('msg');
			const json = toJson(error);
			expect(json.context).toBe(error.context);
		});

		it('property: any message + lineNumber pair round-trips through toJSON', () => {
			fc.assert(
				fc.property(fc.string(), fc.integer(), (msg, lineNumber) => {
					const error = new FirstExecutionError(msg);
					error.lineNumber = lineNumber;

					const json = toJson(error);
					expect(json.message).toBe(msg);
					expect(json.lineNumber).toBe(lineNumber);
					expect(json.name).toBe('FirstExecutionError');
				}),
			);
		});
	});
});
