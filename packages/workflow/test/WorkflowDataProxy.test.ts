import { ExpressionError } from '@/errors/expression.error';
import {
	NodeConnectionType,
	type IExecuteData,
	type INode,
	type IPinData,
	type IRun,
	type IWorkflowBase,
	type WorkflowExecuteMode,
} from '@/Interfaces';
import { Workflow } from '@/Workflow';
import { WorkflowDataProxy } from '@/WorkflowDataProxy';

import * as Helpers from './Helpers';

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
		taskData?.data?.[opts?.connectionType ?? NodeConnectionType.Main]?.[0];

	let executeData: IExecuteData | undefined;

	if (taskData) {
		executeData = {
			data: taskData.data!,
			node: workflow.nodes.find((node) => node.name === activeNode) as INode,
			source: {
				[opts?.connectionType ?? NodeConnectionType.Main]: taskData.source,
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

		test('$("NodeName").item, Node does not exist', (done) => {
			const proxy = getProxyFromFixture(
				fixture.workflow,
				fixture.run,
				'Reference non-existent node',
			);
			try {
				proxy.$('does not exist').item;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual("Referenced node doesn't exist");
				done();
			}
		});

		test('$("NodeName").item, node has no connection to referenced node', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'NoPathBack');
			try {
				proxy.$('Customer Datastore (n8n training)').item;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Invalid expression');
				expect(exprError.context.type).toEqual('paired_item_no_connection');
				done();
			}
		});

		test('$("NodeName").first(), node has no connection to referenced node', (done) => {
			const proxy = getProxyFromFixture(
				fixture.workflow,
				fixture.run,
				'Reference impossible with .first()',
			);
			try {
				proxy.$('Impossible').first().json.name;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Referenced node is unexecuted');
				expect(exprError.context.type).toEqual('no_node_execution_data');
				done();
			}
		});

		test('$json, Node has no connections', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'NoInputConnection');
			try {
				proxy.$json.email;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('No execution data available');
				expect(exprError.context.type).toEqual('no_input_connection');
				done();
			}
		});

		test('$("NodeName").item, Node has not run', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Impossible');
			try {
				proxy.$('Impossible if').item;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Referenced node is unexecuted');
				expect(exprError.context.type).toEqual('no_node_execution_data');
				done();
			}
		});

		test('$json, Node has not run', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'Impossible');
			try {
				proxy.$json.email;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('No execution data available');
				expect(exprError.context.type).toEqual('no_execution_data');
				done();
			}
		});

		test('$("NodeName").item, paired item error: more than 1 matching item', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'PairedItemMultipleMatches');
			try {
				proxy.$('Edit Fields').item;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual('Invalid expression');
				expect(exprError.context.type).toEqual('paired_item_multiple_matches');
				done();
			}
		});

		test('$("NodeName").item, paired item error: missing paired item', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'PairedItemInfoMissing');
			try {
				proxy.$('Edit Fields').item;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual("Can't get data for expression");
				expect(exprError.context.type).toEqual('paired_item_no_info');
				done();
			}
		});

		test('$("NodeName").item, paired item error: invalid paired item', (done) => {
			const proxy = getProxyFromFixture(fixture.workflow, fixture.run, 'IncorrectPairedItem');
			try {
				proxy.$('Edit Fields').item;
				done('should throw');
			} catch (error) {
				expect(error).toBeInstanceOf(ExpressionError);
				const exprError = error as ExpressionError;
				expect(exprError.message).toEqual("Can't get data for expression");
				expect(exprError.context.type).toEqual('paired_item_invalid_info');
				done();
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
				connectionType: NodeConnectionType.AiTool,
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
});
