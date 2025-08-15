import { DateTime, Duration, Interval } from 'luxon';

import * as Helpers from './helpers';
import { ensureError } from '../src/errors/ensure-error';
import { ExpressionError } from '../src/errors/expression.error';
import {
	NodeConnectionTypes,
	type NodeConnectionType,
	type IExecuteData,
	type INode,
	type IPinData,
	type IRun,
	type IWorkflowBase,
	type WorkflowExecuteMode,
} from '../src/interfaces';
import { Workflow } from '../src/workflow';
import { WorkflowDataProxy } from '../src/workflow-data-proxy';

const loadFixture = (fixture: string) => {
	const workflow = Helpers.readJsonFileSync<IWorkflowBase>(
		`test/fixtures/WorkflowDataProxy/${fixture}_workflow.json`,
	);
	const run = Helpers.readJsonFileSync<IRun>(`test/fixtures/WorkflowDataProxy/${fixture}_run.json`);

	return { workflow, run };
};

const getProxyFromFixture = (
	workflow: IWorkflowBase,
	run: IRun | null,
	activeNode: string,
	mode?: WorkflowExecuteMode,
	opts?: {
		throwOnMissingExecutionData: boolean;
		connectionType?: NodeConnectionType;
		runIndex?: number;
	},
) => {
	const taskData = run?.data.resultData.runData[activeNode]?.[opts?.runIndex ?? 0];
	const lastNodeConnectionInputData =
		taskData?.data?.[opts?.connectionType ?? NodeConnectionTypes.Main]?.[0];

	let executeData: IExecuteData | undefined;

	if (taskData) {
		executeData = {
			data: taskData.data!,
			node: workflow.nodes.find((node) => node.name === activeNode) as INode,
			source: {
				[opts?.connectionType ?? NodeConnectionTypes.Main]: taskData.source,
			},
		};
	}

	let pinData: IPinData = {};
	if (workflow.pinData) {
		// json key is stored as part of workflow
		// but dropped when copy/pasting
		// so adding here to keep updating tests simple
		for (let nodeName in workflow.pinData) {
			pinData[nodeName] = workflow.pinData[nodeName].map((item) => ({ json: item }));
		}
	}

	const dataProxy = new WorkflowDataProxy(
		new Workflow({
			id: '123',
			name: 'test workflow',
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: false,
			nodeTypes: Helpers.NodeTypes(),
			pinData,
		}),
		run?.data ?? null,
		opts?.runIndex ?? 0,
		0,
		activeNode,
		lastNodeConnectionInputData ?? [],
		{},
		mode ?? 'integrated',
		{},
		executeData,
	);

	return dataProxy.getDataProxy(opts);
};

describe('WorkflowDataProxy', () => {
	describe('$(If))', () => {
		const fixture = loadFixture('multiple_outputs');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Edit Fields');

		test('last() should use the output the node is connected to by default', () => {
			expect(proxy.$('If').last().json.code).toEqual(2);
		});

		test('last(0) should use the first output', () => {
			expect(proxy.$('If').last(0)).toBeUndefined();
		});

		test('last(1) should use the second output', () => {
			expect(proxy.$('If').last(1).json.code).toEqual(2);
		});

		test('first() should use the output the node is connected to by default', () => {
			expect(proxy.$('If').first().json.code).toEqual(1);
		});
		test('first(0) should use the output the node is connected to by default', () => {
			expect(proxy.$('If').first(0)).toBeUndefined();
		});
		test('first(1) should use the output the node is connected to by default', () => {
			expect(proxy.$('If').first(1).json.code).toEqual(1);
		});

		test('all() should use the output the node is connected to by default', () => {
			expect(proxy.$('If').all()[0].json.code).toEqual(1);
			expect(proxy.$('If').all()[1].json.code).toEqual(2);
		});
		test('all(0) should use the output the node is connected to by default', () => {
			expect(proxy.$('If').all(0)[0]).toBeUndefined();
			expect(proxy.$('If').all(0)[1]).toBeUndefined();
		});
		test('all(1) should use the output the node is connected to by default', () => {
			expect(proxy.$('If').all(1)[0].json.code).toEqual(1);
			expect(proxy.$('If').all(1)[1].json.code).toEqual(2);
		});
	});

	describe('Base', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

		test('$("NodeName").all()', () => {
			expect(proxy.$('Rename').all()[1].json.data).toEqual(160);
		});
		test('$("NodeName").all() length', () => {
			expect(proxy.$('Rename').all().length).toEqual(5);
		});
		test('$("NodeName").item', () => {
			expect(proxy.$('Rename').item).toEqual({ json: { data: 105 }, pairedItem: { item: 0 } });
		});
		test('$("NodeNameEarlier").item', () => {
			expect(proxy.$('Function').item).toEqual({
				json: { initialName: 105 },
				pairedItem: { item: 0 },
			});
		});
		test('$("NodeName").itemMatching(2)', () => {
			expect(proxy.$('Rename').itemMatching(2).json.data).toEqual(121);
		});
		test('$("NodeName").first()', () => {
			expect(proxy.$('Rename').first().json.data).toEqual(105);
		});
		test('$("NodeName").last()', () => {
			expect(proxy.$('Rename').last().json.data).toEqual(950);
		});

		test('$("NodeName").params', () => {
			expect(proxy.$('Rename').params).toEqual({ value1: 'data', value2: 'initialName' });
		});

		test('$("NodeName") not in workflow should throw', () => {
			expect(() => proxy.$('doNotExist')).toThrowError(ExpressionError);
		});

		test('$("NodeName").item on Node that has not executed', () => {
			expect(() => proxy.$('Set').item).toThrowError(ExpressionError);
		});

		test('$("NodeName").isExecuted', () => {
			expect(proxy.$('Function').isExecuted).toEqual(true);
			expect(proxy.$('Set').isExecuted).toEqual(false);
		});

		test('$input.all()', () => {
			expect(proxy.$input.all()[1].json.data).toEqual(160);
		});
		test('$input.all() length', () => {
			expect(proxy.$input.all().length).toEqual(5);
		});
		test('$input.first()', () => {
			expect(proxy.$input.first()?.json?.data).toEqual(105);
		});
		test('$input.last()', () => {
			expect(proxy.$input.last()?.json?.data).toEqual(950);
		});
		test('$input.item', () => {
			expect(proxy.$input.item?.json?.data).toEqual(105);
		});
		test('$thisItem', () => {
			expect(proxy.$thisItem.json.data).toEqual(105);
		});

		test('$binary', () => {
			expect(proxy.$binary).toEqual({});
		});

		test('$json', () => {
			expect(proxy.$json).toEqual({ data: 105 });
		});

		test('$itemIndex', () => {
			expect(proxy.$itemIndex).toEqual(0);
		});

		test('$prevNode', () => {
			expect(proxy.$prevNode).toEqual({ name: 'Rename', outputIndex: 0, runIndex: 0 });
		});

		test('$runIndex', () => {
			expect(proxy.$runIndex).toEqual(0);
		});

		test('$workflow', () => {
			expect(proxy.$workflow).toEqual({
				active: false,
				id: '123',
				name: 'test workflow',
			});
		});
	});

	describe('Errors', () => {
		const fixture = loadFixture('errors');

		test('$("NodeName").item, Node does not exist', () => {
			const proxy = getProxyFromFixture(
				fixture.workflow,
				fixture.run,
				'Reference non-existent node',
			);
			try {
				proxy.$('does not exist').item;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual("Referenced node doesn't exist");
			}
		});

		test('$("NodeName").item, node has no connection to referenced node', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'NoPathBack');
			try {
				proxy.$('Customer Datastore (n8n training)').item;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Invalid expression');
				expect(exprError.context.type).toEqual('paired_item_no_connection');
			}
		});

		test('$("NodeName").first(), node has no connection to referenced node', () => {
			const proxy = getProxyFromFixture(
				fixture.workflow,
				fixture.run,
				'Reference impossible with .first()',
			);
			try {
				proxy.$('Impossible').first().json.name;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Referenced node is unexecuted');
				expect(exprError.context.type).toEqual('no_node_execution_data');
			}
		});

		test('$json, Node has no connections', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'NoInputConnection');
			try {
				proxy.$json.email;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('No execution data available');
				expect(exprError.context.type).toEqual('no_input_connection');
			}
		});

		test('$("NodeName").item, Node has not run', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Impossible');
			try {
				proxy.$('Impossible if').item;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Referenced node is unexecuted');
				expect(exprError.context.type).toEqual('no_node_execution_data');
			}
		});

		test('$json, Node has not run', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Impossible');
			try {
				proxy.$json.email;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('No execution data available');
				expect(exprError.context.type).toEqual('no_execution_data');
			}
		});

		test('$("NodeName").item, paired item error: more than 1 matching item', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'PairedItemMultipleMatches');
			try {
				proxy.$('Edit Fields').item;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Multiple matches found');
				expect(exprError.context.type).toEqual('paired_item_multiple_matches');
			}
		});

		test('$("NodeName").item, paired item error: missing paired item', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'PairedItemInfoMissing');
			try {
				proxy.$('Edit Fields').item;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual(
					"Paired item data for item from node 'Break pairedItem chain' is unavailable. Ensure 'Break pairedItem chain' is providing the required output.",
				);
				expect(exprError.context.type).toEqual('paired_item_no_info');
			}
		});

		test('$("NodeName").item, paired item error: invalid paired item', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'IncorrectPairedItem');
			try {
				proxy.$('Edit Fields').item;
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual("Can't get data for expression");
				expect(exprError.context.type).toEqual('paired_item_invalid_info');
			}
		});
	});

	describe('Pinned data with manual execution', () => {
		const fixture = loadFixture('pindata');
		const proxy = getProxyFromFixture(fixture.workflow, null, 'NotPinnedSet1', 'manual');

		test('$(PinnedSet).item.json', () => {
			expect(proxy.$('PinnedSet').item.json).toEqual({ firstName: 'Joe', lastName: 'Smith' });
		});

		test('$(PinnedSet).item.json.firstName', () => {
			expect(proxy.$('PinnedSet').item.json.firstName).toBe('Joe');
		});

		test('$(PinnedSet).pairedItem().json.firstName', () => {
			expect(proxy.$('PinnedSet').pairedItem().json.firstName).toBe('Joe');
		});

		test('$(PinnedSet).first().json.firstName', () => {
			expect(proxy.$('PinnedSet').first().json.firstName).toBe('Joe');
		});

		test('$(PinnedSet).first().json.firstName', () => {
			expect(proxy.$('PinnedSet').first().json.firstName).toBe('Joe');
		});

		test('$(PinnedSet).last().json.firstName', () => {
			expect(proxy.$('PinnedSet').last().json.firstName).toBe('Joan');
		});

		test('$(PinnedSet).all()[0].json.firstName', () => {
			expect(proxy.$('PinnedSet').all()[0].json.firstName).toBe('Joe');
		});

		test('$(PinnedSet).all()[1].json.firstName', () => {
			expect(proxy.$('PinnedSet').all()[1].json.firstName).toBe('Joan');
		});

		test('$(PinnedSet).all()[2]', () => {
			expect(proxy.$('PinnedSet').all()[2]).toBeUndefined();
		});

		test('$(PinnedSet).itemMatching(0).json.firstName', () => {
			expect(proxy.$('PinnedSet').itemMatching(0).json.firstName).toBe('Joe');
		});

		test('$(PinnedSet).itemMatching(1).json.firstName', () => {
			expect(proxy.$('PinnedSet').itemMatching(1).json.firstName).toBe('Joan');
		});

		test('$(PinnedSet).itemMatching(2)', () => {
			expect(proxy.$('PinnedSet').itemMatching(2)).toBeUndefined();
		});

		test('$node[PinnedSet].json.firstName', () => {
			expect(proxy.$node.PinnedSet.json.firstName).toBe('Joe');
		});
	});

	describe('Pinned data with paired items', () => {
		const fixture = loadFixture('pindata_paireditem');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Set', 'manual', {
			runIndex: 0,
			throwOnMissingExecutionData: false,
		});

		test.each([{ methodName: 'itemMatching' }, { methodName: 'pairedItem' }])(
			'$methodName should throw when it cannot find a paired item',
			async ({ methodName }) => {
				try {
					proxy.$('DebugHelper')[methodName](0);
					throw new Error('should throw');
				} catch (e) {
					const error = ensureError(e);
					expect(error.message).toEqual(
						`Using the ${methodName} method doesn't work with pinned data in this scenario. Please unpin 'Edit Fields' and try again.`,
					);

					expect(error).toMatchObject({
						functionality: 'pairedItem',
						context: {
							runIndex: 0,
							itemIndex: 0,
							type: 'paired_item_no_info',
							descriptionKey: 'pairedItemNoInfo',
							nodeCause: 'Edit Fields',
							causeDetailed:
								"Missing pairedItem data (node 'Edit Fields' probably didn't supply it)",
						},
					});
				}
			},
		);

		test('item should throw when it cannot find a paired item', async () => {
			try {
				proxy.$('DebugHelper').item;
				throw new Error('should throw');
			} catch (e) {
				const error = ensureError(e);
				expect(error.message).toEqual(
					"Using the item method doesn't work with pinned data in this scenario. Please unpin 'Edit Fields' and try again.",
				);

				expect(error).toMatchObject({
					functionality: 'pairedItem',
					context: {
						runIndex: 0,
						itemIndex: 0,
						type: 'paired_item_no_info',
						descriptionKey: 'pairedItemNoInfo',
						nodeCause: 'Edit Fields',
						causeDetailed: "Missing pairedItem data (node 'Edit Fields' probably didn't supply it)",
					},
				});
			}
		});
	});

	describe('Partial data', () => {
		const fixture = loadFixture('partial_data');

		describe('Default behaviour (throw on missing execution data)', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

			test('$binary', () => {
				expect(() => proxy.$binary).toThrowError(ExpressionError);
			});

			test('$json', () => {
				expect(() => proxy.$json).toThrowError(ExpressionError);
			});

			test('$data', () => {
				expect(() => proxy.$data).toThrowError(ExpressionError);
			});
		});

		describe("Don't throw on missing execution data)", () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End', undefined, {
				throwOnMissingExecutionData: false,
			});

			test('$binary', () => {
				expect(proxy.$binary).toBeUndefined();
			});

			test('$json', () => {
				expect(proxy.$json).toBeUndefined();
			});

			test('$data', () => {
				expect(proxy.$data).toBeUndefined();
			});
		});
	});

	describe('$fromAI', () => {
		const fixture = loadFixture('from_ai_multiple_items');
		const getFromAIProxy = (runIndex = 0) =>
			getProxyFromFixture(fixture.workflow, fixture.run, 'Google Sheets1', 'manual', {
				connectionType: NodeConnectionTypes.AiTool,
				throwOnMissingExecutionData: false,
				runIndex,
			});

		test('Retrieves values for first item', () => {
			expect(getFromAIProxy().$fromAI('full_name')).toEqual('Mr. Input 1');
			expect(getFromAIProxy().$fromAI('email')).toEqual('input1@n8n.io');
		});

		test('Retrieves values for second item', () => {
			expect(getFromAIProxy(1).$fromAI('full_name')).toEqual('Mr. Input 2');
			expect(getFromAIProxy(1).$fromAI('email')).toEqual('input2@n8n.io');
		});

		test('Case variants: $fromAi and $fromai', () => {
			expect(getFromAIProxy().$fromAi('full_name')).toEqual('Mr. Input 1');
			expect(getFromAIProxy().$fromai('email')).toEqual('input1@n8n.io');
		});

		test('Returns default value when key not found', () => {
			expect(
				getFromAIProxy().$fromAI('non_existent_key', 'description', 'string', 'default_value'),
			).toEqual('default_value');
		});

		test('Throws an error when a key is invalid (e.g. empty string)', () => {
			expect(() => getFromAIProxy().$fromAI('')).toThrow(ExpressionError);
			expect(() => getFromAIProxy().$fromAI('invalid key')).toThrow(ExpressionError);
			expect(() => getFromAIProxy().$fromAI('invalid!')).toThrow(ExpressionError);
		});
	});

	describe('$rawParameter', () => {
		const fixture = loadFixture('rawParameter');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Execute Workflow', 'manual', {
			connectionType: NodeConnectionTypes.Main,
			throwOnMissingExecutionData: false,
			runIndex: 0,
		});

		test('returns simple raw parameter value', () => {
			expect(proxy.$rawParameter.options).toEqual({
				waitForSubWorkflow: '={{ true }}',
			});
		});

		test('returns raw parameter value for resource locator values', () => {
			expect(proxy.$rawParameter.workflowId).toEqual('={{ $json.foo }}');
		});

		test('returns raw parameter value when there is no run data', () => {
			const noRunDataProxy = getProxyFromFixture(
				fixture.workflow,
				{
					data: { resultData: { runData: {} } },
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
				},
				'Execute Workflow',
				'manual',
				{
					connectionType: NodeConnectionTypes.Main,
					throwOnMissingExecutionData: false,
					runIndex: 0,
				},
			);
			expect(noRunDataProxy.$rawParameter.options).toEqual({
				waitForSubWorkflow: '={{ true }}',
			});
		});
	});

	describe('DateTime and Time-related functions', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

		test('$now should return current datetime', () => {
			expect(proxy.$now).toBeInstanceOf(DateTime);
		});

		test('$today should return datetime at start of day', () => {
			const today = proxy.$today;
			expect(today).toBeInstanceOf(DateTime);
			expect(today.hour).toBe(0);
			expect(today.minute).toBe(0);
			expect(today.second).toBe(0);
			expect(today.millisecond).toBe(0);
		});

		test('should expose DateTime, Interval, and Duration', () => {
			expect(proxy.DateTime).toBe(DateTime);
			expect(proxy.Interval).toBe(Interval);
			expect(proxy.Duration).toBe(Duration);
		});

		test('$now should be configurable with timezone', () => {
			const timezoneProxy = getProxyFromFixture(
				{ ...fixture.workflow, settings: { timezone: 'America/New_York' } },
				fixture.run,
				'End',
			);

			expect(timezoneProxy.$now.zoneName).toBe('America/New_York');
		});
	});

	describe('Node version and ID', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

		test('$nodeVersion should return node type version', () => {
			expect(proxy.$nodeVersion).toBe(1);
		});

		test('$nodeId should return node ID', () => {
			expect(proxy.$nodeId).toBe('uuid-5');
		});

		test('$webhookId should be optional', () => {
			expect(proxy.$webhookId).toBeUndefined();
		});
	});

	describe('$jmesPath', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

		test('should query simple object', () => {
			const data = { name: 'John', age: 30 };
			expect(proxy.$jmesPath(data, 'name')).toBe('John');
		});

		test('should query nested object', () => {
			const data = {
				user: {
					name: 'John',
					details: { age: 30 },
				},
			};
			expect(proxy.$jmesPath(data, 'user.details.age')).toBe(30);
		});

		test('should query array', () => {
			const data = [
				{ name: 'John', age: 30 },
				{ name: 'Jane', age: 25 },
			];
			expect(proxy.$jmesPath(data, '[*].name')).toEqual(['John', 'Jane']);
		});

		test('should throw error for invalid arguments', () => {
			expect(() => proxy.$jmesPath('not an object', 'test')).toThrow(ExpressionError);
			expect(() => proxy.$jmesPath({}, 123 as unknown as string)).toThrow(ExpressionError);
		});

		test('$jmespath should alias $jmesPath', () => {
			const data = { name: 'John' };
			expect(proxy.$jmespath(data, 'name')).toBe(proxy.$jmesPath(data, 'name'));
		});
	});

	describe('$mode', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End', 'manual');

		test('should return execution mode', () => {
			expect(proxy.$mode).toBe('manual');
		});
	});

	describe('$item', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

		test('should return data proxy for specific item', () => {
			const itemProxy = proxy.$item(1);
			expect(itemProxy.$json.data).toBe(160);
		});

		test('should allow specifying run index', () => {
			const itemProxy = proxy.$item(1, 0);
			expect(itemProxy.$json.data).toBe(160);
		});
	});

	describe('$items', () => {
		const fixture = loadFixture('base');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'End');

		describe('Default behavior (no arguments)', () => {
			test('should return input items from previous node', () => {
				const items = proxy.$items();
				expect(items.length).toBe(5);
				expect(items[0].json.data).toBe(105);
				expect(items[1].json.data).toBe(160);
			});

			test('should limit items for nodes with executeOnce=true', () => {
				// Mock a node with executeOnce=true
				const mockWorkflow = {
					...fixture.workflow,
					nodes: fixture.workflow.nodes.map((node) =>
						node.name === 'Rename' ? { ...node, executeOnce: true } : node,
					),
				};

				const mockProxy = getProxyFromFixture(mockWorkflow, fixture.run, 'End');
				const items = mockProxy.$items();

				expect(items.length).toBe(1);
				expect(items[0].json.data).toBe(105);
			});
		});

		describe('With node name argument', () => {
			test('should return items for specified node', () => {
				const items = proxy.$items('Rename');
				expect(items.length).toBe(5);
				expect(items[0].json.data).toBe(105);
				expect(items[1].json.data).toBe(160);
			});

			test('should throw error for non-existent node', () => {
				expect(() => proxy.$items('NonExistentNode')).toThrowError(ExpressionError);
			});
		});

		describe('With node name and output index', () => {
			const switchWorkflow = loadFixture('multiple_outputs');
			const switchProxy = getProxyFromFixture(
				switchWorkflow.workflow,
				switchWorkflow.run,
				'Edit Fields',
			);

			test('should return items from specific output', () => {
				const items = switchProxy.$items('If', 1);
				expect(items[0].json.code).toBe(1);
			});
		});

		describe('With node name, output index, and run index', () => {
			test('should handle negative run index', () => {
				const items = proxy.$items('Rename', 0, -1);
				expect(items.length).toBe(5);
				expect(items[0].json.data).toBe(105);
			});
		});

		describe('Error handling', () => {
			test('should throw error for invalid run index', () => {
				expect(() => proxy.$items('Rename', 0, 999)).toThrowError(ExpressionError);
			});

			test('should handle nodes with no execution data', () => {
				const noDataWorkflow = {
					...fixture.workflow,
					nodes: fixture.workflow.nodes.filter((node) => node.name !== 'Rename'),
				};
				const noDataProxy = getProxyFromFixture(noDataWorkflow, null, 'End');

				expect(() => noDataProxy.$items('Rename')).toThrowError(ExpressionError);
			});
		});
	});

	describe('$agentInfo', () => {
		const fixture = loadFixture('agentInfo');
		const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'AI Agent');

		test('$agentInfo should return undefined for non-agent nodes', () => {
			const nonAgentProxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Calculator');
			expect(nonAgentProxy.$agentInfo).toBeUndefined();
		});

		test('$agentInfo should return memoryConnectedToAgent as true if memory is connected', () => {
			expect(proxy.$agentInfo.memoryConnectedToAgent).toBe(true);
		});

		test('$agentInfo should return memoryConnectedToAgent as false if no memory is connected', () => {
			const noMemoryProxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Another Agent');
			expect(noMemoryProxy.$agentInfo.memoryConnectedToAgent).toBe(false);
		});

		test('$agentInfo.tools should include connected tools with correct details', () => {
			const tools = proxy.$agentInfo.tools;
			// don't show tool connected to other agent
			expect(tools.length).toEqual(2);
			expect(tools[0]).toMatchObject({
				connected: true,
				name: 'Google Calendar',
				type: 'Google Calendar',
				resource: 'Event',
				operation: 'Create',
				hasCredentials: false,
			});
			expect(tools[1]).toMatchObject({
				connected: false,
				name: 'Calculator',
				type: 'Calculator',
				resource: null,
				operation: null,
				hasCredentials: false,
			});
		});

		test('$agentInfo.tools should correctly identify AI-defined fields', () => {
			const tools = proxy.$agentInfo.tools;
			expect(tools[0].name).toBe('Google Calendar');
			expect(tools[0].aiDefinedFields.length).toBe(1);
			expect(tools[0].aiDefinedFields).toEqual(['Start']);
		});
	});

	describe('multiple inputs', () => {
		const fixture = loadFixture('multiple_inputs');

		it('should correctly resolve expressions with multiple inputs (using paired item)', () => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Output');
			expect(proxy.$('Set variable_3').item.json.variable_3).toEqual('3456');
			expect(proxy.$('Set main variable').item.json.main_variable).toEqual(2);
		});
	});
});
