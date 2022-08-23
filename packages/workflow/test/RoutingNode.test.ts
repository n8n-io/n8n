import {
	INode,
	INodeExecutionData,
	INodeParameters,
	DeclarativeRestApiSettings,
	IRunExecutionData,
	RoutingNode,
	Workflow,
	INodeProperties,
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	ITaskDataConnections,
	INodeExecuteFunctions,
	IN8nRequestOperations,
	INodeCredentialDescription,
	IExecuteData,
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
	requestOptions.headers = (requestOptions.headers || {}) as IDataObject;
	requestOptions.headers.addedIn = 'preSendFunction1';
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
			output: DeclarativeRestApiSettings.ResultOptions | undefined;
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
						headers: {},
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
						headers: {},
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
						headers: {},
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
								postReceive: [postReceiveFunction1],
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
										preSend: [preSendFunction1],
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
												preSend: [preSendFunction1],
											},
											output: {
												postReceive: [
													{
														type: 'rootProperty',
														properties: {
															property: 'data',
														},
													},
												],
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
						headers: {},
					},
					preSend: [preSendFunction1, preSendFunction1],
					postReceive: [
						{
							actions: [postReceiveFunction1],
							data: {
								parameterValue: {
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
						},
						{
							actions: [
								{
									type: 'rootProperty',
									properties: {
										property: 'data',
									},
								},
							],
							data: {
								parameterValue: 'llv2',
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
			id: 'uuid-1234',
			position: [0, 0],
		};

		const mode = 'internal';
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
		const additionalData = Helpers.WorkflowExecuteAdditionalData();
		const path = '';
		const nodeType = nodeTypes.getByNameAndVersion(node.type);

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
					{
						node,
						data: {},
						source: null,
					},
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

	describe('runNode', () => {
		const tests: Array<{
			description: string;
			input: {
				nodeType: {
					properties?: INodeProperties[];
					credentials?: INodeCredentialDescription[];
					requestDefaults?: IHttpRequestOptions;
					requestOperations?: IN8nRequestOperations;
				};
				node: {
					parameters: INodeParameters;
				};
			};
			output: INodeExecutionData[][] | undefined;
		}> = [
			{
				description: 'single parameter, only send defined, fixed value, using requestDefaults',
				input: {
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
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
						],
					},
					node: {
						parameters: {},
					},
				},
				output: [
					[
						{
							json: {
								headers: {},
								statusCode: 200,
								requestOptions: {
									url: '/test-url',
									headers: {},
									qs: {},
									body: {
										toEmail: 'fixedValue',
									},
									baseURL: 'http://127.0.0.1:5678',
									returnFullResponse: true,
								},
							},
						},
					],
				],
			},
			{
				description: 'single parameter, only send defined, fixed value, using requestDefaults',
				input: {
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
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
						],
					},
					node: {
						parameters: {},
					},
				},
				output: [
					[
						{
							json: {
								headers: {},
								statusCode: 200,
								requestOptions: {
									url: '/test-url',
									headers: {},
									qs: {},
									body: {
										toEmail: 'fixedValue',
									},
									baseURL: 'http://127.0.0.1:5678',
									returnFullResponse: true,
								},
							},
						},
					],
				],
			},
			{
				description:
					'single parameter, only send defined, using expression, using requestDefaults with overwrite',
				input: {
					node: {
						parameters: {
							email: 'test@test.com',
						},
					},
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								routing: {
									send: {
										property: 'toEmail',
										type: 'body',
										value: '={{$value.toUpperCase()}}',
									},
									request: {
										url: '/overwritten',
									},
								},
								default: '',
							},
						],
					},
				},
				output: [
					[
						{
							json: {
								headers: {},
								statusCode: 200,
								requestOptions: {
									url: '/overwritten',
									headers: {},
									qs: {},
									body: {
										toEmail: 'TEST@TEST.COM',
									},
									baseURL: 'http://127.0.0.1:5678',
									returnFullResponse: true,
								},
							},
						},
					],
				],
			},
			{
				description:
					'single parameter, only send defined, using expression, using requestDefaults with overwrite and expressions',
				input: {
					node: {
						parameters: {
							endpoint: 'custom-overwritten',
						},
					},
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
								displayName: 'Endpoint',
								name: 'endpoint',
								type: 'string',
								routing: {
									send: {
										property: '={{"theProperty"}}',
										type: 'body',
										value: '={{$value}}',
									},
									request: {
										url: '=/{{$value}}',
									},
								},
								default: '',
							},
						],
					},
				},
				output: [
					[
						{
							json: {
								headers: {},
								statusCode: 200,
								requestOptions: {
									url: '/custom-overwritten',
									headers: {},
									qs: {},
									body: {
										theProperty: 'custom-overwritten',
									},
									baseURL: 'http://127.0.0.1:5678',
									returnFullResponse: true,
								},
							},
						},
					],
				],
			},
			{
				description: 'single parameter, send and operations defined, fixed value with pagination',
				input: {
					node: {
						parameters: {},
					},
					nodeType: {
						properties: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								routing: {
									send: {
										property: 'toEmail',
										type: 'body',
										value: 'fixedValue',
										paginate: true,
									},
									operations: {
										pagination: {
											type: 'offset',
											properties: {
												limitParameter: 'limit',
												offsetParameter: 'offset',
												pageSize: 10,
												type: 'body',
											},
										},
									},
								},
								default: '',
							},
						],
					},
				},
				output: [
					[
						{
							json: {
								headers: {},
								statusCode: 200,
								requestOptions: {
									qs: {},
									headers: {},
									body: {
										toEmail: 'fixedValue',
										limit: 10,
										offset: 10,
									},
									returnFullResponse: true,
								},
							},
						},
					],
				],
			},
			{
				description: 'mutliple parameters, complex example with everything',
				input: {
					node: {
						parameters: {
							value1: '={{"test"}}',
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
								customPropertiesMultiExp: {
									property0: [
										{
											name: '={{$parameter["value1"]}}N',
											value: '={{$parameter["value1"]}}V',
										},
									],
								},
							},
						},
					},
					nodeType: {
						properties: [
							{
								displayName: 'Value 1',
								name: 'value1',
								type: 'string',
								default: '',
							},
							{
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
										postReceive: [postReceiveFunction1],
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
												preSend: [preSendFunction1],
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
														preSend: [preSendFunction1],
													},
													output: {
														postReceive: [
															{
																type: 'rootProperty',
																properties: {
																	property: 'requestOptions',
																},
															},
														],
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
									// Test fixed collection: multipleValues=true with expression which references an expression
									{
										displayName: 'Custom Properties (multi)',
										name: 'customPropertiesMultiExp',
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
																property: '={{$parent.name}}',
																type: 'body',
															},
														},
														description: 'Value of the property to set.',
													},
												],
											},
										],
									},
								],
							},
						],
					},
				},
				output: [
					[
						{
							json: {
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
									testN: 'testV',
								},
								method: 'POST',
								headers: {
									addedIn: 'preSendFunction1',
								},
								returnFullResponse: true,
							},
						},
					],
				],
			},
			{
				description: 'single parameter, postReceive: set',
				input: {
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
								displayName: 'JSON Data',
								name: 'jsonData',
								type: 'string',
								routing: {
									send: {
										property: 'jsonData',
										type: 'body',
									},
									output: {
										postReceive: [
											{
												type: 'set',
												properties: {
													value: '={{ { "value": $value, "response": $response } }}',
												},
											},
										],
									},
								},
								default: '',
							},
						],
					},
					node: {
						parameters: {
							jsonData: {
								root: [
									{
										name: 'Jim',
										age: 34,
									},
									{
										name: 'James',
										age: 44,
									},
								],
							},
						},
					},
				},
				output: [
					[
						{
							json: {
								value: {
									root: [
										{
											name: 'Jim',
											age: 34,
										},
										{
											name: 'James',
											age: 44,
										},
									],
								},
								response: {
									body: {
										headers: {},
										statusCode: 200,
										requestOptions: {
											headers: {},
											qs: {},
											body: {
												jsonData: {
													root: [
														{
															name: 'Jim',
															age: 34,
														},
														{
															name: 'James',
															age: 44,
														},
													],
												},
											},
											baseURL: 'http://127.0.0.1:5678',
											url: '/test-url',
											returnFullResponse: true,
										},
									},
								},
							},
						},
					],
				],
			},
			{
				description: 'single parameter, postReceive: rootProperty',
				input: {
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
								displayName: 'JSON Data',
								name: 'jsonData',
								type: 'string',
								routing: {
									send: {
										property: 'jsonData',
										type: 'body',
									},
									output: {
										postReceive: [
											{
												type: 'rootProperty',
												properties: {
													property: 'requestOptions',
												},
											},
											{
												type: 'rootProperty',
												properties: {
													property: 'body.jsonData.root',
												},
											},
										],
									},
								},
								default: '',
							},
						],
					},
					node: {
						parameters: {
							jsonData: {
								root: [
									{
										name: 'Jim',
										age: 34,
									},
									{
										name: 'James',
										age: 44,
									},
								],
							},
						},
					},
				},
				output: [
					[
						{
							json: {
								name: 'Jim',
								age: 34,
							},
						},
						{
							json: {
								name: 'James',
								age: 44,
							},
						},
					],
				],
			},
			{
				description: 'single parameter, mutliple postReceive: rootProperty, setKeyValue, sort',
				input: {
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
								displayName: 'JSON Data',
								name: 'jsonData',
								type: 'string',
								routing: {
									send: {
										property: 'jsonData',
										type: 'body',
									},
									output: {
										postReceive: [
											{
												type: 'rootProperty',
												properties: {
													property: 'requestOptions.body.jsonData.root',
												},
											},
											{
												type: 'setKeyValue',
												properties: {
													display1: '={{$responseItem.name}} ({{$responseItem.age}})',
													display2: '={{$responseItem.name}} is {{$responseItem.age}}',
												},
											},
											{
												type: 'sort',
												properties: {
													key: 'display1',
												},
											},
										],
									},
								},
								default: '',
							},
						],
					},
					node: {
						parameters: {
							jsonData: {
								root: [
									{
										name: 'Jim',
										age: 34,
									},
									{
										name: 'James',
										age: 44,
									},
								],
							},
						},
					},
				},
				output: [
					[
						{
							json: {
								display1: 'James (44)',
								display2: 'James is 44',
							},
						},
						{
							json: {
								display1: 'Jim (34)',
								display2: 'Jim is 34',
							},
						},
					],
				],
			},
		];

		const nodeTypes = Helpers.NodeTypes();
		const baseNode: INode = {
			parameters: {},
			name: 'test',
			type: 'test.set',
			typeVersion: 1,
			id: 'uuid-1234',
			position: [0, 0],
		};

		const mode = 'internal';
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
		const additionalData = Helpers.WorkflowExecuteAdditionalData();
		const nodeType = nodeTypes.getByNameAndVersion(baseNode.type);

		const inputData: ITaskDataConnections = {
			main: [
				[
					{
						json: {},
					},
				],
			],
		};

		for (const testData of tests) {
			test(testData.description, async () => {
				const node: INode = { ...baseNode, ...testData.input.node };

				const workflowData = {
					nodes: [node],
					connections: {},
				};

				// @ts-ignore
				nodeType.description = { ...testData.input.nodeType };

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

				const executeData = {
					data: {},
					node,
					source: null,
				} as IExecuteData;

				// @ts-ignore
				const nodeExecuteFunctions: INodeExecuteFunctions = {
					getExecuteFunctions: () => {
						return Helpers.getExecuteFunctions(
							workflow,
							runExecutionData,
							runIndex,
							connectionInputData,
							{},
							node,
							itemIndex,
							additionalData,
							executeData,
							mode,
						);
					},
					getExecuteSingleFunctions: () => {
						return Helpers.getExecuteSingleFunctions(
							workflow,
							runExecutionData,
							runIndex,
							connectionInputData,
							{},
							node,
							itemIndex,
							additionalData,
							executeData,
							mode,
						);
					},
				};

				const result = await routingNode.runNode(
					inputData,
					runIndex,
					nodeType,
					executeData,
					nodeExecuteFunctions,
				);

				expect(result).toEqual(testData.output);
			});
		}
	});

	describe('itemIndex', () => {
		const tests: Array<{
			description: string;
			input: {
				nodeType: {
					properties?: INodeProperties[];
					credentials?: INodeCredentialDescription[];
					requestDefaults?: IHttpRequestOptions;
					requestOperations?: IN8nRequestOperations;
				};
				node: {
					parameters: INodeParameters;
				};
			};
			output: INodeExecutionData[][] | undefined;
		}> = [
			{
				description: 'single parameter, only send defined, fixed value, using requestDefaults',
				input: {
					nodeType: {
						requestDefaults: {
							baseURL: 'http://127.0.0.1:5678',
							url: '/test-url',
						},
						properties: [
							{
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
						],
					},
					node: {
						parameters: {},
					},
				},
				output: [
					[
						{
							json: {
								headers: {},
								statusCode: 200,
								requestOptions: {
									url: '/test-url',
									qs: {},
									body: {
										toEmail: 'fixedValue',
									},
									baseURL: 'http://127.0.0.1:5678',
									returnFullResponse: true,
								},
							},
						},
					],
				],
			},
		];

		const nodeTypes = Helpers.NodeTypes();
		const baseNode: INode = {
			parameters: {},
			name: 'test',
			type: 'test.set',
			typeVersion: 1,
			id: 'uuid-1234',
			position: [0, 0],
		};

		const mode = 'internal';
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
		const additionalData = Helpers.WorkflowExecuteAdditionalData();
		const nodeType = nodeTypes.getByNameAndVersion(baseNode.type);

		const inputData: ITaskDataConnections = {
			main: [
				[
					{
						json: {},
					},
					{
						json: {},
					},
					{
						json: {},
					},
				],
			],
		};

		for (const testData of tests) {
			test(testData.description, async () => {
				const node: INode = { ...baseNode, ...testData.input.node };

				const workflowData = {
					nodes: [node],
					connections: {},
				};

				// @ts-ignore
				nodeType.description = { ...testData.input.nodeType };

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

				const executeData = {
					data: {},
					node,
					source: null,
				} as IExecuteData;

				let currentItemIndex = 0;
				for (let iteration = 0; iteration < inputData.main[0]!.length; iteration++) {
					// @ts-ignore
					const nodeExecuteFunctions: INodeExecuteFunctions = {
						getExecuteFunctions: () => {
							return Helpers.getExecuteFunctions(
								workflow,
								runExecutionData,
								runIndex,
								connectionInputData,
								{},
								node,
								itemIndex + iteration,
								additionalData,
								executeData,
								mode,
							);
						},
						getExecuteSingleFunctions: () => {
							return Helpers.getExecuteSingleFunctions(
								workflow,
								runExecutionData,
								runIndex,
								connectionInputData,
								{},
								node,
								itemIndex + iteration,
								additionalData,
								executeData,
								mode,
							);
						},
					};

					const routingNodeExecutionContext = nodeExecuteFunctions.getExecuteSingleFunctions(
						routingNode.workflow,
						routingNode.runExecutionData,
						runIndex,
						routingNode.connectionInputData,
						inputData,
						routingNode.node,
						iteration,
						routingNode.additionalData,
						executeData,
						routingNode.mode,
					);

					currentItemIndex = routingNodeExecutionContext.getItemIndex();
				}

				const expectedItemIndex = inputData.main[0]!.length - 1;

				expect(currentItemIndex).toEqual(expectedItemIndex);
			});
		}
	});
});
