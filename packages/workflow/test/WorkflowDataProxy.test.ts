import { Workflow, WorkflowDataProxy } from '../src';
import * as Helpers from './Helpers';
import { IConnections, INode, INodeExecutionData, IRunExecutionData } from '../src/Interfaces';

describe('WorkflowDataProxy', () => {
	describe('test data proxy', () => {
		const nodes: INode[] = [
			{
				parameters: {},
				name: 'Start',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-1',
				position: [100, 200],
			},
			{
				parameters: {
					functionCode:
						'// Code here will run only once, no matter how many input items there are.\n// More info and help: https://docs.n8n.io/nodes/n8n-nodes-base.function\nconst { DateTime, Duration, Interval } = require("luxon");\n\nconst data = [\n  {\n  "length": 105\n  },\n  {\n  "length": 160\n  },\n  {\n  "length": 121\n  },\n  {\n  "length": 275\n  },\n  {\n  "length": 950\n  },\n];\n\nreturn data.map(fact => ({json: fact}));',
				},
				name: 'Function',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-2',
				position: [280, 200],
			},
			{
				parameters: {
					keys: {
						key: [
							{
								currentKey: 'length',
								newKey: 'data',
							},
						],
					},
				},
				name: 'Rename',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-3',
				position: [460, 200],
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
		};

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {
					Function: [
						{
							startTime: 1,
							executionTime: 1,
							// @ts-ignore
							data: {
								main: [
									[
										{
											json: { length: 105 },
										},
										{
											json: { length: 160 },
										},
										{
											json: { length: 121 },
										},
										{
											json: { length: 275 },
										},
										{
											json: { length: 950 },
										},
									],
								],
							},
							source: [],
						},
					],
					Rename: [
						{
							startTime: 1,
							executionTime: 1,
							// @ts-ignore
							data: {
								main: [
									[
										{
											json: { data: 105 },
										},
										{
											json: { data: 160 },
										},
										{
											json: { data: 121 },
										},
										{
											json: { data: 275 },
										},
										{
											json: { data: 950 },
										},
									],
								],
							},
							source: [],
						},
					],
				},
			},
		};

		const renameNodeConnectionInputData: INodeExecutionData[] = [
			{ json: { length: 105 } },
			{ json: { length: 160 } },
			{ json: { length: 121 } },
			{ json: { length: 275 } },
			{ json: { length: 950 } },
		];

		const nodeTypes = Helpers.NodeTypes();
		const workflow = new Workflow({ nodes, connections, active: false, nodeTypes });

		const dataProxy = new WorkflowDataProxy(
			workflow,
			runExecutionData,
			0,
			0,
			'Rename',
			renameNodeConnectionInputData || [],
			{},
			'manual',
			'America/New_York',
			{},
		);
		const proxy = dataProxy.getDataProxy();

		test('test $("NodeName").all()', () => {
			expect(proxy.$('Rename').all()[1].json.data).toEqual(160);
		});
		test('test $("NodeName").all() length', () => {
			expect(proxy.$('Rename').all().length).toEqual(5);
		});
		test('test $("NodeName").item()', () => {
			expect(proxy.$('Rename').item().json.data).toEqual(105);
		});
		test('test $("NodeName").item(2)', () => {
			expect(proxy.$('Rename').item(2).json.data).toEqual(121);
		});
		test('test $("NodeName").first()', () => {
			expect(proxy.$('Rename').first().json.data).toEqual(105);
		});
		test('test $("NodeName").last()', () => {
			expect(proxy.$('Rename').last().json.data).toEqual(950);
		});

		test('test $input.all()', () => {
			expect(proxy.$input.all()[1].json.length).toEqual(160);
		});
		test('test $input.all() length', () => {
			expect(proxy.$input.all().length).toEqual(5);
		});
		test('test $input.item()', () => {
			expect(proxy.$input.item().json.length).toEqual(105);
		});
		test('test $thisItem', () => {
			expect(proxy.$thisItem.json.length).toEqual(105);
		});
		test('test $input.item(2)', () => {
			expect(proxy.$input.item(2).json.length).toEqual(121);
		});
		test('test $input.first()', () => {
			expect(proxy.$input.first().json.length).toEqual(105);
		});
		test('test $input.last()', () => {
			expect(proxy.$input.last().json.length).toEqual(950);
		});
	});
});
