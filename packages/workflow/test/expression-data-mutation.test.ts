import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';
import { WorkflowDataProxy } from '../src/workflow-data-proxy';
import { createRunExecutionData } from '../src/run-execution-data-factory';
import { NodeConnectionTypes } from '../src/interfaces';
import type { IWorkflowBase, IRun, IExecuteData, INode } from '../src/interfaces';
import * as Helpers from './helpers';

/**
 * Regression test for GHC-7399
 *
 * Issue: Expressions can mutate data from previous nodes using JavaScript assignment operators.
 * When a user accidentally uses `=` instead of `==` in an expression like:
 * `{{ $if($json.input = 'b', true, false) }}`
 *
 * The assignment operator `=` modifies the original node's data, affecting all downstream
 * branches and nodes that reference the same data.
 *
 * Expected: Expressions should not be able to mutate data from previous nodes.
 * The data should be immutable or copied before being passed to expressions.
 */
describe('Expression data mutation (GHC-7399)', () => {
	const createWorkflow = (): IWorkflowBase => ({
		id: '123',
		name: 'test mutation workflow',
		nodes: [
			{
				id: 'node1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'node2',
				name: 'Set Input',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {},
			},
			{
				id: 'node3',
				name: 'Branch 1',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, -100],
				parameters: {},
			},
			{
				id: 'node4',
				name: 'Branch 2',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 100],
				parameters: {},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Set Input', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			'Set Input': {
				main: [
					[
						{ node: 'Branch 1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'Branch 2', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
		},
		active: false,
		activeVersionId: null,
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	const createRun = (): IRun => ({
		data: createRunExecutionData({
			resultData: {
				runData: {
					'Manual Trigger': [
						{
							startTime: 100,
							executionTime: 10,
							executionIndex: 0,
							source: [null],
							data: {
								main: [
									[
										{
											json: {},
										},
									],
								],
							},
						},
					],
					'Set Input': [
						{
							startTime: 110,
							executionTime: 10,
							executionIndex: 0,
							source: [{ previousNode: 'Manual Trigger' }],
							data: {
								main: [
									[
										{
											json: { input: 'a' },
										},
									],
								],
							},
						},
					],
				},
			},
		}),
		finished: true,
		mode: 'manual',
		startedAt: new Date(),
		stoppedAt: new Date(),
		status: 'success',
	});

	test('assignment operator in expression should NOT mutate previous node data', () => {
		const workflowData = createWorkflow();
		const run = createRun();

		const workflow = new Workflow({
			id: workflowData.id!,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: Helpers.NodeTypes(),
		});

		// Get the original data from "Set Input" node
		const setInputData = run.data.resultData.runData['Set Input']![0].data!.main[0]![0];
		expect(setInputData.json.input).toBe('a');

		// Simulate Branch 1 executing an expression with assignment operator
		const branch1TaskData = run.data.resultData.runData['Set Input']![0];
		const branch1ExecuteData: IExecuteData = {
			data: branch1TaskData.data!,
			node: workflowData.nodes.find((n) => n.name === 'Branch 1') as INode,
			source: {
				main: branch1TaskData.source,
			},
		};

		const branch1Proxy = new WorkflowDataProxy(
			workflow,
			run.data,
			0, // runIndex
			0, // itemIndex
			'Branch 1',
			branch1TaskData.data!.main[0]!,
			{},
			'manual',
			{},
			branch1ExecuteData,
		).getDataProxy();

		// This expression uses assignment (=) which mutates the object
		// Simulating: {{ $json.input = 'b' }}
		const expression = new Expression('UTC');
		const result = expression.resolveSimpleParameterValue('={{ $json.input = "b" }}', {}, branch1Proxy);

		// BUG: The original data should NOT be mutated
		// This is the failing assertion - IF the bug exists, the original data gets changed from 'a' to 'b'
		// Currently this test PASSES, meaning n8n's current implementation prevents this mutation
		expect(setInputData.json.input).toBe('a'); // Should still be 'a', not 'b'

		// Simulate Branch 2 accessing the same data
		const branch2TaskData = run.data.resultData.runData['Set Input']![0];
		const branch2ExecuteData: IExecuteData = {
			data: branch2TaskData.data!,
			node: workflowData.nodes.find((n) => n.name === 'Branch 2') as INode,
			source: {
				main: branch2TaskData.source,
			},
		};

		const branch2Proxy = new WorkflowDataProxy(
			workflow,
			run.data,
			0,
			0,
			'Branch 2',
			branch2TaskData.data!.main[0]!,
			{},
			'manual',
			{},
			branch2ExecuteData,
		).getDataProxy();

		// Branch 2 should see the original value 'a', not the mutated value 'b'
		expect(branch2Proxy.$json.input).toBe('a'); // Should be 'a', not 'b'
	});

	test('nested property assignment should NOT mutate previous node data', () => {
		const workflowData = createWorkflow();
		const run = createRun();

		// Modify run data to have nested object
		const setInputData = run.data.resultData.runData['Set Input']![0].data!.main[0]![0];
		setInputData.json = {
			user: {
				name: 'Alice',
				settings: {
					theme: 'light',
				},
			},
		};

		const workflow = new Workflow({
			id: workflowData.id!,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: Helpers.NodeTypes(),
		});

		const originalTheme = setInputData.json.user.settings.theme;
		expect(originalTheme).toBe('light');

		const branch1TaskData = run.data.resultData.runData['Set Input']![0];
		const branch1ExecuteData: IExecuteData = {
			data: branch1TaskData.data!,
			node: workflowData.nodes.find((n) => n.name === 'Branch 1') as INode,
			source: {
				main: branch1TaskData.source,
			},
		};

		const branch1Proxy = new WorkflowDataProxy(
			workflow,
			run.data,
			0,
			0,
			'Branch 1',
			branch1TaskData.data!.main[0]!,
			{},
			'manual',
			{},
			branch1ExecuteData,
		).getDataProxy();

		const expression = new Expression('UTC');
		// Expression that mutates nested property
		expression.resolveSimpleParameterValue(
			'={{ $json.user.settings.theme = "dark" }}',
			{},
			branch1Proxy,
		);

		// BUG: The original nested data should NOT be mutated
		expect(setInputData.json.user.settings.theme).toBe('light'); // Should still be 'light'
	});

	test('array element assignment should NOT mutate previous node data', () => {
		const workflowData = createWorkflow();
		const run = createRun();

		// Modify run data to have array
		const setInputData = run.data.resultData.runData['Set Input']![0].data!.main[0]![0];
		setInputData.json = {
			items: ['apple', 'banana', 'cherry'],
		};

		const workflow = new Workflow({
			id: workflowData.id!,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: Helpers.NodeTypes(),
		});

		expect(setInputData.json.items[1]).toBe('banana');

		const branch1TaskData = run.data.resultData.runData['Set Input']![0];
		const branch1ExecuteData: IExecuteData = {
			data: branch1TaskData.data!,
			node: workflowData.nodes.find((n) => n.name === 'Branch 1') as INode,
			source: {
				main: branch1TaskData.source,
			},
		};

		const branch1Proxy = new WorkflowDataProxy(
			workflow,
			run.data,
			0,
			0,
			'Branch 1',
			branch1TaskData.data!.main[0]!,
			{},
			'manual',
			{},
			branch1ExecuteData,
		).getDataProxy();

		const expression = new Expression('UTC');
		// Expression that mutates array element
		expression.resolveSimpleParameterValue('={{ $json.items[1] = "orange" }}', {}, branch1Proxy);

		// BUG: The original array should NOT be mutated
		expect(setInputData.json.items[1]).toBe('banana'); // Should still be 'banana'
	});
});
