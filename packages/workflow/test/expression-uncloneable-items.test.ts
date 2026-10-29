// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { Expression } from '../src/expression';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// The legacy Code node (vm2, task runners off) hands out its items as Proxy
// objects, which the VM engine can't copy into the isolate, so `$('Code')`
// read as null (CET-445). A plain Proxy fails the copy the same way.
describe('Expression — $() items that are Proxy objects (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Code',
				typeVersion: 1,
				type: 'test.set',
				id: 'code-1',
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
		connections: { Code: { main: [[{ node: 'Current', type: 'main', index: 0 }]] } },
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	const items = [
		new Proxy(
			{
				json: {
					value: 'from_code',
					nested: new Proxy({ deep: 'yes' }, {}),
					when: new Date('2026-01-02T03:04:05.000Z'),
					fn: () => 1,
				},
				pairedItem: { item: 0 },
			},
			{},
		),
	] as INodeExecutionData[];

	const runExecutionData = createRunExecutionData({
		resultData: {
			runData: {
				Code: [
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
	});

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const evaluate = (expr: string) =>
		expression.getParameterValue(
			expr,
			runExecutionData,
			0,
			0,
			'Current',
			items,
			'manual',
			{},
			{
				data: { main: [items] },
				node: workflow.getNode('Current')!,
				source: { main: [{ previousNode: 'Code', previousNodeOutput: 0, previousNodeRun: 0 }] },
			},
		);

	it.each([
		"$('Code').first()",
		"$('Code').last()",
		"$('Code').all()[0]",
		"$('Code').item",
		'$input.first()',
		"$items('Code')[0]",
	])('%s returns the JSON values and Dates of the item', (accessor) => {
		expect(evaluate(`={{ ${accessor}.json.value }}`)).toBe('from_code');
		expect(evaluate(`={{ ${accessor}.json.nested.deep }}`)).toBe('yes');
		expect(evaluate(`={{ ${accessor}.json.when.toISOString() }}`)).toBe('2026-01-02T03:04:05.000Z');
	});

	it('throws an ExpressionError naming the node and path when the VM engine reads a function', () => {
		if (Expression.getActiveImplementation() !== 'vm') return;

		expect(() => evaluate("={{ $('Code').first().json.fn }}")).toThrow(
			"Can't use json.fn from node 'Code' in an expression: it is a function",
		);
	});
});
