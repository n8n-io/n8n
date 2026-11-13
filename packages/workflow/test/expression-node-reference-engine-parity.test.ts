// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { ExpressionError } from '../src/errors/expression.error';
import { Expression } from '../src/expression';
import type { IExecuteData, INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// `$(name)` with no property access must resolve or throw the same way on
// every engine, with and without native evaluation.

describe('Expression - $(name) without a property (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Source',
				typeVersion: 1,
				type: 'test.set',
				id: 'source-1',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Unexecuted',
				typeVersion: 1,
				type: 'test.set',
				id: 'unexecuted-1',
				position: [0, 100],
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
			Source: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;
	const items = [{ json: { value: 1 }, pairedItem: { item: 0 } }];

	const evaluate = (
		expr: string,
		native: boolean,
		executeData?: IExecuteData,
		{
			inputItems = items,
			runIndex = 0,
			itemIndex = 0,
		}: { inputItems?: INodeExecutionData[]; runIndex?: number; itemIndex?: number } = {},
	) => {
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
				runIndex,
				itemIndex,
				'Current',
				inputItems,
				'manual',
				{},
				executeData,
			);
		} finally {
			Expression.setNativeEvaluation(false);
		}
	};

	const isLegacyEngine = process.env.N8N_EXPRESSION_ENGINE === 'legacy';

	const withPreviousNode: IExecuteData = {
		node: workflow.getNode('Current')!,
		data: { main: [items] },
		source: { main: [{ previousNode: 'Source' }] },
	};

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	// Native evaluation declines bare references such as `$('Source')` and can evaluate the
	// other forms. Both settings run every case.
	describe.each([false, true])('native evaluation: %s', (native) => {
		it.each(["={{ $('Source') }}", "={{ $('Source')", "={{ $('Unexecuted') }}"])(
			'resolves %s to an object',
			(expr) => {
				expect(evaluate(expr, native, withPreviousNode)).toEqual({});
			},
		);

		it("reads isExecuted of $('Unexecuted')", () => {
			expect(evaluate("={{ $('Unexecuted').isExecuted }}", native, withPreviousNode)).toBe(false);
		});

		it.each(['', 'null', 'false', '0', "''", 'undefined'])(
			'resolves $(%s) to the previous node',
			(selector) => {
				const read = (accessor: string) =>
					evaluate(`={{ $(${selector})${accessor} }}`, native, withPreviousNode);

				expect(read('')).toEqual({});
				expect(read('.isExecuted')).toBe(true);
				expect(read('.first().json.value')).toBe(1);
				expect(read('.item.json.value')).toBe(1);
			},
		);

		it('resolves $() without closing braces to the previous node', () => {
			expect(evaluate('={{ $()', native, withPreviousNode)).toEqual({});
		});

		it.each([
			["={{ $('Unknown') }}", 'Unknown', 'Unknown'],
			["={{ $('Unknown')", 'Unknown', 'Unknown'],
			['={{ $(123) }}', 123, '123'],
			['={{ $({}) }}', {}, '[object Object]'],
			['={{ $([]).first().json.value }}', [], ''],
			['={{ $([null]).first().json.value }}', [null], ''],
		])('throws for %s', (expr, legacyNodeCause, sandboxNodeCause) => {
			// Legacy keeps the raw selector as nodeCause, the sandbox engines its string form.
			const nodeCause = isLegacyEngine ? legacyNodeCause : sandboxNodeCause;
			expect(() => evaluate(expr, native, withPreviousNode)).toThrow(
				expect.objectContaining({
					constructor: ExpressionError,
					message: "Referenced node doesn't exist",
					context: {
						nodeCause,
						descriptionKey: 'nodeNotFound',
						runIndex: 0,
						itemIndex: 0,
					},
				}),
			);
		});

		describe('with the selector from $json at run 1, item 1', () => {
			const evaluateSelector = (sourceNode: string | null | never[], executeData?: IExecuteData) =>
				evaluate('={{ $($json.sourceNode).first().json.value }}', native, executeData, {
					inputItems: [{ json: {} }, { json: { sourceNode } }],
					runIndex: 1,
					itemIndex: 1,
				});

			it.each(['Source', null])('resolves %j', (sourceNode) => {
				expect(evaluateSelector(sourceNode, withPreviousNode)).toBe(1);
			});

			it.each([
				['Unknown', 'Unknown', 'Unknown'],
				[[], [], ''],
			])('throws for %j', (sourceNode, legacyNodeCause, sandboxNodeCause) => {
				expect(() => evaluateSelector(sourceNode, withPreviousNode)).toThrow(
					expect.objectContaining({
						constructor: ExpressionError,
						message: "Referenced node doesn't exist",
						context: {
							nodeCause: isLegacyEngine ? legacyNodeCause : sandboxNodeCause,
							descriptionKey: 'nodeNotFound',
							runIndex: 1,
							itemIndex: 1,
						},
					}),
				);
			});

			it('throws for null with no previous node', () => {
				expect(() => evaluateSelector(null)).toThrow(
					expect.objectContaining({
						constructor: ExpressionError,
						message: 'When calling $(), please specify a node',
					}),
				);
			});
		});

		it.each(['={{ $() }}', '={{ $()'])('throws for %s with no previous node', (expr) => {
			expect(() => evaluate(expr, native)).toThrow(
				expect.objectContaining({
					constructor: ExpressionError,
					message: 'When calling $(), please specify a node',
				}),
			);
		});
	});
});
