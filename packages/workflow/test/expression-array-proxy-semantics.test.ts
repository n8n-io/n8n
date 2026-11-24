// @vitest-environment jsdom

import * as Helpers from './helpers';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// Engine-parity tests for `$json` arrays beyond plain indexed access. Return
// values must match on both engines; mutation persistence intentionally
// diverges (see the isVm branches below).

describe('Expression — array proxy semantics (engine parity)', () => {
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
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const evaluate = (value: string, json: unknown) => {
		const data: INodeExecutionData[] = [{ json: json as INodeExecutionData['json'] }];
		return expression.getParameterValue(value, null, 0, 0, 'node', data, 'manual', {});
	};

	// Both engines reject property-descriptor access from inside an expression:
	// `getOwnPropertyDescriptor` is on the sanitizer's blocklist, so the
	// expression is rejected before evaluation. Documented so a future
	// divergence is caught; neither engine intends to expose the data this way.
	it('Object.getOwnPropertyDescriptor on $json properties is not exposed via expressions', () => {
		expect(() =>
			evaluate('={{ Object.getOwnPropertyDescriptor($json.arr, "0") }}', { arr: [10, 20, 30] }),
		).toThrow(/due to security concerns/);
	});

	it('spread syntax materialises the array via Symbol.iterator', () => {
		expect(evaluate('={{ [...$json.arr] }}', { arr: [10, 20, 30] })).toEqual([10, 20, 30]);
	});

	it('for…of iterates the array elements', () => {
		const expr =
			'={{ (() => { const out = []; for (const x of $json.arr) out.push(x); return out; })() }}';
		expect(evaluate(expr, { arr: [10, 20, 30] })).toEqual([10, 20, 30]);
	});

	it('toString returns the canonical comma-joined string (matches native Array)', () => {
		expect(evaluate('={{ $json.arr.toString() }}', { arr: [10, 20, 30] })).toBe('10,20,30');
	});

	it('implicit string coercion uses Array.prototype.toString', () => {
		expect(evaluate('={{ "items: " + $json.arr }}', { arr: [1, 2, 3] })).toBe('items: 1,2,3');
	});

	it('reverse returns a reversed copy without mutating a subsequent sibling read', () => {
		expect(evaluate('={{ [$json.arr.reverse(), $json.arr] }}', { arr: [1, 2, 3] })).toEqual([
			[3, 2, 1],
			[1, 2, 3],
		]);
	});

	it('reverse does not mutate a preceding sibling read', () => {
		expect(evaluate('={{ [$json.arr, $json.arr.reverse()] }}', { arr: [1, 2, 3] })).toEqual([
			[1, 2, 3],
			[3, 2, 1],
		]);
	});

	// Mutating array methods run natively on both engines. Return values are
	// identical; persistence intentionally diverges: the vm engine mutates an
	// evaluation-scoped copy (fixture untouched), the legacy engine writes
	// through to the underlying workflow data.
	describe('mutating array methods follow native semantics', () => {
		const isVm = process.env.N8N_EXPRESSION_ENGINE !== 'legacy';

		it('sort() returns the sorted array', () => {
			const json = { arr: ['Mango', 'Apple', 'Kiwi', 'Orange'] };
			const sorted = ['Apple', 'Kiwi', 'Mango', 'Orange'];
			expect(evaluate('={{ $json.arr.sort() }}', json)).toEqual(sorted);
			expect(json.arr).toEqual(isVm ? ['Mango', 'Apple', 'Kiwi', 'Orange'] : sorted);
		});

		it('sort() forwards the comparator', () => {
			const json = { arr: [3, 1, 10, 2] };
			expect(evaluate('={{ $json.arr.sort((a, b) => b - a) }}', json)).toEqual([10, 3, 2, 1]);
			expect(json.arr).toEqual(isVm ? [3, 1, 10, 2] : [10, 3, 2, 1]);
		});

		it('splice() returns the removed elements', () => {
			const json = { arr: ['Mango', 'Apple', 'Kiwi', 'Orange'] };
			expect(evaluate('={{ $json.arr.splice(0, 2) }}', json)).toEqual(['Mango', 'Apple']);
			expect(json.arr).toEqual(isVm ? ['Mango', 'Apple', 'Kiwi', 'Orange'] : ['Kiwi', 'Orange']);
		});

		it('fill() returns the filled array', () => {
			const json = { arr: ['Mango', 'Apple', 'Kiwi', 'Orange'] };
			const filled = ['X', 'X', 'Kiwi', 'Orange'];
			expect(evaluate('={{ $json.arr.fill("X", 0, 2) }}', json)).toEqual(filled);
			expect(json.arr).toEqual(isVm ? ['Mango', 'Apple', 'Kiwi', 'Orange'] : filled);
		});

		it('shift() returns the removed first element', () => {
			const json = { arr: ['Mango', 'Apple', 'Kiwi'] };
			expect(evaluate('={{ $json.arr.shift() }}', json)).toBe('Mango');
			expect(json.arr).toEqual(isVm ? ['Mango', 'Apple', 'Kiwi'] : ['Apple', 'Kiwi']);
		});

		it('unshift() returns the new length', () => {
			const json = { arr: ['Mango', 'Apple', 'Kiwi'] };
			expect(evaluate('={{ $json.arr.unshift("Peach", "Grape") }}', json)).toBe(5);
			expect(json.arr).toEqual(
				isVm ? ['Mango', 'Apple', 'Kiwi'] : ['Peach', 'Grape', 'Mango', 'Apple', 'Kiwi'],
			);
		});

		it('copyWithin() returns the copied-within array', () => {
			const json = { arr: ['Mango', 'Apple', 'Kiwi', 'Orange'] };
			const copied = ['Kiwi', 'Orange', 'Kiwi', 'Orange'];
			expect(evaluate('={{ $json.arr.copyWithin(0, 2, 4) }}', json)).toEqual(copied);
			expect(json.arr).toEqual(isVm ? ['Mango', 'Apple', 'Kiwi', 'Orange'] : copied);
		});

		it('mutation is visible to a subsequent sibling read', () => {
			const json = { arr: [3, 1, 2] };
			expect(evaluate('={{ (() => { $json.arr.sort(); return $json.arr[0]; })() }}', json)).toBe(1);
		});
	});

	// Registry extension names shadow natives on EVERY receiver the transformer
	// sees — including plain local arrays created inside the expression. These
	// pin native in-place semantics for local arrays so a copy-first shim can
	// never silently break them again (previously: sort on a local array was a
	// no-op copy, and a shift() drain loop never terminated).
	describe('local arrays keep native in-place mutation', () => {
		it('sort() mutates a local array in place', () => {
			expect(evaluate('={{ (() => { const a = [3, 1, 2]; a.sort(); return a; })() }}', {})).toEqual(
				[1, 2, 3],
			);
		});

		it('shift() drains a local array', () => {
			const expr =
				'={{ (() => { const a = ["x", "y", "z"]; const out = []; for (let i = 0; i < 5 && a.length > 0; i++) out.push(a.shift()); return out; })() }}';
			expect(evaluate(expr, {})).toEqual(['x', 'y', 'z']);
		});

		it('splice() mutates a local array in place', () => {
			expect(
				evaluate('={{ (() => { const a = [1, 2, 3, 4]; a.splice(1, 2); return a; })() }}', {}),
			).toEqual([1, 4]);
		});

		it('unshift() mutates a local array in place', () => {
			expect(
				evaluate('={{ (() => { const a = [2, 3]; a.unshift(1); return a; })() }}', {}),
			).toEqual([1, 2, 3]);
		});

		it('fill() mutates a local array in place', () => {
			expect(
				evaluate('={{ (() => { const a = [0, 0, 0]; a.fill(9, 0, 2); return a; })() }}', {}),
			).toEqual([9, 9, 0]);
		});

		it('mutating a spread copy of $json data works in place', () => {
			const json = { arr: [3, 1, 2] };
			expect(
				evaluate('={{ (() => { const a = [...$json.arr]; a.sort(); return a; })() }}', json),
			).toEqual([1, 2, 3]);
			expect(json.arr).toEqual([3, 1, 2]);
		});
	});

	// Direct writes on $json data. Both engines apply the write within the
	// evaluation; they intentionally diverge on persistence: the vm engine's
	// proxies are copy-on-write scoped to a single evaluation, while the legacy
	// engine writes through to the underlying workflow data (long-standing
	// behaviour for non-scripting nodes, where data is not augmented).
	describe('direct writes on $json data', () => {
		const isVm = process.env.N8N_EXPRESSION_ENGINE !== 'legacy';

		it('index assignment is visible to a later read in the same evaluation', () => {
			const json = { arr: ['a', 'b', 'c'] };
			expect(evaluate('={{ (() => { $json.arr[0] = "X"; return $json.arr[0]; })() }}', json)).toBe(
				'X',
			);
			expect(json.arr).toEqual(isVm ? ['a', 'b', 'c'] : ['X', 'b', 'c']);
		});

		it('existing object-key assignment is visible to a later read', () => {
			const json = { user: { name: 'Alice', email: 'a@x' } };
			expect(
				evaluate('={{ (() => { $json.user.name = "Zed"; return $json.user.name; })() }}', json),
			).toBe('Zed');
			expect(json.user.name).toBe(isVm ? 'Alice' : 'Zed');
		});

		it('delete removes the key for the rest of the evaluation', () => {
			const json = { user: { name: 'Alice', email: 'a@x' } };
			expect(
				evaluate(
					'={{ (() => { delete $json.user.email; return $json.user.email === undefined; })() }}',
					json,
				),
			).toBe(true);
			expect('email' in json.user).toBe(isVm);
		});

		it('push() updates length within the evaluation', () => {
			const json = { arr: ['a', 'b', 'c'] };
			expect(
				evaluate('={{ (() => { $json.arr.push("d"); return $json.arr.length; })() }}', json),
			).toBe(4);
			expect(json.arr.length).toBe(isVm ? 3 : 4);
		});

		it('writes do not leak into a subsequent evaluation on the vm engine', () => {
			const json = { arr: ['a', 'b', 'c'] };
			evaluate('={{ (() => { $json.arr[0] = "X"; return $json.arr[0]; })() }}', json);
			expect(evaluate('={{ $json.arr[0] }}', json)).toBe(isVm ? 'a' : 'X');
		});
	});
});
