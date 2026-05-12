// @vitest-environment jsdom

import * as Helpers from './helpers';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// Engine-parity tests for behaviour of `$json` arrays beyond plain indexed access.

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

	// Both engines wrap `$json` such that property descriptors aren't reachable
	// from inside an expression. Documented so a future divergence is caught;
	// neither engine intends to expose the underlying data this way.
	it('Object.getOwnPropertyDescriptor on $json properties is not exposed via expressions', () => {
		expect(
			evaluate('={{ Object.getOwnPropertyDescriptor($json.arr, "0") }}', { arr: [10, 20, 30] }),
		).toBeUndefined();
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
});
