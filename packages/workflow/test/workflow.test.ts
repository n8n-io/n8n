/* eslint-disable import/order */
import { mock } from 'vitest-mock-extended';

import { UserError } from '../src/errors';
import { NodeConnectionTypes } from '../src/interfaces';
import type {
	IBinaryKeyData,
	IConnection,
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	NodeParameterValueType,
} from '../src/interfaces';
import { Workflow } from '../src/workflow';

process.env.TEST_VARIABLE_1 = 'valueEnvVariable1';

// eslint-disable-next-line import/order
import * as Helpers from './helpers';

interface StubNode {
	name: string;
	parameters: INodeParameters;
	type?: string;
}

describe('Workflow', () => {
	const nodeTypes = Helpers.NodeTypes();

	const SIMPLE_WORKFLOW = new Workflow({
		nodeTypes,
		nodes: [
			{
				parameters: {},
				name: 'Start',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-1',
				position: [240, 300],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-2',
				position: [460, 300],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set1',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-3',
				position: [680, 300],
			},
		],
		connections: {
			Start: {
				main: [
					[
						{
							node: 'Set',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			Set: {
				main: [
					[
						{
							node: 'Set1',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		active: false,
	});

	const WORKFLOW_WITH_SWITCH = new Workflow({
		active: false,
		nodeTypes,
		nodes: [
			{
				parameters: {},
				name: 'Switch',
				type: 'test.switch',
				typeVersion: 1,
				id: 'uuid-1',
				position: [460, 300],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-2',
				position: [740, 300],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set1',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-3',
				position: [780, 100],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set2',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-4',
				position: [1040, 260],
			},
		],
		connections: {
			Switch: {
				main: [
					[
						{
							node: 'Set1',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
					[
						{
							node: 'Set',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
					[
						{
							node: 'Set',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			Set: {
				main: [
					[
						{
							node: 'Set2',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			Set1: {
				main: [
					[
						{
							node: 'Set2',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
	});

	const WORKFLOW_WITH_LOOPS = new Workflow({
		nodeTypes,
		active: false,
		nodes: [
			{
				parameters: {},
				name: 'Switch',
				type: 'test.switch',
				typeVersion: 1,
				id: 'uuid-1',
				position: [920, 340],
			},
			{
				parameters: {},
				name: 'Start',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-2',
				position: [240, 300],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set1',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-3',
				position: [700, 340],
			},
			{
				parameters: {
					options: {},
				},
				name: 'Set',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-4',
				position: [1220, 300],
			},
			{
				parameters: {},
				name: 'Switch',
				type: 'test.switch',
				typeVersion: 1,
				id: 'uuid-5',
				position: [920, 340],
			},
		],
		connections: {
			Switch: {
				main: [
					[
						{
							node: 'Set',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
					[], // todo why is null not accepted
					[
						{
							node: 'Switch',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			Start: {
				main: [
					[
						{
							node: 'Set1',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			Set1: {
				main: [
					[
						{
							node: 'Set1',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
						{
							node: 'Switch',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			Set: {
				main: [
					[
						{
							node: 'Set1',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
	});

	const WORKFLOW_WITH_MIXED_CONNECTIONS = new Workflow({
		nodeTypes,
		nodes: [
			{
				parameters: {},
				name: 'Start',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-1',
				position: [240, 300],
			},
			{
				parameters: {},
				name: 'AINode',
				type: 'test.ai',
				typeVersion: 1,
				id: 'uuid-2',
				position: [460, 300],
			},
			{
				parameters: {},
				name: 'Set1',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-3',
				position: [680, 300],
			},
		],
		connections: {
			Start: {
				main: [
					[
						{
							node: 'AINode',
							type: NodeConnectionTypes.AiAgent,
							index: 0,
						},
					],
				],
			},
			AINode: {
				ai: [
					[
						{
							node: 'Set1',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		active: false,
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('renameNodeInParameterValue', () => {
		describe('for expressions', () => {
			const tests = [
				{
					description: 'do nothing if there is no expression',
					input: {
						currentName: 'Node1',
						newName: 'Node1New',
						parameters: {
							value1: 'value1Node1',
							value2: 'value2Node1',
						},
					},
					output: {
						value1: 'value1Node1',
						value2: 'value2Node1',
					},
				},
				{
					description: 'should work with dot notation',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: "={{$node.Node1.data.value1 + 'Node1'}}",
							value2: "={{$node.Node1.data.value2 + ' - ' + $node.Node1.data.value2}}",
						},
					},
					output: {
						value1: "={{$node.NewName.data.value1 + 'Node1'}}",
						value2: "={{$node.NewName.data.value2 + ' - ' + $node.NewName.data.value2}}",
					},
				},
				{
					description: 'should work with ["nodeName"]',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: '={{$node["Node1"]["data"]["value1"] + \'Node1\'}}',
							value2:
								'={{$node["Node1"]["data"]["value2"] + \' - \' + $node["Node1"]["data"]["value2"]}}',
						},
					},
					output: {
						value1: '={{$node["NewName"]["data"]["value1"] + \'Node1\'}}',
						value2:
							'={{$node["NewName"]["data"]["value2"] + \' - \' + $node["NewName"]["data"]["value2"]}}',
					},
				},
				{
					description: 'should work with $("Node1")',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: '={{$("Node1")["data"]["value1"] + \'Node1\'}}',
							value2: '={{$("Node1")["data"]["value2"] + \' - \' + $("Node1")["data"]["value2"]}}',
						},
					},
					output: {
						value1: '={{$("NewName")["data"]["value1"] + \'Node1\'}}',
						value2:
							'={{$("NewName")["data"]["value2"] + \' - \' + $("NewName")["data"]["value2"]}}',
					},
				},
				{
					description: 'should work with $items("Node1")',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: '={{$items("Node1")["data"]["value1"] + \'Node1\'}}',
							value2:
								'={{$items("Node1")["data"]["value2"] + \' - \' + $items("Node1")["data"]["value2"]}}',
						},
					},
					output: {
						value1: '={{$items("NewName")["data"]["value1"] + \'Node1\'}}',
						value2:
							'={{$items("NewName")["data"]["value2"] + \' - \' + $items("NewName")["data"]["value2"]}}',
					},
				},
				{
					description: 'should work with $items("Node1", 0, 1)',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: '={{$items("Node1", 0, 1)["data"]["value1"] + \'Node1\'}}',
							value2:
								'={{$items("Node1", 0, 1)["data"]["value2"] + \' - \' + $items("Node1", 0, 1)["data"]["value2"]}}',
						},
					},
					output: {
						value1: '={{$items("NewName", 0, 1)["data"]["value1"] + \'Node1\'}}',
						value2:
							'={{$items("NewName", 0, 1)["data"]["value2"] + \' - \' + $items("NewName", 0, 1)["data"]["value2"]}}',
					},
				},
				{
					description: 'should work with dot notation that contains space and special character',
					input: {
						currentName: 'Node1',
						newName: 'New $ Name',
						parameters: {
							value1: "={{$node.Node1.data.value1 + 'Node1'}}",
							value2: "={{$node.Node1.data.value2 + ' - ' + $node.Node1.data.value2}}",
						},
					},
					output: {
						value1: '={{$node["New $ Name"].data.value1 + \'Node1\'}}',
						value2:
							'={{$node["New $ Name"].data.value2 + \' - \' + $node["New $ Name"].data.value2}}',
					},
				},
				{
					description: 'should work with dot notation that contains space and trailing $',
					input: {
						currentName: 'Node1',
						newName: 'NewName$',
						parameters: {
							value1: "={{$node.Node1.data.value1 + 'Node1'}}",
							value2: "={{$node.Node1.data.value2 + ' - ' + $node.Node1.data.value2}}",
						},
					},
					output: {
						value1: '={{$node["NewName$"].data.value1 + \'Node1\'}}',
						value2: '={{$node["NewName$"].data.value2 + \' - \' + $node["NewName$"].data.value2}}',
					},
				},
				{
					description: 'should work with dot notation that contains space and special character',
					input: {
						currentName: 'Node1',
						newName: 'NewName $ $& $` $$$',
						parameters: {
							value1: "={{$node.Node1.data.value1 + 'Node1'}}",
							value2: "={{$node.Node1.data.value2 + ' - ' + $node.Node1.data.value2}}",
						},
					},
					output: {
						value1: '={{$node["NewName $ $& $` $$$"].data.value1 + \'Node1\'}}',
						value2:
							'={{$node["NewName $ $& $` $$$"].data.value2 + \' - \' + $node["NewName $ $& $` $$$"].data.value2}}',
					},
				},
				{
					description: 'should work with dot notation without trailing dot',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: "={{$node.Node1 + 'Node1'}}",
							value2: "={{$node.Node1 + ' - ' + $node.Node1}}",
						},
					},
					output: {
						value1: "={{$node.NewName + 'Node1'}}",
						value2: "={{$node.NewName + ' - ' + $node.NewName}}",
					},
				},
				{
					description: "should work with ['nodeName']",
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							value1: "={{$node['Node1']['data']['value1'] + 'Node1'}}",
							value2:
								"={{$node['Node1']['data']['value2'] + ' - ' + $node['Node1']['data']['value2']}}",
						},
					},
					output: {
						value1: "={{$node['NewName']['data']['value1'] + 'Node1'}}",
						value2:
							"={{$node['NewName']['data']['value2'] + ' - ' + $node['NewName']['data']['value2']}}",
					},
				},
				{
					description: 'should work on lower levels',
					input: {
						currentName: 'Node1',
						newName: 'NewName',
						parameters: {
							level1a: "={{$node.Node1.data.value1 + 'Node1'}}",
							level1b: [
								{
									value2a: "={{$node.Node1.data.value1 + 'Node1'}}",
									value2b: "={{$node.Node1.data.value1 + 'Node1'}}",
								},
							],
							level1c: {
								value2a: {
									value3a: "={{$node.Node1.data.value1 + 'Node1'}}",
									value3b: [
										{
											value4a: "={{$node.Node1.data.value1 + 'Node1'}}",
											value4b: {
												value5a: "={{$node.Node1.data.value1 + 'Node1'}}",
												value5b: "={{$node.Node1.data.value1 + 'Node1'}}",
											},
										},
									],
								},
							},
						} as INodeParameters,
					},
					output: {
						level1a: "={{$node.NewName.data.value1 + 'Node1'}}",
						level1b: [
							{
								value2a: "={{$node.NewName.data.value1 + 'Node1'}}",
								value2b: "={{$node.NewName.data.value1 + 'Node1'}}",
							},
						],
						level1c: {
							value2a: {
								value3a: "={{$node.NewName.data.value1 + 'Node1'}}",
								value3b: [
									{
										value4a: "={{$node.NewName.data.value1 + 'Node1'}}",
										value4b: {
											value5a: "={{$node.NewName.data.value1 + 'Node1'}}",
											value5b: "={{$node.NewName.data.value1 + 'Node1'}}",
										},
									},
								],
							},
						},
					},
				},
			];

			const workflow = new Workflow({ nodes: [], connections: {}, active: false, nodeTypes });

			for (const testData of tests) {
				test(testData.description, () => {
					const result = workflow.renameNodeInParameterValue(
						testData.input.parameters,
						testData.input.currentName,
						testData.input.newName,
					);
					expect(result).toEqual(testData.output);
				});
			}
		});

		describe('for node with renamable content', () => {
			const tests = [
				{
					description: "should work with $('name')",
					input: {
						currentName: 'Old',
						newName: 'New',
						parameters: { jsCode: "$('Old').first();" },
					},
					output: { jsCode: "$('New').first();" },
				},
				{
					description: "should work with $node['name'] and $node.name",
					input: {
						currentName: 'Old',
						newName: 'New',
						parameters: { jsCode: "$node['Old'].first(); $node.Old.first();" },
					},
					output: { jsCode: "$node['New'].first(); $node.New.first();" },
				},
				{
					description: 'should work with $items()',
					input: {
						currentName: 'Old',
						newName: 'New',
						parameters: { jsCode: "$items('Old').first();" },
					},
					output: { jsCode: "$items('New').first();" },
				},
			];

			const workflow = new Workflow({
				nodes: [],
				connections: {},
				active: false,
				nodeTypes,
			});

			for (const t of tests) {
				test(t.description, () => {
					expect(
						workflow.renameNodeInParameterValue(
							t.input.parameters,
							t.input.currentName,
							t.input.newName,
							{ hasRenamableContent: true },
						),
					).toEqual(t.output);
				});
			}
		});
	});

	describe('renameNode', () => {
		const tests = [
			{
				description: 'rename node without connections',
				input: {
					currentName: 'Node1',
					newName: 'Node1New',
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
					],
					connections: {},
				},
				output: {
					nodes: [
						{
							name: 'Node1New',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
					],
					connections: {},
				},
			},
			{
				description: 'rename node with one output connection',
				input: {
					currentName: 'Node1',
					newName: 'Node1New',
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: 'value1Node2',
								value2: 'value2Node2',
							},
						},
					],
					connections: {
						Node1: {
							main: [
								[
									{
										node: 'Node2',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
				output: {
					nodes: [
						{
							name: 'Node1New',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: 'value1Node2',
								value2: 'value2Node2',
							},
						},
					],
					connections: {
						Node1New: {
							main: [
								[
									{
										node: 'Node2',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			{
				description: 'rename node with one input connection',
				input: {
					currentName: 'Node2',
					newName: 'Node2New',
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: 'value1Node2',
								value2: 'value2Node2',
							},
						},
					],
					connections: {
						Node1: {
							main: [
								[
									{
										node: 'Node2',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
				output: {
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2New',
							parameters: {
								value1: 'value1Node2',
								value2: 'value2Node2',
							},
						},
					],
					connections: {
						Node1: {
							main: [
								[
									{
										node: 'Node2New',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			{
				description: 'rename node with multiple input and output connection',
				input: {
					currentName: 'Node3',
					newName: 'Node3New',
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: 'value1Node2',
								value2: 'value2Node2',
							},
						},
						{
							name: 'Node3',
							parameters: {
								value1: 'value1Node3',
								value2: 'value2Node3',
							},
						},
						{
							name: 'Node4',
							parameters: {
								value1: 'value1Node4',
								value2: 'value2Node4',
							},
						},
						{
							name: 'Node5',
							parameters: {
								value1: 'value1Node5',
								value2: 'value2Node5',
							},
						},
					],
					connections: {
						Node1: {
							main: [
								[
									{
										node: 'Node3',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
						Node2: {
							main: [
								[
									{
										node: 'Node3',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
									{
										node: 'Node5',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
						Node3: {
							main: [
								[
									{
										node: 'Node4',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
									{
										node: 'Node5',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
				output: {
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: 'value1Node2',
								value2: 'value2Node2',
							},
						},
						{
							name: 'Node3New',
							parameters: {
								value1: 'value1Node3',
								value2: 'value2Node3',
							},
						},
						{
							name: 'Node4',
							parameters: {
								value1: 'value1Node4',
								value2: 'value2Node4',
							},
						},
						{
							name: 'Node5',
							parameters: {
								value1: 'value1Node5',
								value2: 'value2Node5',
							},
						},
					],
					connections: {
						Node1: {
							main: [
								[
									{
										node: 'Node3New',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
						Node2: {
							main: [
								[
									{
										node: 'Node3New',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
									{
										node: 'Node5',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
						Node3New: {
							main: [
								[
									{
										node: 'Node4',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
									{
										node: 'Node5',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			{
				description: 'rename node with jsCode parameter',
				input: {
					currentName: 'Node1',
					newName: 'Node1New',
					nodes: [
						{
							name: 'Node1',
							type: 'n8n-nodes-base.code',
							parameters: {
								jsCode: '$("Node1").params',
							},
						},
					],
					connections: {},
				},
				output: {
					nodes: [
						{
							name: 'Node1New',
							type: 'n8n-nodes-base.code',
							parameters: {
								jsCode: '$("Node1New").params',
							},
						},
					],
					connections: {},
				},
			},
			{
				description: 'rename node with html parameter',
				input: {
					currentName: 'Node1',
					newName: 'Node1New',
					nodes: [
						{
							name: 'Node1',
							type: 'n8n-nodes-base.html',
							parameters: {
								html: '$("Node1").params',
							},
						},
					],
					connections: {},
				},
				output: {
					nodes: [
						{
							name: 'Node1New',
							type: 'n8n-nodes-base.html',
							parameters: {
								html: '$("Node1New").params',
							},
						},
					],
					connections: {},
				},
			},
			{
				description: 'rename form node with html parameter',
				input: {
					currentName: 'Node1',
					newName: 'Node1New',
					nodes: [
						{
							name: 'Node1',
							type: 'n8n-nodes-base.form',
							parameters: {
								formFields: {
									values: [
										{
											fieldType: 'html',
											html: '$("Node1").params',
											elementName: '$("Node1").params',
										},
									],
								},
							},
						},
					],
					connections: {},
				},
				output: {
					nodes: [
						{
							name: 'Node1New',
							type: 'n8n-nodes-base.form',
							parameters: {
								formFields: {
									values: [
										{
											fieldType: 'html',
											html: '$("Node1New").params',
											elementName: '$("Node1").params',
										},
									],
								},
							},
						},
					],
					connections: {},
				},
			},
			// This does just a basic test if "renameNodeInParameterValue" gets used. More complex
			// tests with different formats and levels are in the separate tests for the function
			// "renameNodeInParameterValue"
			{
				description: 'change name also in expressions which use node-name (dot notation)',
				input: {
					currentName: 'Node1',
					newName: 'Node1New',
					nodes: [
						{
							name: 'Node1',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: "={{$node.Node1.data.value1 + 'Node1'}}",
								value2: "={{$node.Node1.data.value2 + ' - ' + $node.Node1.data.value2}}",
							},
						},
					],
					connections: {},
				},
				output: {
					nodes: [
						{
							name: 'Node1New',
							parameters: {
								value1: 'value1Node1',
								value2: 'value2Node1',
							},
						},
						{
							name: 'Node2',
							parameters: {
								value1: "={{$node.Node1New.data.value1 + 'Node1'}}",
								value2: "={{$node.Node1New.data.value2 + ' - ' + $node.Node1New.data.value2}}",
							},
						},
					],
					connections: {},
				},
			},
		];

		let workflow: Workflow;

		function createNodeData(stubData: StubNode): INode {
			return {
				name: stubData.name,
				parameters: stubData.parameters,
				type: stubData.type ?? 'test.set',
				typeVersion: 1,
				id: 'uuid-1234',
				position: [100, 100],
			};
		}

		let executeNodes: INode[];
		let resultNodes: {
			[key: string]: INode;
		};

		for (const testData of tests) {
			test(testData.description, () => {
				executeNodes = [];
				for (const node of testData.input.nodes) {
					executeNodes.push(createNodeData(node));
				}

				workflow = new Workflow({
					nodes: executeNodes,
					connections: testData.input.connections as IConnections,
					active: false,
					nodeTypes,
				});
				workflow.renameNode(testData.input.currentName, testData.input.newName);

				resultNodes = {};
				for (const node of testData.output.nodes) {
					resultNodes[node.name] = createNodeData(node);
				}

				expect(workflow.nodes).toEqual(resultNodes);
				expect(workflow.connectionsBySourceNode).toEqual(testData.output.connections);
			});
		}

		describe('with restricted node names', () => {
			const restrictedNames = [
				'hasOwnProperty',
				'isPrototypeOf',
				'propertyIsEnumerable',
				'toLocaleString',
				'toString',
				'valueOf',
				'constructor',
				'prototype',
				'__proto__',
				'__defineGetter__',
				'__defineSetter__',
				'__lookupGetter__',
				'__lookupSetter__',
			];

			test.each(restrictedNames)(
				'should throw error when renaming node to %s',
				(restrictedName) => {
					const workflow = new Workflow({
						nodes: [
							{
								name: 'Node1',
								parameters: {},
								type: 'test.set',
								typeVersion: 1,
								id: 'uuid-1',
								position: [100, 100],
							},
						],
						connections: {},
						active: false,
						nodeTypes,
					});

					expect(() => workflow.renameNode('Node1', restrictedName)).toThrow(
						`Node name "${restrictedName}" is a restricted name.`,
					);
				},
			);

			test.each(restrictedNames)(
				'should throw error when renaming node to %s with different case',
				(restrictedName) => {
					const workflow = new Workflow({
						nodes: [
							{
								name: 'Node1',
								parameters: {},
								type: 'test.set',
								typeVersion: 1,
								id: 'uuid-1',
								position: [100, 100],
							},
						],
						connections: {},
						active: false,
						nodeTypes,
					});

					const upperCaseName = restrictedName.toUpperCase();
					expect(() => workflow.renameNode('Node1', upperCaseName)).toThrow(
						`Node name "${upperCaseName}" is a restricted name.`,
					);
				},
			);

			test('should throw error with proper description', () => {
				const workflow = new Workflow({
					nodes: [
						{
							name: 'Node1',
							parameters: {},
							type: 'test.set',
							typeVersion: 1,
							id: 'uuid-1',
							position: [100, 100],
						},
					],
					connections: {},
					active: false,
					nodeTypes,
				});

				try {
					workflow.renameNode('Node1', 'toString');
				} catch (error) {
					if (!(error instanceof UserError)) {
						throw new Error('Expected error to be an instance of UserError');
					}
					expect(error).toBeInstanceOf(UserError);
					expect(error.message).toBe('Node name "toString" is a restricted name.');
					expect(error.description).toBe(
						'Node names cannot be any of the following: hasOwnProperty, isPrototypeOf, propertyIsEnumerable, toLocaleString, toString, valueOf, constructor, prototype, __proto__, __defineGetter__, __defineSetter__, __lookupGetter__, __lookupSetter__',
					);
				}
			});

			test('should allow renaming to names that contain restricted names as substring', () => {
				const workflow = new Workflow({
					nodes: [
						{
							name: 'Node1',
							parameters: {},
							type: 'test.set',
							typeVersion: 1,
							id: 'uuid-1',
							position: [100, 100],
						},
					],
					connections: {},
					active: false,
					nodeTypes,
				});

				// These should not throw as they're not exact matches
				expect(() => workflow.renameNode('Node1', 'myToString')).not.toThrow();
				expect(() => workflow.renameNode('Node1', 'toStringNode')).not.toThrow();
				expect(() => workflow.renameNode('Node1', 'hasOwnPropertyChecker')).not.toThrow();
			});
		});
	});

	describe('getParameterValue', () => {
		const tests: Array<{
			description: string;
			input: {
				[nodeName: string]: {
					parameters: Record<string, NodeParameterValueType>;
					outputJson?: IDataObject;
					outputBinary?: IBinaryKeyData;
				};
			};
			output: Record<string, unknown>;
		}> = [
			{
				description: 'read simple not expression value',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: 'valueNode2',
						},
					},
				},
				output: {
					value1: 'valueNode2',
				},
			},
			{
				description: 'read simple math expression',
				input: {
					Node1: {
						parameters: {
							value1: '',
						},
					},
					Node2: {
						parameters: {
							value1: '={{1+2}}',
						},
					},
				},
				output: {
					value1: 3,
				},
			},
			{
				description: 'read data from node-output-data with with long "$node.{NODE}.data" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node.Node1.data.value1}}',
						},
					},
				},
				output: {
					value1: 'valueNode1',
				},
			},
			{
				description:
					'read data from node-output-data with with long "$node.{NODE}.data" syntax add value and append text',
				input: {
					Node1: {
						parameters: {
							value1: 1,
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node.Node1.data.value1 + 2}} asdf',
						},
					},
				},
				output: {
					value1: '3 asdf',
				},
			},
			{
				description:
					'read deep-data from node-output-data with with long "$node.{NODE}.data" syntax with JavaScript Code',
				input: {
					Node1: {
						parameters: {
							value1: 'whatever',
						},
						// Overwrite the output data
						outputJson: {
							value1: {
								a: 1,
								b: 2,
								c: 3,
							},
						},
					},
					Node2: {
						parameters: {
							value1: '={{Object.keys($node.Node1.data.value1).join(", ")}}',
						},
					},
				},
				output: {
					value1: 'a, b, c',
				},
			},
			{
				description: 'read data from incoming-node-data with with short "data" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$data.value1}}',
						},
					},
				},
				output: {
					value1: 'valueNode1',
				},
			},
			{
				description: 'read deep-data from incoming-node-data with with short "data" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'whatever',
						},
						// Overwrite the output data
						outputJson: {
							value1: {
								a: {
									b: 'deepDataNode1',
								},
							},
						},
					},
					Node2: {
						parameters: {
							value1: '={{$data.value1.a.b}}',
						},
					},
				},
				output: {
					value1: 'deepDataNode1',
				},
			},
			{
				description:
					'read deep-data from node-output-data with with long "$node.{NODE}.data" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'whatever',
						},
						// Overwrite the output data
						outputJson: {
							value1: {
								a: {
									b: 'deepDataNode1',
								},
							},
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node.Node1.data.value1.a.b}}',
						},
					},
				},
				output: {
					value1: 'deepDataNode1',
				},
			},
			{
				description:
					'read binary-string-data from incoming-node-data with with short "$binary" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'whatever',
						},
						// Overwrite the output data
						outputBinary: {
							binaryKey: {
								data: '',
								type: '',
								mimeType: 'test',
								fileName: 'test-file1.jpg',
							},
						},
					},
					Node2: {
						parameters: {
							value1: '={{$binary.binaryKey.fileName}}',
						},
					},
				},
				output: {
					value1: 'test-file1.jpg',
				},
			},
			{
				description:
					'read binary-string-data from node-output-data with with long "$node.{NODE}.binary" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'whatever',
						},
						// Overwrite the output data
						outputBinary: {
							binaryKey: {
								data: '',
								type: '',
								mimeType: 'test',
								fileName: 'test-file1.jpg',
							},
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node.Node1.binary.binaryKey.fileName}}',
						},
					},
				},
				output: {
					value1: 'test-file1.jpg',
				},
			},
			{
				description: 'read parameter from other node with with long "$node.parameter" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node.Node1.parameter.value1}}',
						},
					},
				},
				output: {
					value1: 'valueNode1',
				},
			},
			{
				description: 'read environment data "$env" syntax which exists',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$env.TEST_VARIABLE_1}}',
						},
					},
				},
				output: {
					value1: 'valueEnvVariable1',
				},
			},
			{
				description: 'read environment data "$env" syntax which does not exists',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$env.DOES_NOT_EXIST}}',
						},
					},
				},
				output: {
					value1: undefined,
				},
			},
			{
				description: 'read parameter from current node with short "$parameter" syntax',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: 'valueNode2',
							value2: '={{$parameter.value1}}',
						},
					},
				},
				output: {
					value1: 'valueNode2',
					value2: 'valueNode2',
				},
			},
			{
				description:
					'return resolved value when referencing another property with expression (long "$node.{NODE}.data" syntax)',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node.Node1.data.value1}}',
							value2: '={{$parameter.value1}}',
						},
					},
				},
				output: {
					value1: 'valueNode1',
					value2: 'valueNode1',
				},
			},
			{
				description:
					'return resolved value when referencing another property with expression (short "data" syntax)',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$data.value1}}',
							value2: '={{$parameter.value1}}',
						},
					},
				},
				output: {
					value1: 'valueNode1',
					value2: 'valueNode1',
				},
			},
			{
				description:
					'return resolved value when referencing another property with expression when a node has spaces (long "$node["{NODE}"].parameter" syntax)',
				input: {
					'Node 4 with spaces': {
						parameters: {
							value1: '',
						},
					},
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node["Node 4 with spaces"].parameter.value1}}',
						},
					},
				},
				output: {
					value1: 'default-value1',
				},
			},
			{
				description:
					'return resolved value when referencing another property with expression on another node (long "$node["{NODE}"].parameter" syntax)',
				input: {
					Node1: {
						parameters: {
							value1: 'valueNode1',
						},
					},
					Node2: {
						parameters: {
							value1: '={{$node["Node1"].parameter.value1}}a',
						},
					},
					Node3: {
						parameters: {
							value1: '={{$node["Node2"].parameter.value1}}b',
						},
					},
				},
				output: {
					value1: 'valueNode1ab',
				},
			},
			// TODO: Make that this test does not fail!
			// {
			//     description: 'return resolved value when short "data" syntax got used in expression on parameter of not active node which got referenced by active one',
			//     input: {
			//         Node1: {
			//             parameters: {
			//                 value1: 'valueNode1',
			//             }
			//         },
			//         Node2: {
			//             parameters: {
			//                 value1: '={{$data.value1}}-Node2',
			//             },
			//         },
			//         Node3: {
			//             parameters: {
			//                 value1: '={{$data.value1}}-Node3+1',
			//                 value2: '={{node.Node2.data.value1}}-Node3+2',
			//             },
			//         }
			//     },
			//     output: {
			//         value1: 'valueNode1-Node2-Node3+1',
			//         value2: 'valueNode1-Node2-Node3+2',
			//     },
			// },
		];

		const nodeTypes = Helpers.NodeTypes();

		for (const testData of tests) {
			test(testData.description, () => {
				const nodes: INode[] = [
					{
						name: 'Node1',
						parameters: testData.input.Node1.parameters,
						type: 'test.set',
						typeVersion: 1,
						id: 'uuid-1',
						position: [100, 100],
					},
					{
						name: 'Node2',
						parameters: testData.input.Node2.parameters,
						type: 'test.set',
						typeVersion: 1,
						id: 'uuid-2',
						position: [100, 200],
					},
					{
						name: 'Node3',
						parameters: testData.input.hasOwnProperty('Node3')
							? testData.input.Node3?.parameters
							: {},
						type: 'test.set',
						typeVersion: 1,
						id: 'uuid-3',
						position: [100, 300],
					},
					{
						name: 'Node 4 with spaces',
						parameters: testData.input.hasOwnProperty('Node4')
							? testData.input.Node4.parameters
							: {},
						type: 'test.set',
						typeVersion: 1,
						id: 'uuid-4',
						position: [100, 400],
					},
				];
				const connections: IConnections = {
					Node1: {
						main: [
							[
								{
									node: 'Node2',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
							],
						],
					},
					Node2: {
						main: [
							[
								{
									node: 'Node3',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
							],
						],
					},
					'Node 4 with spaces': {
						main: [
							[
								{
									node: 'Node2',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
							],
						],
					},
				};

				const workflow = new Workflow({ nodes, connections, active: false, nodeTypes });
				const activeNodeName = testData.input.hasOwnProperty('Node3') ? 'Node3' : 'Node2';

				const runExecutionData: IRunExecutionData = {
					resultData: {
						runData: {
							Node1: [
								{
									source: [
										{
											previousNode: 'test',
										},
									],
									startTime: 1,
									executionTime: 1,
									executionIndex: 0,
									data: {
										main: [
											[
												{
													json: testData.input.Node1.outputJson || testData.input.Node1.parameters,
													binary: testData.input.Node1.outputBinary,
												},
											],
										],
									},
								},
							],
							Node2: [],
							'Node 4 with spaces': [],
						},
					},
				};

				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] =
					runExecutionData.resultData.runData.Node1[0].data!.main[0]!;

				for (const parameterName of Object.keys(testData.output)) {
					const parameterValue = nodes.find((node) => node.name === activeNodeName)!.parameters[
						parameterName
					];
					const result = workflow.expression.getParameterValue(
						parameterValue,
						runExecutionData,
						runIndex,
						itemIndex,
						activeNodeName,
						connectionInputData,
						'manual',
						{},
					);
					expect(result).toEqual(testData.output[parameterName]);
				}
			});
		}

		test('should also resolve all child parameters when the parent get requested', () => {
			const nodes: INode[] = [
				{
					name: 'Node1',
					parameters: {
						values: {
							string: [
								{
									name: 'name1',
									value: 'value1',
								},
								{
									name: 'name2',
									value: '={{$parameter.values.string[0].value}}A',
								},
							],
						},
					},
					type: 'test.setMulti',
					typeVersion: 1,
					id: 'uuid-1234',
					position: [100, 100],
				},
			];
			const connections: IConnections = {};

			const workflow = new Workflow({ nodes, connections, active: false, nodeTypes });
			const activeNodeName = 'Node1';

			const runExecutionData: IRunExecutionData = {
				resultData: {
					runData: {
						Node1: [
							{
								startTime: 1,
								executionTime: 1,
								executionIndex: 0,
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
					},
				},
			};

			const itemIndex = 0;
			const runIndex = 0;
			const connectionInputData: INodeExecutionData[] =
				runExecutionData.resultData.runData.Node1[0].data!.main[0]!;
			const parameterName = 'values';

			const parameterValue = nodes.find((node) => node.name === activeNodeName)!.parameters[
				parameterName
			];
			const result = workflow.expression.getParameterValue(
				parameterValue,
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				'manual',
				{},
			);

			expect(result).toEqual({
				string: [
					{
						name: 'name1',
						value: 'value1',
					},
					{
						name: 'name2',
						value: 'value1A',
					},
				],
			});
		});
	});

	describe('getParentNodesByDepth', () => {
		test('Should return parent nodes of nodes', () => {
			expect(SIMPLE_WORKFLOW.getParentNodesByDepth('Start')).toEqual([]);
			expect(SIMPLE_WORKFLOW.getParentNodesByDepth('Set')).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Start',
				},
			]);
			expect(SIMPLE_WORKFLOW.getParentNodesByDepth('Set1')).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Set',
				},
				{
					depth: 2,
					indicies: [0],
					name: 'Start',
				},
			]);
		});

		test('Should return parent up to depth', () => {
			expect(SIMPLE_WORKFLOW.getParentNodesByDepth('Set1', 0)).toEqual([]);
			expect(SIMPLE_WORKFLOW.getParentNodesByDepth('Set1', 1)).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Set',
				},
			]);
		});

		test('Should return all parents with depth of -1', () => {
			expect(SIMPLE_WORKFLOW.getParentNodesByDepth('Set1', -1)).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Set',
				},
				{
					depth: 2,
					indicies: [0],
					name: 'Start',
				},
			]);
		});

		test('Should return parents of nodes with all connected output indicies', () => {
			expect(WORKFLOW_WITH_SWITCH.getParentNodesByDepth('Switch')).toEqual([]);
			expect(WORKFLOW_WITH_SWITCH.getParentNodesByDepth('Set1')).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Switch',
				},
			]);
			expect(WORKFLOW_WITH_SWITCH.getParentNodesByDepth('Set')).toEqual([
				{
					depth: 1,
					indicies: [1, 2],
					name: 'Switch',
				},
			]);

			expect(WORKFLOW_WITH_SWITCH.getParentNodesByDepth('Set2')).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Set',
				},
				{
					depth: 1,
					indicies: [0],
					name: 'Set1',
				},
				{
					depth: 2,
					indicies: [1, 2, 0],
					name: 'Switch',
				},
			]);
		});

		test('Should handle loops within workflows', () => {
			expect(WORKFLOW_WITH_LOOPS.getParentNodesByDepth('Start')).toEqual([]);
			expect(WORKFLOW_WITH_LOOPS.getParentNodesByDepth('Set')).toEqual([
				{
					depth: 1,
					indicies: [0, 2],
					name: 'Switch',
				},
				{
					depth: 2,
					indicies: [0],
					name: 'Set1',
				},
				{
					depth: 3,
					indicies: [0],
					name: 'Start',
				},
			]);
			expect(WORKFLOW_WITH_LOOPS.getParentNodesByDepth('Switch')).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Set1',
				},
				{
					depth: 2,
					indicies: [0],
					name: 'Start',
				},
				{
					depth: 2,
					indicies: [0],
					name: 'Set',
				},
			]);
			expect(WORKFLOW_WITH_LOOPS.getParentNodesByDepth('Set1')).toEqual([
				{
					depth: 1,
					indicies: [0],
					name: 'Start',
				},
				{
					depth: 1,
					indicies: [0],
					name: 'Set',
				},
				{
					depth: 2,
					indicies: [0, 2],
					name: 'Switch',
				},
			]);
		});
	});

	describe('getConnectionsByDestination', () => {
		it('should return empty object when there are no connections', () => {
			const result = Workflow.getConnectionsByDestination({});

			expect(result).toEqual({});
		});

		it('should return connections by destination node', () => {
			const connections: IConnections = {
				Node1: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Node3', type: NodeConnectionTypes.Main, index: 1 },
						],
					],
				},
			};
			const result = Workflow.getConnectionsByDestination(connections);
			expect(result).toEqual({
				Node2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Node3: {
					[NodeConnectionTypes.Main]: [
						[],
						[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			});
		});

		it('should handle multiple connection types', () => {
			const connections: IConnections = {
				Node1: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }],
					],
					[NodeConnectionTypes.AiAgent]: [
						[{ node: 'Node3', type: NodeConnectionTypes.AiAgent, index: 0 }],
					],
				},
			};

			const result = Workflow.getConnectionsByDestination(connections);
			expect(result).toEqual({
				Node2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Node3: {
					[NodeConnectionTypes.AiAgent]: [
						[{ node: 'Node1', type: NodeConnectionTypes.AiAgent, index: 0 }],
					],
				},
			});
		});

		it('should handle nodes with no connections', () => {
			const connections: IConnections = {
				Node1: {
					[NodeConnectionTypes.Main]: [[]],
				},
			};

			const result = Workflow.getConnectionsByDestination(connections);
			expect(result).toEqual({});
		});

		// @issue https://linear.app/n8n/issue/N8N-7880/cannot-load-some-templates
		it('should handle nodes with null connections', () => {
			const connections: IConnections = {
				Node1: {
					[NodeConnectionTypes.Main]: [
						null as unknown as IConnection[],
						[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = Workflow.getConnectionsByDestination(connections);
			expect(result).toEqual({
				Node2: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 1 }],
					],
				},
			});
		});

		it('should handle nodes with multiple input connections', () => {
			const connections: IConnections = {
				Node1: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Node3: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			const result = Workflow.getConnectionsByDestination(connections);
			expect(result).toEqual({
				Node2: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Node3', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			});
		});
	});

	describe('getHighestNode', () => {
		const createNode = (name: string, disabled = false) =>
			({
				name,
				type: 'test.set',
				typeVersion: 1,
				disabled,
				position: [0, 0],
				parameters: {},
			}) as INode;

		test('should return node name if node is not disabled', () => {
			const node = createNode('Node1');
			const workflow = new Workflow({
				id: 'test',
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(node.name);
			expect(result).toEqual([node.name]);
		});

		test('should return empty array if node is disabled', () => {
			const node = createNode('Node1', true);
			const workflow = new Workflow({
				id: 'test',
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(node.name);
			expect(result).toEqual([]);
		});

		test('should return highest nodes when multiple parent nodes exist', () => {
			const node1 = createNode('Node1');
			const node2 = createNode('Node2');
			const node3 = createNode('Node3');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node1: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				Node2: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, node2, node3, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(targetNode.name);
			expect(result).toEqual([node1.name, node2.name]);
		});

		test('should ignore disabled parent nodes', () => {
			const node1 = createNode('Node1', true);
			const node2 = createNode('Node2');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node1: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				Node2: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, node2, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(targetNode.name);
			expect(result).toEqual([node2.name]);
		});

		test('should handle nested connections', () => {
			const node1 = createNode('Node1');
			const node2 = createNode('Node2');
			const node3 = createNode('Node3');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node3: {
					main: [
						[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				TargetNode: {
					main: [[{ node: 'Node3', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, node2, node3, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(targetNode.name);
			expect(result).toEqual([targetNode.name]);
		});

		test('should handle specified connection index', () => {
			const node1 = createNode('Node1');
			const node2 = createNode('Node2');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node1: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				Node2: {
					main: [[], [{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 1 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, node2, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const resultFirstIndex = workflow.getHighestNode(targetNode.name, 0);
			const resultSecondIndex = workflow.getHighestNode(targetNode.name, 1);

			expect(resultFirstIndex).toEqual([node1.name]);
			expect(resultSecondIndex).toEqual([node2.name]);
		});

		test('should prevent infinite loops with cyclic connections', () => {
			const node1 = createNode('Node1');
			const node2 = createNode('Node2');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node1: {
					main: [[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				Node2: {
					main: [[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				TargetNode: {
					main: [[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, node2, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(targetNode.name);
			expect(result).toEqual([targetNode.name]);
		});

		test('should handle connections to nodes that are not defined in the workflow', () => {
			const node1 = createNode('Node1');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node1: {
					main: [[{ node: 'NonExistentNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				TargetNode: {
					main: [[{ node: 'NonExistentNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(targetNode.name);

			expect(result).toEqual([targetNode.name]);
		});

		test('should handle connections from nodes that are not defined in the workflow', () => {
			const node1 = createNode('Node1');
			const targetNode = createNode('TargetNode');

			const connections = {
				Node1: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				NonExistentNode: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [node1, targetNode],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getHighestNode(targetNode.name);
			expect(result).toEqual([node1.name]);
		});
	});

	describe('getParentMainInputNode', () => {
		test('should return the node itself if no parent connections exist', () => {
			const startNode = SIMPLE_WORKFLOW.getNode('Start')!;
			const result = SIMPLE_WORKFLOW.getParentMainInputNode(startNode);
			expect(result).toBe(startNode);
		});

		test('should return direct main input parent node', () => {
			const set1Node = SIMPLE_WORKFLOW.getNode('Set1')!;
			const result = SIMPLE_WORKFLOW.getParentMainInputNode(set1Node);
			expect(result).toBe(set1Node);
		});

		test('should traverse through non-main connections to find main input', () => {
			const set1Node = WORKFLOW_WITH_MIXED_CONNECTIONS.getNode('Set1')!;
			const result = WORKFLOW_WITH_MIXED_CONNECTIONS.getParentMainInputNode(set1Node);
			expect(result).toBe(set1Node);
		});

		test('should handle nested non-main connections', () => {
			const set1Node = WORKFLOW_WITH_LOOPS.getNode('Set1')!;
			const result = WORKFLOW_WITH_LOOPS.getParentMainInputNode(set1Node);
			expect(result).toBe(set1Node);
		});
	});

	describe('getNodeConnectionIndexes', () => {
		test('should return undefined for non-existent parent node', () => {
			const result = SIMPLE_WORKFLOW.getNodeConnectionIndexes('Set', 'NonExistentNode');
			expect(result).toBeUndefined();
		});

		test('should return undefined for nodes without connections', () => {
			const result = SIMPLE_WORKFLOW.getNodeConnectionIndexes('Start', 'Set1');
			expect(result).toBeUndefined();
		});

		test('should return correct connection indexes for direct connections', () => {
			const result = SIMPLE_WORKFLOW.getNodeConnectionIndexes('Set', 'Start');
			expect(result).toEqual({
				sourceIndex: 0,
				destinationIndex: 0,
			});
		});

		test('should return correct connection indexes for multi-step connections', () => {
			const result = SIMPLE_WORKFLOW.getNodeConnectionIndexes('Set1', 'Start');
			expect(result).toEqual({
				sourceIndex: 0,
				destinationIndex: 0,
			});
		});

		test('should return undefined when depth is 0', () => {
			const result = SIMPLE_WORKFLOW.getNodeConnectionIndexes(
				'Set',
				'Start',
				NodeConnectionTypes.Main,
				0,
			);
			expect(result).toBeUndefined();
		});

		test('should handle workflows with multiple connection indexes', () => {
			const result = WORKFLOW_WITH_SWITCH.getNodeConnectionIndexes('Set', 'Switch');
			expect(result).toEqual({
				sourceIndex: 1,
				destinationIndex: 0,
			});
		});
	});

	describe('getStartNode', () => {
		const manualTriggerNode = mock<INode>({
			name: 'ManualTrigger',
			type: 'n8n-nodes-base.manualTrigger',
		});
		const scheduleTriggerNode = mock<INode>({
			name: 'ScheduleTrigger',
			type: 'n8n-nodes-base.scheduleTrigger',
		});
		const httpRequestNode = mock<INode>({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
		});
		const set1Node = mock<INode>({
			name: 'Set1',
			type: 'n8n-nodes-base.set',
		});
		const disabledSetNode = mock<INode>({
			name: 'Set Disabled',
			type: 'n8n-nodes-base.set',
			disabled: true,
		});

		test('returns first trigger node when multiple start nodes exist', () => {
			const workflow = new Workflow({
				nodes: [manualTriggerNode, scheduleTriggerNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			expect(workflow.getStartNode()).toBe(scheduleTriggerNode);
		});

		test('returns first starting node type when no trigger nodes are present', () => {
			const workflow = new Workflow({
				nodes: [httpRequestNode, set1Node],
				connections: {},
				active: false,
				nodeTypes,
			});

			expect(workflow.getStartNode()).toBe(httpRequestNode);
		});

		test('returns undefined when all nodes are disabled', () => {
			const workflow = new Workflow({
				nodes: [disabledSetNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			expect(workflow.getStartNode()).toBeUndefined();
		});

		test('returns the single node when only one non-disabled node exists', () => {
			const singleNode = {
				name: 'SingleNode',
				type: 'test.set',
				typeVersion: 1,
				id: 'uuid-single',
				position: [0, 0],
				parameters: {},
			} as INode;
			const workflow = new Workflow({
				nodes: [singleNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			expect(workflow.getStartNode()).toBe(singleNode);
		});
	});

	describe('getNode', () => {
		test('should return the node with the given name if it exists', () => {
			const workflow = SIMPLE_WORKFLOW;
			const node = workflow.getNode('Start');
			expect(node).not.toBeNull();
			expect(node?.name).toBe('Start');
			expect(node?.type).toBe('test.set');
			expect(node?.id).toBe('uuid-1');
		});

		test('should return null if the node does not exist', () => {
			const nonExistentNode = SIMPLE_WORKFLOW.getNode('NonExistentNode');
			expect(nonExistentNode).toBeNull();
		});
	});

	describe('getNodes', () => {
		test('should return all requested nodes that exist', () => {
			const nodes = SIMPLE_WORKFLOW.getNodes(['Start', 'Set', 'Set1']);
			expect(nodes).toHaveLength(3);
			expect(nodes[0].name).toBe('Start');
			expect(nodes[1].name).toBe('Set');
			expect(nodes[2].name).toBe('Set1');
		});

		test('should return nodes in the order they were requested', () => {
			const nodes = SIMPLE_WORKFLOW.getNodes(['Set1', 'Start', 'Set']);
			expect(nodes).toHaveLength(3);
			expect(nodes[0].name).toBe('Set1');
			expect(nodes[1].name).toBe('Start');
			expect(nodes[2].name).toBe('Set');
		});

		test('should skip nodes that do not exist and log a warning', () => {
			// Spy on console.warn
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const nodes = SIMPLE_WORKFLOW.getNodes(['Start', 'NonExistentNode', 'Set1']);
			expect(nodes).toHaveLength(2);
			expect(nodes[0].name).toBe('Start');
			expect(nodes[1].name).toBe('Set1');
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Could not find a node with the name NonExistentNode'),
			);
		});

		test('should return an empty array if none of the requested nodes exist', () => {
			// Spy on console.warn
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const nodes = SIMPLE_WORKFLOW.getNodes(['NonExistentNode1', 'NonExistentNode2']);
			expect(nodes).toHaveLength(0);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
		});

		test('should handle an empty array of node names', () => {
			const nodes = SIMPLE_WORKFLOW.getNodes([]);
			expect(nodes).toHaveLength(0);
		});
	});
	describe('getConnectionsBetweenNodes', () => {
		test('should return empty array if no connections exist between sources and targets', () => {
			const result = SIMPLE_WORKFLOW.getConnectionsBetweenNodes(['Start'], ['Set1']);
			expect(result).toEqual([]);
		});

		test('should return connections between a single source and target', () => {
			const result = SIMPLE_WORKFLOW.getConnectionsBetweenNodes(['Start'], ['Set']);
			expect(result).toEqual([
				[
					{ node: 'Start', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'Set', type: NodeConnectionTypes.Main, index: 0 },
				],
			]);
		});

		test('should return connections between multiple sources and a single target', () => {
			const connections: IConnections = {
				Node1: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				Node2: {
					main: [[{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [
					{
						id: 'Node1',
						name: 'Node1',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'Node2',
						name: 'Node2',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'TargetNode',
						name: 'TargetNode',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getConnectionsBetweenNodes(['Node1', 'Node2'], ['TargetNode']);
			expect(result).toEqual([
				[
					{ node: 'Node1', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 },
				],
				[
					{ node: 'Node2', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 },
				],
			]);
		});

		test('should return connections between a single source and multiple targets', () => {
			const connections: IConnections = {
				Node1: {
					main: [
						[
							{ node: 'TargetNode1', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'TargetNode2', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [
					{
						id: 'Node1',
						name: 'Node1',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'TargetNode1',
						name: 'TargetNode1',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'TargetNode2',
						name: 'TargetNode2',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getConnectionsBetweenNodes(['Node1'], ['TargetNode1', 'TargetNode2']);
			expect(result).toEqual([
				[
					{ node: 'Node1', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'TargetNode1', type: NodeConnectionTypes.Main, index: 0 },
				],
				[
					{ node: 'Node1', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'TargetNode2', type: NodeConnectionTypes.Main, index: 0 },
				],
			]);
		});

		test('should handle workflows with multiple connection types', () => {
			const connections: IConnections = {
				Node1: {
					main: [
						[
							{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 1 },
						],
					],
					[NodeConnectionTypes.AiAgent]: [
						[{ node: 'TargetNode', type: NodeConnectionTypes.AiAgent, index: 0 }],
					],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [
					{
						id: 'Node1',
						name: 'Node1',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'TargetNode',
						name: 'TargetNode',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getConnectionsBetweenNodes(['Node1'], ['TargetNode']);
			expect(result).toEqual([
				[
					{ node: 'Node1', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 0 },
				],
				[
					{ node: 'Node1', index: 0, type: NodeConnectionTypes.Main },
					{ node: 'TargetNode', type: NodeConnectionTypes.Main, index: 1 },
				],
				[
					{ node: 'Node1', index: 0, type: NodeConnectionTypes.AiAgent },
					{ node: 'TargetNode', type: NodeConnectionTypes.AiAgent, index: 0 },
				],
			]);
		});

		test('should handle nodes with no connections', () => {
			const connections: IConnections = {
				Node1: {
					main: [[]],
				},
			};

			const workflow = new Workflow({
				id: 'test',
				nodes: [
					{
						id: 'Node1',
						name: 'Node1',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'TargetNode',
						name: 'TargetNode',
						type: 'test.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections,
				active: false,
				nodeTypes,
			});

			const result = workflow.getConnectionsBetweenNodes(['Node1'], ['TargetNode']);
			expect(result).toEqual([]);
		});
	});
});
