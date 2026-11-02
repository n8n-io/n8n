// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// vm2 nodes can return proxy values. Check their item accessors under all engines.

describe('Expression - $(node) item accessors with proxy item values (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Previous',
				typeVersion: 1,
				type: 'test.set',
				id: 'previous-1',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'current-1',
				position: [100, 0],
				parameters: {},
			},
		],
		connections: {
			Previous: {
				main: [[{ node: 'Current', type: 'main', index: 0 }]],
			},
		},
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

	const evaluate = (previousItem: INodeExecutionData | INodeExecutionData[], expr: string) => {
		// The current node gets the same items, like a node that passes items through.
		const input = Array.isArray(previousItem) ? previousItem : [previousItem];
		const runExecutionData = createRunExecutionData({
			resultData: {
				runData: {
					Previous: [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							data: { main: [input] },
						},
					],
				},
			},
		});
		return expression.getParameterValue(
			expr,
			runExecutionData,
			0,
			0,
			'Current',
			input,
			'manual',
			{},
			{
				node: workflow.getNode('Current')!,
				data: { main: [input] },
				source: { main: [{ previousNode: 'Previous' }] },
			},
		);
	};

	// Like a vm2 proxy, bind methods to the target so a date proxy still works.
	const proxyOf = <T extends object>(target: T): T =>
		new Proxy(target, {
			get: (proxied, key) => {
				const property: unknown = Reflect.get(proxied, key);
				return typeof property === 'function' ? property.bind(proxied) : property;
			},
		});

	const itemWithProxy = (): INodeExecutionData => ({
		json: proxyOf({ id: 42, createdAt: proxyOf(new Date(0)) }),
		pairedItem: { item: 0 },
	});

	describe('when the item holds a proxy object in item.json', () => {
		it.each([
			"$('Previous').item.json.id",
			"$('Previous').first().json.id",
			"$('Previous').last().json.id",
			"$('Previous').all()[0].json.id",
			"$('Previous').itemMatching(0).json.id",
			'$input.first().json.id',
			'$input.last().json.id',
			'$input.all()[0].json.id',
			'$input.item.json.id',
			'$json.id',
		])('resolves %s', (expr) => {
			expect(evaluate(itemWithProxy(), `={{ ${expr} }}`)).toBe(42);
		});

		it('resolves a nested value under an array index from the paired item', () => {
			const item = {
				json: proxyOf({ contacts: proxyOf([proxyOf({ contact: proxyOf({ id: 42 }) })]) }),
				pairedItem: { item: 0 },
			};
			expect(evaluate(item, "={{ $('Previous').item.json.contacts[0].contact.id }}")).toBe(42);
		});

		it('resolves a nested string from the paired item', () => {
			const item = {
				json: proxyOf({ message: proxyOf({ payload: '{"a":1}' }) }),
				pairedItem: { item: 0 },
			};
			expect(evaluate(item, "={{ $('Previous').item.json.message.payload }}")).toBe('{"a":1}');
		});

		it.each(['$json.createdAt.getTime()', "$('Previous').first().json.createdAt.getTime()"])(
			'resolves the date in %s',
			(expr) => {
				expect(evaluate(itemWithProxy(), `={{ ${expr} }}`)).toBe(0);
			},
		);

		it('resolves JSON.stringify($json)', () => {
			expect(evaluate(itemWithProxy(), '={{ JSON.stringify($json) }}')).toBe(
				'{"id":42,"createdAt":"1970-01-01T00:00:00.000Z"}',
			);
		});

		it('resolves a node item accessor inside a template', () => {
			expect(
				evaluate(
					itemWithProxy(),
					"={{ $json.id }}_{{ $('Previous').first().json.id }}_{{ $json.id }}",
				),
			).toBe('42_42_42');
		});

		it.each(["$('Previous').first()", '$input.first()'])(
			'returns the complete item from %s',
			(expr) => {
				const item = {
					json: new Proxy({ id: 42, nested: new Proxy({ values: [1, 2] }, {}) }, {}),
					pairedItem: { item: 0 },
				};
				expect(evaluate(item, `={{ ${expr} }}`)).toStrictEqual({
					json: { id: 42, nested: { values: [1, 2] } },
					pairedItem: { item: 0 },
				});
			},
		);

		it.each(["$('Previous').all()", '$input.all()'])(
			'returns every repeated item from %s',
			(expr) => {
				const item = { json: new Proxy({ id: 42 }, {}) };
				expect(evaluate([item, item], `={{ ${expr} }}`)).toStrictEqual([
					{ json: { id: 42 } },
					{ json: { id: 42 } },
				]);
			},
		);

		it('preserves a sparse array length in a whole item', () => {
			const values = new Array<number>(3);
			values[0] = 1;
			const item = { json: proxyOf({ values: proxyOf(values) }) };
			expect(evaluate(item, "={{ $('Previous').first().json.values.length }}")).toBe(3);
		});

		it.each([false, true])('returns every own data property (marker key: %s)', (markerKey) => {
			const json = { ['__proto__']: { id: 42 }, id: 1, ...(markerKey ? { __isDate: true } : {}) };
			const item = { json: new Proxy(json, {}) };
			expect(evaluate(item, "={{ $('Previous').first().json }}")).toStrictEqual(json);
		});
	});
});

describe('Expression - template with plain and proxy node items (engine parity)', () => {
	const node = (name: string, x: number) => ({
		name,
		typeVersion: 1,
		type: 'test.set',
		id: `${name}-1`,
		position: [x, 0] as [number, number],
		parameters: {},
	});
	const workflow = new Workflow({
		id: '1',
		nodes: [node('Plain', 0), node('Previous', 100), node('Current', 200)],
		connections: {
			Plain: { main: [[{ node: 'Previous', type: 'main', index: 0 }]] },
			Previous: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
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

	const run = (previousNode: string | undefined, items: INodeExecutionData[]) => ({
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: previousNode ? [{ previousNode }] : [],
		data: { main: [items] },
	});

	it('resolves every reference when one node returns proxy items', () => {
		const plainItem: INodeExecutionData = {
			json: { text: 'a "b"\nc', contacts: [{ contact: { id: 7 } }] },
		};
		// Like a Function node (vm2) output that an IF node passes through.
		const proxyItem: INodeExecutionData = {
			json: new Proxy({ contacts: new Proxy([new Proxy({ id: 42 }, {})], {}) }, {}),
			pairedItem: { item: 0 },
		};
		const input = [proxyItem];
		const runExecutionData = createRunExecutionData({
			resultData: {
				runData: {
					Plain: [run(undefined, [plainItem])],
					Previous: [run('Plain', input)],
				},
			},
		});

		const result = expression.getParameterValue(
			'={ "text": {{ $(\'Plain\').item.json.text.toJsonString() }}, "contact": {{ $(\'Plain\').item.json.contacts[0].contact.id }}, "first": {{ $(\'Previous\').item.json.contacts[0].id }} }',
			runExecutionData,
			0,
			0,
			'Current',
			input,
			'manual',
			{},
			{
				node: workflow.getNode('Current')!,
				data: { main: [input] },
				source: { main: [{ previousNode: 'Previous' }] },
			},
		);

		expect(result).toBe('{ "text": "a \\"b\\"\\nc", "contact": 7, "first": 42 }');
	});
});
