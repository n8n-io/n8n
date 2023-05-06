import type {
	IBinaryKeyData,
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	NodeParameterValueType,
} from '@/Interfaces';
import { Workflow } from '@/Workflow';

process.env.TEST_VARIABLE_1 = 'valueEnvVariable1';

import * as Helpers from './Helpers';

interface StubNode {
	name: string;
	parameters: INodeParameters;
}

describe('Workflow', () => {
	describe('renameNodeInParameterValue for expressions', () => {
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
					value2: '={{$("NewName")["data"]["value2"] + \' - \' + $("NewName")["data"]["value2"]}}',
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

		const nodeTypes = Helpers.NodeTypes();
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

	describe('renameNodeInParameterValue for node with renamable content', () => {
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
			nodeTypes: Helpers.NodeTypes(),
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
										type: 'main',
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
										type: 'main',
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
										type: 'main',
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
										type: 'main',
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
										type: 'main',
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
										type: 'main',
										index: 0,
									},
									{
										node: 'Node5',
										type: 'main',
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
										type: 'main',
										index: 0,
									},
									{
										node: 'Node5',
										type: 'main',
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
										type: 'main',
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
										type: 'main',
										index: 0,
									},
									{
										node: 'Node5',
										type: 'main',
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
										type: 'main',
										index: 0,
									},
									{
										node: 'Node5',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
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

		const nodeTypes = Helpers.NodeTypes();
		let workflow: Workflow;

		function createNodeData(stubData: StubNode): INode {
			return {
				name: stubData.name,
				parameters: stubData.parameters,
				type: 'test.set',
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
		const timezone = 'America/New_York';

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
									type: 'main',
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
									type: 'main',
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
									type: 'main',
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
					runExecutionData.resultData.runData.Node1[0]!.data!.main[0]!;

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
						timezone,
						{},
					);
					expect(result).toEqual(testData.output[parameterName]);
				}
			});
		}

		// test('should be able to set and read key data without initial data set', () => {

		//     const nodes: Node[] = [
		//         {
		//             "name": "Node1",
		//             "parameters": {
		//                 "value": "outputSet1"
		//             },
		//             "type": "test.set",
		//             "typeVersion": 1,
		//             "position": [
		//                 100,
		//                 200
		//             ]
		//         },
		//         {
		//             "name": "Node2",
		//             "parameters": {
		//                 "name": "=[data.propertyName]"
		//             },
		//             "type": "test.set",
		//             "typeVersion": 1,
		//             "position": [
		//                 100,
		//                 300
		//             ]
		//         }
		//     ];
		//     const connections: Connections = {
		//         "Node1": {
		//             "main": [
		//                 [
		//                     {
		//                         "node": "Node2",
		//                         "type": "main",
		//                         "index": 0
		//                     }
		//                 ]
		//             ]
		//         }
		//     };

		//     const nodeTypes = Helpers.NodeTypes();
		//     const workflow = new Workflow({ nodes, connections, active: false, nodeTypes });
		//     const activeNodeName = 'Node2';

		//     const parameterValue = nodes.find((node) => node.name === activeNodeName).parameters.name;
		//     // const parameterValue = '=[data.propertyName]'; // TODO: Make this dynamic from node-data via "activeNodeName"!
		//     const runData: RunData = {
		//         Node1: [
		//             {
		//                 startTime: 1,
		//                 executionTime: 1,
		//                 data: {
		//                     main: [
		//                         [
		//                             {
		//                                 json: {
		//                                     propertyName: 'outputSet1'
		//                                 }
		//                             }
		//                         ]
		//                     ]
		//                 }
		//             }
		//         ]
		//     };

		//     const itemIndex = 0;
		//     const connectionInputData: NodeExecutionData[] = runData!['Node1']![0]!.data!.main[0]!;

		//     const result = workflow.getParameterValue(parameterValue, runData, itemIndex, activeNodeName, connectionInputData);

		//     expect(result).toEqual('outputSet1');
		// });

		test('should also resolve all child parameters when the parent get requested', () => {
			const nodeTypes = Helpers.NodeTypes();

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
				runExecutionData.resultData.runData.Node1[0]!.data!.main[0]!;
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
				timezone,
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
								type: 'main',
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
								type: 'main',
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
								type: 'main',
								index: 0,
							},
						],
						[
							{
								node: 'Set',
								type: 'main',
								index: 0,
							},
						],
						[
							{
								node: 'Set',
								type: 'main',
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
								type: 'main',
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
								type: 'main',
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
								type: 'main',
								index: 0,
							},
						],
						[], // todo why is null not accepted
						[
							{
								node: 'Switch',
								type: 'main',
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
								type: 'main',
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
								type: 'main',
								index: 0,
							},
							{
								node: 'Switch',
								type: 'main',
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
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

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
});
