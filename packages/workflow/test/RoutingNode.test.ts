import {
	INode,
	INodeExecutionData,
	INodeParameters,
	IRequestOptionsFromParameters,
	IRunExecutionData,
	RoutingNode,
	Workflow,
	INodeProperties,
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
} from '../src';

import * as Helpers from './Helpers';

const postReceiveFunction1 = async function (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	items.forEach((item) => (item.json1 = { success: true }));
	return items;
};

const preSendFunction1 = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.qs = (requestOptions.qs || {}) as IDataObject;
	// if something special is required it is possible to write custom code and get from parameter
	requestOptions.qs.sender = this.getNodeParameter('sender');
	return requestOptions;
};

describe('RoutingNode', () => {
	describe('getRequestOptionsFromParameters', () => {
		const tests: Array<{
			description: string;
			input: {
				nodeParameters: INodeParameters;
				nodeTypeProperties: INodeProperties;
			};
			output: IRequestOptionsFromParameters | undefined;
		}> = [
			{
				description: 'single parameter, only send defined, fixed value',
				input: {
					nodeParameters: {},
					nodeTypeProperties: {
						displayName: 'Email',
						name: 'email',
						type: 'string',
						routing: {
							send: {
								property: 'toEmail',
								type: 'body',
								value: 'fixedValue',
							},
						},
						default: '',
					},
				},
				output: {
					options: {
						qs: {},
						body: {
							toEmail: 'fixedValue',
						},
					},
					preSend: [],
					postReceive: [],
					requestOperations: {},
				},
			},
			{
				description: 'single parameter, only send defined, using expression',
				input: {
					nodeParameters: {
						email: 'test@test.com',
					},
					nodeTypeProperties: {
						displayName: 'Email',
						name: 'email',
						type: 'string',
						routing: {
							send: {
								property: 'toEmail',
								type: 'body',
								value: '={{$value.toUpperCase()}}',
							},
						},
						default: '',
					},
				},
				output: {
					options: {
						qs: {},
						body: {
							toEmail: 'TEST@TEST.COM',
						},
					},
					preSend: [],
					postReceive: [],
					requestOperations: {},
				},
			},
			{
				description: 'single parameter, send and operations defined, fixed value',
				input: {
					nodeParameters: {},
					nodeTypeProperties: {
						displayName: 'Email',
						name: 'email',
						type: 'string',
						routing: {
							send: {
								property: 'toEmail',
								type: 'body',
								value: 'fixedValue',
							},
							operations: {
								pagination: {
									type: 'offset',
									properties: {
										limitParameter: 'limit',
										offsetParameter: 'offset',
										pageSize: 10,
										rootProperty: 'data',
										type: 'body',
									},
								},
							},
						},
						default: '',
					},
				},
				output: {
					options: {
						qs: {},
						body: {
							toEmail: 'fixedValue',
						},
					},
					preSend: [],
					postReceive: [],
					requestOperations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'limit',
								offsetParameter: 'offset',
								pageSize: 10,
								rootProperty: 'data',
								type: 'body',
							},
						},
					},
				},
			},
			{
				description: 'mutliple parameters, complex example with everything',
				input: {
					nodeParameters: {
						multipleFields: {
							value1: 'v1',
							value2: 'v2',
							value3: 'v3',
							value4: 4,
							lowerLevel: {
								lowLevelValue1: 1,
								lowLevelValue2: 'llv2',
							},
							customPropertiesSingle1: {
								property: {
									name: 'cSName1',
									value: 'cSValue1',
								},
							},
							customPropertiesMulti: {
								property0: [
									{
										name: 'cM0Name1',
										value: 'cM0Value1',
									},
									{
										name: 'cM0Name2',
										value: 'cM0Value2',
									},
								],
								property1: [
									{
										name: 'cM1Name2',
										value: 'cM1Value2',
									},
									{
										name: 'cM1Name2',
										value: 'cM1Value2',
									},
								],
							},
						},
					},
					nodeTypeProperties: {
						displayName: 'Multiple Fields',
						name: 'multipleFields',
						type: 'collection',
						placeholder: 'Add Field',
						routing: {
							request: {
								method: 'GET',
								url: '/destination1',
							},
							operations: {
								pagination: {
									type: 'offset',
									properties: {
										limitParameter: 'limit1',
										offsetParameter: 'offset1',
										pageSize: 1,
										rootProperty: 'data1',
										type: 'body',
									},
								},
							},
							output: {
								maxResults: 10,
								postReceive: postReceiveFunction1,
							},
						},
						default: {},
						options: [
							{
								displayName: 'Value 1',
								name: 'value1',
								type: 'string',
								routing: {
									send: {
										property: 'value1',
										type: 'body',
									},
								},
								default: '',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'string',
								routing: {
									send: {
										property: 'topLevel.value2',
										propertyInDotNotation: false,
										type: 'body',
										preSend: preSendFunction1,
									},
								},
								default: '',
							},
							{
								displayName: 'Value 3',
								name: 'value3',
								type: 'string',
								routing: {
									send: {
										property: 'lowerLevel.value3',
										type: 'body',
									},
								},
								default: '',
							},
							{
								displayName: 'Value 4',
								name: 'value4',
								type: 'number',
								default: 0,
								routing: {
									send: {
										property: 'value4',
										type: 'query',
									},
									output: {
										maxResults: '={{$value}}',
									},
									operations: {
										pagination: {
											type: 'offset',
											properties: {
												limitParameter: 'limit100',
												offsetParameter: 'offset100',
												pageSize: 100,
												rootProperty: 'data100',
												type: 'query',
											},
										},
									},
								},
							},
							// This one should not be included
							{
								displayName: 'Value 5',
								name: 'value5',
								type: 'number',
								displayOptions: {
									show: {
										value4: [1],
									},
								},
								default: 5,
								routing: {
									send: {
										property: 'value5',
										type: 'query',
									},
									operations: {
										pagination: {
											type: 'offset',
											properties: {
												limitParameter: 'limit10',
												offsetParameter: 'offset10',
												pageSize: 10,
												rootProperty: 'data10',
												type: 'body',
											},
										},
									},
								},
							},
							{
								displayName: 'Lower Level',
								name: 'lowerLevel',
								type: 'collection',
								placeholder: 'Add Field',
								default: {},
								options: [
									{
										displayName: 'Low Level Value1',
										name: 'lowLevelValue1',
										type: 'number',
										default: 0,
										routing: {
											send: {
												property: 'llvalue1',
												type: 'query',
											},
										},
									},
									{
										displayName: 'Low Level Value2',
										name: 'lowLevelValue2',
										type: 'string',
										default: '',
										routing: {
											send: {
												property: 'llvalue2',
												type: 'query',
												preSend: preSendFunction1,
											},
											output: {
												postReceive: {
													type: 'rootProperty',
													properties: {
														property: 'data',
													},
												},
											},
										},
									},
								],
							},
							// Test fixed collection1: multipleValues=false
							{
								displayName: 'Custom Properties1 (single)',
								name: 'customPropertiesSingle1',
								placeholder: 'Add Custom Property',
								type: 'fixedCollection',
								default: {},
								options: [
									{
										name: 'property',
										displayName: 'Property',
										values: [
											// To set: { single-customValues: { name: 'name', value: 'value'} }
											{
												displayName: 'Property Name',
												name: 'name',
												type: 'string',
												default: '',
												routing: {
													request: {
														method: 'POST',
														url: '=/{{$value}}',
													},
													send: {
														property: 'single-customValues.name',
													},
												},
											},
											{
												displayName: 'Property Value',
												name: 'value',
												type: 'string',
												default: '',
												routing: {
													send: {
														property: 'single-customValues.value',
													},
												},
											},
										],
									},
								],
							},
							// Test fixed collection: multipleValues=true
							{
								displayName: 'Custom Properties (multi)',
								name: 'customPropertiesMulti',
								placeholder: 'Add Custom Property',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										name: 'property0',
										displayName: 'Property0',
										values: [
											// To set: { name0: 'value0', name1: 'value1' }
											{
												displayName: 'Property Name',
												name: 'name',
												type: 'string',
												default: '',
												description: 'Name of the property to set.',
											},
											{
												displayName: 'Property Value',
												name: 'value',
												type: 'string',
												default: '',
												routing: {
													send: {
														property: '=customMulti0.{{$parent.name}}',
														type: 'body',
													},
												},
												description: 'Value of the property to set.',
											},
										],
									},

									{
										name: 'property1',
										displayName: 'Property1',
										values: [
											// To set: { customValues: [ { name: 'name0', value: 'value0'}, { name: 'name1', value: 'value1'} ]}
											{
												displayName: 'Property Name',
												name: 'name',
												type: 'string',
												default: '',
												routing: {
													send: {
														property: '=customMulti1[{{$index}}].name',
														type: 'body',
													},
												},
											},
											{
												displayName: 'Property Value',
												name: 'value',
												type: 'string',
												default: '',
												routing: {
													send: {
														property: '=customMulti1[{{$index}}].value',
														type: 'body',
													},
												},
											},
										],
									},
								],
							},
						],
					},
				},
				output: {
					maxResults: 4,
					options: {
						method: 'POST',
						url: '/cSName1',
						qs: {
							value4: 4,
							llvalue1: 1,
							llvalue2: 'llv2',
							'single-customValues': {
								name: 'cSName1',
								value: 'cSValue1',
							},
						},
						body: {
							value1: 'v1',
							'topLevel.value2': 'v2',
							lowerLevel: {
								value3: 'v3',
							},
							customMulti0: {
								cM0Name1: 'cM0Value1',
								cM0Name2: 'cM0Value2',
							},
							customMulti1: [
								{
									name: 'cM1Name2',
									value: 'cM1Value2',
								},
								{
									name: 'cM1Name2',
									value: 'cM1Value2',
								},
							],
						},
					},
					preSend: [preSendFunction1, preSendFunction1],
					postReceive: [
						postReceiveFunction1,
						{
							type: 'rootProperty',
							properties: {
								property: 'data',
							},
						},
					],
					requestOperations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'limit100',
								offsetParameter: 'offset100',
								pageSize: 100,
								rootProperty: 'data100',
								type: 'query',
							},
						},
					},
				},
			},
		];

		const nodeTypes = Helpers.NodeTypes();
		const node: INode = {
			parameters: {},
			name: 'test',
			type: 'test.set',
			typeVersion: 1,
			position: [0, 0],
		};

		const mode = 'internal';
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
		const additionalData = Helpers.WorkflowExecuteAdditionalData();
		const path = '';
		const nodeType = nodeTypes.getByName(node.type);

		const workflowData = {
			nodes: [node],
			connections: {},
		};

		for (const testData of tests) {
			test(testData.description, () => {
				node.parameters = testData.input.nodeParameters;

				// @ts-ignore
				nodeType.description.properties = [testData.input.nodeTypeProperties];

				const workflow = new Workflow({
					nodes: workflowData.nodes,
					connections: workflowData.connections,
					active: false,
					nodeTypes,
				});

				const routingNode = new RoutingNode(
					workflow,
					node,
					connectionInputData,
					runExecutionData ?? null,
					additionalData,
					mode,
				);

				const executeSingleFunctions = Helpers.getExecuteSingleFunctions(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					{},
					node,
					itemIndex,
					additionalData,
					mode,
				);

				const result = routingNode.getRequestOptionsFromParameters(
					executeSingleFunctions,
					testData.input.nodeTypeProperties,
					itemIndex,
					runIndex,
					path,
					{},
				);

				expect(result).toEqual(testData.output);
			});
		}
	});
});
