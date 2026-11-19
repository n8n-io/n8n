// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';

// An item can hold a value that structured clone cannot copy. An expression
// that reads a different field of that item must give the same result on
// every engine, with and without native evaluation.

describe('Expression - unclonable values in item data (engine parity)', () => {
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

	const evaluate = (expr: string, unclonable: unknown, native: boolean) => {
		const items = [{ json: { id: 7, unclonable }, pairedItem: { item: 0 } }] as never[];
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
		describe.each([
			['a function', () => 1],
			['a symbol', Symbol('unclonable')],
			['a Promise', Promise.resolve(1)],
			['a WeakMap', new WeakMap()],
			['a function in an array', { list: [() => 1] }],
		])('next to %s', (_name, unclonable) => {
			it.each([
				[
					"={{ 'https://example.com/' + $('Source').item.json.id + '/orders' }}",
					'https://example.com/7/orders',
				],
				["={{ $('Source').item.json.id }}", 7],
				["={{ $('Source').first().json.id }}", 7],
				["={{ $('Source').last().json.id }}", 7],
				["={{ $('Source').all()[0].json.id }}", 7],
				['={{ $input.first().json.id }}', 7],
				['={{ $input.all()[0].json.id }}', 7],
				['={{ $json.id }}', 7],
			])('%s', (expr, expected) => {
				expect(evaluate(expr, unclonable, native)).toBe(expected);
			});
		});
	});
});
