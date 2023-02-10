import { IConnections, IExecuteData, INode, IRunExecutionData } from '@/Interfaces';
import { Workflow } from '@/Workflow';
import { WorkflowDataProxy } from '@/WorkflowDataProxy';
import * as Helpers from './Helpers';

describe('WorkflowDataProxy', () => {
	describe('test data proxy', () => {
		const nodes: INode[] = [
			{
				name: 'Start',
				type: 'test.set',
				parameters: {},
				typeVersion: 1,
				id: 'uuid-1',
				position: [100, 200],
			},
			{
				name: 'Function',
				type: 'test.set',
				parameters: {
					functionCode:
						'// Code here will run only once, no matter how many input items there are.\n// More info and help: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.function/\nconst { DateTime, Duration, Interval } = require("luxon");\n\nconst data = [\n  {\n  "length": 105\n  },\n  {\n  "length": 160\n  },\n  {\n  "length": 121\n  },\n  {\n  "length": 275\n  },\n  {\n  "length": 950\n  },\n];\n\nreturn data.map(fact => ({json: fact}));',
				},
				typeVersion: 1,
				id: 'uuid-2',
				position: [280, 200],
			},
			{
				name: 'Rename',
				type: 'test.set',
				parameters: {
					value1: 'data',
					value2: 'initialName',
				},
				typeVersion: 1,
				id: 'uuid-3',
				position: [460, 200],
			},
			{
				name: 'End',
				type: 'test.set',
				parameters: {},
				typeVersion: 1,
				id: 'uuid-4',
				position: [640, 200],
			},
		];

		const connections: IConnections = {
			Start: {
				main: [
					[
						{
							node: 'Function',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			Function: {
				main: [
					[
						{
							node: 'Rename',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			Rename: {
				main: [
					[
						{
							node: 'End',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {
					Start: [
						{
							startTime: 1,
							executionTime: 1,
							data: {
								main: [
									[
										{
											json: {},
										},
									],
								],
							},
							source: [],
						},
					],
					Function: [
						{
							startTime: 1,
							executionTime: 1,
							data: {
								main: [
									[
										{
											json: { initialName: 105 },
											pairedItem: { item: 0 },
										},
										{
											json: { initialName: 160 },
											pairedItem: { item: 0 },
										},
										{
											json: { initialName: 121 },
											pairedItem: { item: 0 },
										},
										{
											json: { initialName: 275 },
											pairedItem: { item: 0 },
										},
										{
											json: { initialName: 950 },
											pairedItem: { item: 0 },
										},
									],
								],
							},
							source: [
								{
									previousNode: 'Start',
								},
							],
						},
					],
					Rename: [
						{
							startTime: 1,
							executionTime: 1,
							data: {
								main: [
									[
										{
											json: { data: 105 },
											pairedItem: { item: 0 },
										},
										{
											json: { data: 160 },
											pairedItem: { item: 1 },
										},
										{
											json: { data: 121 },
											pairedItem: { item: 2 },
										},
										{
											json: { data: 275 },
											pairedItem: { item: 3 },
										},
										{
											json: { data: 950 },
											pairedItem: { item: 4 },
										},
									],
								],
							},
							source: [
								{
									previousNode: 'Function',
								},
							],
						},
					],
					End: [
						{
							startTime: 1,
							executionTime: 1,
							data: {
								main: [
									[
										{
											json: { data: 105 },
											pairedItem: { item: 0 },
										},
										{
											json: { data: 160 },
											pairedItem: { item: 1 },
										},
										{
											json: { data: 121 },
											pairedItem: { item: 2 },
										},
										{
											json: { data: 275 },
											pairedItem: { item: 3 },
										},
										{
											json: { data: 950 },
											pairedItem: { item: 4 },
										},
									],
								],
							},
							source: [
								{
									previousNode: 'Rename',
								},
							],
						},
					],
				},
			},
		};

		const nodeTypes = Helpers.NodeTypes();
		const workflow = new Workflow({
			id: '123',
			name: 'test workflow',
			nodes,
			connections,
			active: false,
			nodeTypes,
		});
		const nameLastNode = 'End';

		const lastNodeConnectionInputData =
			runExecutionData.resultData.runData[nameLastNode][0].data!.main[0];

		const executeData: IExecuteData = {
			data: runExecutionData.resultData.runData[nameLastNode][0].data!,
			node: nodes.find((node) => node.name === nameLastNode) as INode,
			source: {
				main: runExecutionData.resultData.runData[nameLastNode][0].source!,
			},
		};

		const dataProxy = new WorkflowDataProxy(
			workflow,
			runExecutionData,
			0,
			0,
			nameLastNode,
			lastNodeConnectionInputData || [],
			{},
			'manual',
			'America/New_York',
			{},
			executeData,
		);
		const proxy = dataProxy.getDataProxy();

		test('test $("NodeName").all()', () => {
			expect(proxy.$('Rename').all()[1].json.data).toEqual(160);
		});
		test('test $("NodeName").all() length', () => {
			expect(proxy.$('Rename').all().length).toEqual(5);
		});
		test('test $("NodeName").item', () => {
			expect(proxy.$('Rename').item).toEqual({ json: { data: 105 }, pairedItem: { item: 0 } });
		});
		test('test $("NodeNameEarlier").item', () => {
			expect(proxy.$('Function').item).toEqual({
				json: { initialName: 105 },
				pairedItem: { item: 0 },
			});
		});
		test('test $("NodeName").itemMatching(2)', () => {
			expect(proxy.$('Rename').itemMatching(2).json.data).toEqual(121);
		});
		test('test $("NodeName").first()', () => {
			expect(proxy.$('Rename').first().json.data).toEqual(105);
		});
		test('test $("NodeName").last()', () => {
			expect(proxy.$('Rename').last().json.data).toEqual(950);
		});

		test('test $("NodeName").params', () => {
			expect(proxy.$('Rename').params).toEqual({ value1: 'data', value2: 'initialName' });
		});

		test('test $input.all()', () => {
			expect(proxy.$input.all()[1].json.data).toEqual(160);
		});
		test('test $input.all() length', () => {
			expect(proxy.$input.all().length).toEqual(5);
		});
		test('test $input.first()', () => {
			expect(proxy.$input.first().json.data).toEqual(105);
		});
		test('test $input.last()', () => {
			expect(proxy.$input.last().json.data).toEqual(950);
		});
		test('test $input.item', () => {
			expect(proxy.$input.item.json.data).toEqual(105);
		});
		test('test $thisItem', () => {
			expect(proxy.$thisItem.json.data).toEqual(105);
		});

		test('test $binary', () => {
			expect(proxy.$binary).toEqual({});
		});

		test('test $json', () => {
			expect(proxy.$json).toEqual({ data: 105 });
		});

		test('test $itemIndex', () => {
			expect(proxy.$itemIndex).toEqual(0);
		});

		test('test $prevNode', () => {
			expect(proxy.$prevNode).toEqual({ name: 'Rename', outputIndex: 0, runIndex: 0 });
		});

		test('test $runIndex', () => {
			expect(proxy.$runIndex).toEqual(0);
		});

		test('test $workflow', () => {
			expect(proxy.$workflow).toEqual({
				active: false,
				id: '123',
				name: 'test workflow',
			});
		});
	});
});
