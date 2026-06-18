// @vitest-environment jsdom

import * as Helpers from './helpers';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// Feature-parity regressions for `$json` access across nested data shapes.
// This file lives in `packages/workflow/test/` so vitest runs it under both the
// `legacy-engine` and `vm-engine` projects (see vitest.config.ts). Any divergence
// between the two engines fails one project but not the other.

describe('Expression — nested $json shapes (engine parity)', () => {
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

	it('round-trips a flat object via $json', () => {
		expect(evaluate('={{ $json }}', { name: 'alice', age: 30 })).toEqual({
			name: 'alice',
			age: 30,
		});
	});

	// N8N-9998 — under the VM engine, the lazy proxy used to wrap nested array
	// values in an object-shaped proxy, so structured clone serialized them
	// as `{}`. Legacy engine was always correct; this test pins the parity.
	it('round-trips an array of arrays via $json', () => {
		expect(evaluate('={{ $json }}', { demo: [[{ foo: 'bar' }], [{ bar: 'bas' }]] })).toEqual({
			demo: [[{ foo: 'bar' }], [{ bar: 'bas' }]],
		});
	});

	it('returns a nested array directly via $json path access', () => {
		expect(
			evaluate('={{ $json.demo[0] }}', { demo: [[{ foo: 'bar' }], [{ bar: 'bas' }]] }),
		).toEqual([{ foo: 'bar' }]);
	});

	it('preserves three levels of array nesting', () => {
		expect(evaluate('={{ $json }}', { a: [[[42]]] })).toEqual({ a: [[[42]]] });
	});

	it('preserves arrays of primitive arrays', () => {
		expect(
			evaluate('={{ $json }}', {
				rows: [
					[1, 2, 3],
					[4, 5, 6],
				],
			}),
		).toEqual({
			rows: [
				[1, 2, 3],
				[4, 5, 6],
			],
		});
	});

	it('preserves mixed object/array siblings inside an array', () => {
		expect(evaluate('={{ $json }}', { list: [[1, 2], { k: 'v' }] })).toEqual({
			list: [[1, 2], { k: 'v' }],
		});
	});
});
