import type { IExecuteData, INode, IRun, IWorkflowBase } from '@/Interfaces';
import { Workflow } from '@/Workflow';
import { WorkflowDataProxy } from '@/WorkflowDataProxy';
import { ExpressionError } from '@/errors/expression.error';
import * as Helpers from './Helpers';

const loadFixture = (fixture: string) => {
	const workflow = Helpers.readJsonFileSync<IWorkflowBase>(
		`test/fixtures/WorkflowDataProxy/${fixture}_workflow.json`,
	);
	const run = Helpers.readJsonFileSync<IRun>(`test/fixtures/WorkflowDataProxy/${fixture}_run.json`);

	return { workflow, run };
};

const getProxyFromFixture = (workflow: IWorkflowBase, run: IRun | null, activeNode: string) => {
	const taskData = run?.data.resultData.runData[activeNode]?.[0];
	const lastNodeConnectionInputData = taskData?.data?.main[0];

	let executeData: IExecuteData | undefined;

	if (taskData) {
		executeData = {
			data: taskData.data!,
			node: {} as INode,
			source: {
				main: taskData.source,
			},
		};
	}

	const dataProxy = new WorkflowDataProxy(
		new Workflow({
			id: '123',
			name: 'test workflow',
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: false,
			nodeTypes: Helpers.NodeTypes(),
			pinData: workflow.pinData ?? {},
		}),
		run?.data ?? null,
		0,
		0,
		activeNode,
		lastNodeConnectionInputData ?? [],
		{},
		'integrated',
		{},
		executeData,
	);

	return dataProxy.getDataProxy();
};

// TODO:
// - Ideally we should load proxy and fixtures the same way as in the tests above
// 	 so run data and workflow data is split in 2 files and we should take care od the type errors here
const getPairedItemProxy = (activeNode: string) => {
	const workflow = Helpers.readJsonFileSync<IWorkflowBase>(
		'test/fixtures/WorkflowDataProxy/pindata_workflow.json',
	);
	const dataProxy = new WorkflowDataProxy(
		new Workflow({
			id: '123',
			name: 'test workflow',
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: false,
			nodeTypes: Helpers.NodeTypes(),
			pinData: workflow.pinData ?? {},
		}),
		workflow.runExecutionData || {},
		0,
		0,
		activeNode,
		workflow.connectionInputData,
		workflow.siblingParameters,
		'manual',
		{},
		workflow.executeData,
	);
	return dataProxy.getDataProxy();
};

// TODO:
// Looks like pairedItem getter in WorkflowDataProxy is doing it's job
// just not sure why are we getting undefined here
// Also need to test NotPinnedSet2 for $(PinnedSet).first().json
describe('Pinned data', () => {
	const proxy = getPairedItemProxy('NotPinnedSet1');
	test('$(PinnedSet).item.json', () => {
		expect(proxy.$('PinnedSet').item.json).toEqual({ firstName: 'Joe', lastName: 'Doe' });
	});
});

describe('WorkflowDataProxy', () => {
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
});
