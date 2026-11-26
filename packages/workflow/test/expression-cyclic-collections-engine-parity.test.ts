// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';

// Self-referencing values inside a Map, a Set, or an Error must work the same
// way across legacy, vm, quickjs, and native evaluation.

describe('Expression - self-referencing values in Map, Set and Error (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: ['Source', 'Current'].map((name) => ({
			name,
			typeVersion: 1,
			type: 'test.set',
			id: name,
			position: [0, 0],
			parameters: {},
		})),
		connections: {
			Source: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	const makeItem = () => {
		const selfMap = new Map<string, unknown>();
		selfMap.set('self', selfMap);
		const selfSet = new Set<unknown>();
		selfSet.add(selfSet);
		const cyclicObj: Record<string, unknown> = { a: 1 };
		cyclicObj.self = cyclicObj;
		const mapWithObj = new Map<string, unknown>([['k', cyclicObj]]);
		const errWithMap = Object.assign(new Error('from host'), {
			m: new Map<string, unknown>(),
		});
		errWithMap.m.set('e', errWithMap);
		return {
			json: { selfMap, selfSet, mapWithObj, errWithMap, id: 7 },
			pairedItem: { item: 0 },
		};
	};

	const evaluate = (expr: string, native: boolean) => {
		const items = [makeItem()] as never[];
		Expression.setNativeEvaluation(native);
		try {
			return expression.getParameterValue(
				expr,
				createRunExecutionData({
					resultData: {
						runData: {
							Source: [
								{
									startTime: 0,
									executionTime: 0,
									executionIndex: 0,
									source: [],
									data: { main: [items] },
								},
							],
						},
					},
				}),
				0,
				0,
				'Current',
				items,
				'manual',
				{},
				{
					node: workflow.getNode('Current')!,
					data: { main: [items] },
					source: { main: [{ previousNode: 'Source' }] },
				},
			);
		} finally {
			Expression.setNativeEvaluation(false);
		}
	};

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	describe.each([false, true])('native evaluation: %s', (native) => {
		it('returns a Map that holds itself as a value or a key', () => {
			const byValue = evaluate(
				'={{ (() => { const m = new Map(); m.set("self", m); return m; })() }}',
				native,
			) as unknown as Map<unknown, unknown>;
			const byKey = evaluate(
				'={{ (() => { const m = new Map(); m.set(m, 1); return m; })() }}',
				native,
			) as unknown as Map<unknown, unknown>;

			expect(byValue).toBeInstanceOf(Map);
			expect(byValue.get('self')).toBe(byValue);
			expect(byKey).toBeInstanceOf(Map);
			expect(byKey.get(byKey)).toBe(1);
		});

		it('returns a Set that holds itself', () => {
			const result = evaluate(
				'={{ (() => { const s = new Set(); s.add(s); return s; })() }}',
				native,
			) as unknown as Set<unknown>;

			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(1);
			expect(result.has(result)).toBe(true);
		});

		it('returns a Map or a Set that holds a self-referencing object or array', () => {
			const mapObj = evaluate(
				'={{ (() => { const o = { a: 1 }; o.self = o; return new Map([["k", o]]); })() }}',
				native,
			) as unknown as Map<string, Record<string, unknown>>;
			const setArr = evaluate(
				'={{ (() => { const a = [1]; a.push(a); return new Set([a]); })() }}',
				native,
			) as unknown as Set<unknown[]>;

			const nested = mapObj.get('k')!;
			expect(nested.a).toBe(1);
			expect(nested.self).toBe(nested);

			const [arr] = [...setArr];
			expect(arr[0]).toBe(1);
			expect(arr[1]).toBe(arr);
		});

		it('returns mutually referencing Map and Set instances', () => {
			const result = evaluate(
				'={{ (() => { const m = new Map(); const s = new Set([m]); m.set("s", s); return m; })() }}',
				native,
			) as unknown as Map<string, Set<unknown>>;

			expect(result).toBeInstanceOf(Map);
			const inner = result.get('s');
			expect(inner).toBeInstanceOf(Set);
			expect(inner?.has(result)).toBe(true);
		});

		it('returns an Error with a cyclic Map or Set', () => {
			const errWithMap = evaluate(
				'={{ (() => { const e = new Error("x"); const m = new Map([["e", e]]); e.m = m; return e; })() }}',
				native,
			) as unknown as Error & { m: Map<string, unknown> };
			const errWithSet = evaluate(
				'={{ (() => { const e = new Error("x"); const s = new Set(); s.add(s); e.s = s; return e; })() }}',
				native,
			) as unknown as Error & { s: Set<unknown> };

			expect(errWithMap).toBeInstanceOf(Error);
			expect(errWithMap.message).toBe('x');
			expect(errWithMap.m).toBeInstanceOf(Map);
			expect(errWithMap.m.get('e')).toBeInstanceOf(Error);

			expect(errWithSet).toBeInstanceOf(Error);
			expect(errWithSet.s).toBeInstanceOf(Set);
			expect(errWithSet.s.has(errWithSet.s)).toBe(true);
		});

		it('returns a Map or a Set that holds a self-referencing Error', () => {
			const mapWithErr = evaluate(
				'={{ (() => { const e = new Error("x"); e.self = e; return new Map([["e", e]]); })() }}',
				native,
			) as unknown as Map<string, Error>;
			const setWithErr = evaluate(
				'={{ (() => { const e = new Error("x"); e.self = e; return new Set([e]); })() }}',
				native,
			) as unknown as Set<Error>;

			expect(mapWithErr.get('e')).toBeInstanceOf(Error);
			expect(mapWithErr.get('e')?.message).toBe('x');
			const [setErr] = [...setWithErr];
			expect(setErr).toBeInstanceOf(Error);
			expect(setErr.message).toBe('x');
		});

		it('reads cyclic Map, Set and Error values from host item data', () => {
			const outMap = evaluate('={{ $input.first().json.selfMap }}', native) as unknown as Map<
				string,
				unknown
			>;
			const outSet = evaluate(
				'={{ $input.first().json.selfSet }}',
				native,
			) as unknown as Set<unknown>;
			const outMapObj = evaluate('={{ $input.first().json.mapWithObj }}', native) as unknown as Map<
				string,
				Record<string, unknown>
			>;
			const outErr = evaluate('={{ $json.errWithMap }}', native) as unknown as Error & {
				m: Map<string, unknown>;
			};

			expect(evaluate('={{ $input.first().json.id }}', native)).toBe(7);
			expect(outMap).toBeInstanceOf(Map);
			expect(outMap.get('self')).toBe(outMap);
			expect(outSet).toBeInstanceOf(Set);
			expect(outSet.has(outSet)).toBe(true);
			expect(outMapObj.get('k')).toBeDefined();
			expect(outMapObj.get('k')?.self).toBe(outMapObj.get('k'));
			expect(outErr).toBeInstanceOf(Error);
			expect(outErr.message).toBe('from host');
			expect(outErr.m).toBeInstanceOf(Map);
		});
	});
});
