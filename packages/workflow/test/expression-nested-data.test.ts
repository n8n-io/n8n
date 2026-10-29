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

	it('spreads $json into an object literal', () => {
		expect(evaluate('={{ {...$json} }}', { name: 'alice', age: 30 })).toEqual({
			name: 'alice',
			age: 30,
		});
	});

	it('overrides a property of a spread $json', () => {
		expect(evaluate('={{ {...$json, age: 31} }}', { name: 'alice', age: 30 })).toEqual({
			name: 'alice',
			age: 31,
		});
	});

	it('spreads a nested array from $json', () => {
		expect(evaluate('={{ [...$json.rows] }}', { rows: [1, 2, 3] })).toEqual([1, 2, 3]);
	});

	it('keeps an undefined object value in the result', () => {
		expect(evaluate('={{ { a: undefined, b: 1 } }}', {})).toStrictEqual({ a: undefined, b: 1 });
	});

	it('keeps an undefined array item in the result', () => {
		expect(evaluate('={{ [1, undefined, 3] }}', {})).toStrictEqual([1, undefined, 3]);
	});

	it('keeps undefined values nested in the result', () => {
		expect(evaluate('={{ { list: [undefined], inner: { a: undefined } } }}', {})).toStrictEqual({
			list: [undefined],
			inner: { a: undefined },
		});
	});

	describe('fields named like Object.prototype members', () => {
		const item = {
			key: 'toString',
			toString: 'to-string-value',
			valueOf: 'value-of-value',
			toLocaleString: 'to-locale-string-value',
			hasOwnProperty: 'has-own-property-value',
			isPrototypeOf: 'is-prototype-of-value',
			propertyIsEnumerable: 'property-is-enumerable-value',
			row: { toString: 'nested-value' },
		};

		it.each([
			'toString',
			'valueOf',
			'toLocaleString',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
		] as const)('returns the field %s for dot, bracket and computed access', (field) => {
			expect(evaluate(`={{ $json.${field} }}`, item)).toBe(item[field]);
			expect(evaluate(`={{ $json['${field}'] }}`, item)).toBe(item[field]);
			expect(evaluate(`={{ $json[['${field}'][0]] }}`, item)).toBe(item[field]);
		});

		it('returns the field for a key read from the data', () => {
			expect(evaluate('={{ $json[$json.key] }}', item)).toBe('to-string-value');
			expect(evaluate("={{ $json['to' + 'String'] }}", item)).toBe('to-string-value');
		});

		it('returns the field from a nested object', () => {
			expect(evaluate('={{ $json.row.toString }}', item)).toBe('nested-value');
			expect(evaluate("={{ $json.row[['toString'][0]] }}", item)).toBe('nested-value');
		});

		it('resolves the prototype member when the data has no such field', () => {
			expect(evaluate('={{ typeof $json.toString }}', { a: 1 })).toBe('function');
			expect(evaluate('={{ $json.list.toString() }}', { list: [1, 2, 3] })).toBe('1,2,3');
			expect(evaluate('={{ $json.inner.hasOwnProperty("a") }}', { inner: { a: 1 } })).toBe(true);
		});
	});
});
