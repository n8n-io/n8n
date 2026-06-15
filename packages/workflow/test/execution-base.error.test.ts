import fc from 'fast-check';

import { ExecutionBaseError } from '../src/errors/abstract/execution-base.error';

// Two concrete subclasses give us distinct `constructor.name` values so we can
// pin the `this.name = this.constructor.name` behaviour rather than asserting
// against a single hard-coded string.
class FirstExecutionError extends ExecutionBaseError {}
class SecondExecutionError extends ExecutionBaseError {}

// Convenience: `toJSON` is declared as an optional method, but it always
// exists at runtime — this helper lets each test call it without scattering
// non-null assertions through every assertion site.
const toJson = (instance: ExecutionBaseError) => {
	const json = instance.toJSON?.();
	if (json === undefined) {
		throw new Error('toJSON() returned undefined — body was emptied by a mutation');
	}
	return json;
};

describe('ExecutionBaseError', () => {
	describe('inheritance', () => {
		it('is an Error subclass', () => {
			const error = new FirstExecutionError('boom');

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ExecutionBaseError);
			expect(error).toBeInstanceOf(FirstExecutionError);
		});
	});

	describe('constructor — message + name', () => {
		it('forwards the message argument unchanged for any string', () => {
			fc.assert(
				fc.property(fc.string(), (msg) => {
					const error = new FirstExecutionError(msg);
					expect(error.message).toBe(msg);
				}),
			);
		});

		it('sets `name` to the subclass constructor name', () => {
			const first = new FirstExecutionError('a');
			const second = new SecondExecutionError('b');

			expect(first.name).toBe('FirstExecutionError');
			expect(second.name).toBe('SecondExecutionError');
			expect(first.name).not.toBe(second.name);
		});

		it('does not leave `name` as the inherited "Error" default', () => {
			// Kills mutations that delete `this.name = this.constructor.name`.
			const error = new FirstExecutionError('msg');
			expect(error.name).not.toBe('Error');
		});
	});

	describe('constructor — timestamp', () => {
		it('is a finite number set from Date.now()', () => {
			const before = Date.now();
			const error = new FirstExecutionError('msg');
			const after = Date.now();

			expect(typeof error.timestamp).toBe('number');
			expect(Number.isFinite(error.timestamp)).toBe(true);
			expect(error.timestamp).toBeGreaterThanOrEqual(before);
			expect(error.timestamp).toBeLessThanOrEqual(after);
		});

		it('uses a non-zero, recent value (rules out constants like 0 or 1)', () => {
			// Kills mutations that replace Date.now() with a constant numeric
			// literal (Stryker's default-number mutator).
			const error = new FirstExecutionError('msg');
			expect(error.timestamp).toBeGreaterThan(1_700_000_000_000); // > 2023-11-14
		});

		it('respects monotonically non-decreasing wall clock between two instances', () => {
			const a = new FirstExecutionError('a');
			const b = new FirstExecutionError('b');
			expect(b.timestamp).toBeGreaterThanOrEqual(a.timestamp);
		});
	});

	describe('constructor — defaults', () => {
		it('uses a fresh empty object for `context` per instance (not a shared default)', () => {
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

		it('defaults `functionality` to the exact string "regular"', () => {
			const error = new FirstExecutionError('msg');
			expect(error.functionality).toBe('regular');
		});

		it('leaves `description`, `cause`, `errorResponse`, and `lineNumber` undefined when no options are passed', () => {
			const error = new FirstExecutionError('msg');

			expect(error.description).toBeUndefined();
			expect(error.cause).toBeUndefined();
			expect(error.errorResponse).toBeUndefined();
			expect(error.lineNumber).toBeUndefined();
		});

		it('tolerates an explicit empty options object identically to no options', () => {
			const a = new FirstExecutionError('msg');
			const b = new FirstExecutionError('msg', {});

			expect(b.context).toEqual(a.context);
			expect(b.functionality).toBe(a.functionality);
			expect(b.cause).toBe(a.cause);
			expect(b.errorResponse).toBe(a.errorResponse);
		});
	});

	describe('constructor — cause handling', () => {
		it('when cause is an ExecutionBaseError, copies its `context` BY REFERENCE', () => {
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

		it('when cause is a plain Error (not ExecutionBaseError), context stays a FRESH empty object', () => {
			const plain = new Error('plain');
			(plain as unknown as { context: unknown }).context = { tainted: true };

			const wrapper = new FirstExecutionError('wrap', { cause: plain });

			// Kills the conditional-flip mutation on `cause instanceof ExecutionBaseError`:
			// if flipped, this branch would read `plain.context` (the tainted one).
			expect(wrapper.context).toEqual({});
			expect((wrapper.context as { tainted?: boolean }).tainted).toBeUndefined();
			expect(wrapper.context).not.toBe((plain as unknown as { context: unknown }).context);
		});

		it('when cause is an ExecutionBaseError, `this.cause` remains undefined (the cause-assignment branch is skipped)', () => {
			// The `override cause?: Error` class field declaration emits a
			// defineProperty that overwrites whatever super set, so the only way
			// `this.cause` ends up non-undefined is through the explicit else-if
			// branch — which doesn't fire for Error causes.
			const inner = new FirstExecutionError('inner');
			const outer = new FirstExecutionError('outer', { cause: inner });

			expect(outer.cause).toBeUndefined();
		});

		it('when cause is a plain Error, `this.cause` remains undefined (the assignment branch is skipped)', () => {
			const plain = new Error('plain');
			const wrapper = new FirstExecutionError('wrap', { cause: plain });

			expect(wrapper.cause).toBeUndefined();
		});

		it('when cause is a non-Error truthy value, assigns it to `this.cause`', () => {
			// This is the only branch that actually populates `this.cause`.
			// Bypass the typing to exercise the runtime contract.
			const fakeCause = { message: 'I look like an error', custom: 1 } as unknown as Error;
			const wrapper = new FirstExecutionError('wrap', { cause: fakeCause });

			expect(wrapper.cause).toBe(fakeCause);
		});

		it('non-Error truthy causes do NOT trigger the context-copy branch', () => {
			const fakeCause = { context: { leaked: true } } as unknown as Error;
			const wrapper = new FirstExecutionError('wrap', { cause: fakeCause });

			expect(wrapper.context).toEqual({});
			expect(wrapper.cause).toBe(fakeCause);
		});

		it('falsy non-Error causes (0, empty string) are NOT assigned to `this.cause`', () => {
			// Kills mutations that flip the `cause && ...` guard to `cause || ...`,
			// which would let falsy values reach `this.cause = cause`.
			const a = new FirstExecutionError('a', { cause: 0 as unknown as Error });
			const b = new FirstExecutionError('b', { cause: '' as unknown as Error });

			expect(a.cause).toBeUndefined();
			expect(b.cause).toBeUndefined();
		});

		it('property: ExecutionBaseError cause copies context reference for any context shape', () => {
			fc.assert(
				fc.property(
					fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
					(ctx) => {
						const inner = new FirstExecutionError('inner');
						inner.context = { ...ctx };

						const outer = new FirstExecutionError('outer', { cause: inner });

						expect(outer.context).toBe(inner.context);
					},
				),
			);
		});

		it('property: plain-Error cause always yields a fresh empty context', () => {
			fc.assert(
				fc.property(fc.string(), (msg) => {
					const plain = new Error(msg);
					const wrapper = new FirstExecutionError('wrap', { cause: plain });

					expect(wrapper.context).toEqual({});
				}),
			);
		});
	});

	describe('constructor — errorResponse handling', () => {
		it('assigns the errorResponse object by reference when provided', () => {
			const response = { code: 500, details: 'oops', nested: { ok: false } };
			const error = new FirstExecutionError('msg', { errorResponse: response });

			expect(error.errorResponse).toBe(response);
			expect(error.errorResponse).toEqual({ code: 500, details: 'oops', nested: { ok: false } });
		});

		it('leaves errorResponse undefined when the options object omits it', () => {
			const error = new FirstExecutionError('msg', { cause: new Error('x') });
			expect(error.errorResponse).toBeUndefined();
		});

		it('leaves errorResponse undefined when explicitly undefined', () => {
			const error = new FirstExecutionError('msg', { errorResponse: undefined });
			expect(error.errorResponse).toBeUndefined();
		});

		it('property: any JSON-like errorResponse object is preserved by reference', () => {
			fc.assert(
				fc.property(
					fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
					(response) => {
						const error = new FirstExecutionError('msg', { errorResponse: response });
						expect(error.errorResponse).toBe(response);
					},
				),
			);
		});

		it('does not consume cause when only errorResponse is set', () => {
			const error = new FirstExecutionError('msg', { errorResponse: { x: 1 } });
			expect(error.cause).toBeUndefined();
			expect(error.context).toEqual({});
		});
	});

	describe('toJSON()', () => {
		it('returns an object (not undefined) — body is non-empty', () => {
			const error = new FirstExecutionError('msg');
			const json = toJson(error);

			expect(json).toBeDefined();
			expect(typeof json).toBe('object');
		});

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

		it('mirrors every live property on the instance', () => {
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

			// Also pin defaults for a barebones instance.
			expect(toJson(bare).cause).toBeUndefined();
		});

		it('serialises a default instance with the expected null/undefined values', () => {
			const error = new FirstExecutionError('plain');
			const json = toJson(error);

			expect(json).toEqual({
				message: 'plain',
				lineNumber: undefined,
				timestamp: error.timestamp,
				name: 'FirstExecutionError',
				description: undefined,
				context: error.context,
				cause: undefined,
			});
		});

		it('reflects post-construction property mutations', () => {
			// Pins that the keys read from `this.*` and aren't frozen at
			// construction time.
			const error = new FirstExecutionError('msg');
			expect(toJson(error).lineNumber).toBeUndefined();

			error.lineNumber = 7;
			error.description = 'late';
			expect(toJson(error).lineNumber).toBe(7);
			expect(toJson(error).description).toBe('late');
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
