import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IOAuth2Options,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

interface OptionData {
	name: string;
	displayName: string;
}

interface OptionDataParamters {
	[key: string]: OptionData;
}

export class HttpRequestV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
				version: 3,
				defaults: {
					name: 'HTTP Request',
					color: '#2200DD',
				},
				inputs: ['main'],
				outputs: ['main'],
				credentials: [],
				properties: [
					{
						displayName: 'Request Method',
						name: 'requestMethod',
						type: 'options',
						options: [
							{
								name: 'DELETE',
								value: 'DELETE',
							},
							{
								name: 'GET',
								value: 'GET',
							},
							{
								name: 'HEAD',
								value: 'HEAD',
							},
							{
								name: 'OPTIONS',
								value: 'OPTIONS',
							},
							{
								name: 'PATCH',
								value: 'PATCH',
							},
							{
								name: 'POST',
								value: 'POST',
							},
							{
								name: 'PUT',
								value: 'PUT',
							},
						],
						default: 'GET',
						description: 'The request method to use',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						placeholder: 'http://example.com/index.html',
						description: 'The URL to make the request to',
						required: true,
					},
					{
						displayName: 'Authentication',
						name: 'authentication',
						noDataExpression: true,
						type: 'options',
						options: [
							{
								name: 'None',
								value: 'none',
							},
							{
								name: 'Predefined Credential Type',
								value: 'predefinedCredentialType',
								description: 'We\'ve already implemented auth for many services so that you don\'t have to set it up manually',
							},
							{
								name: 'Generic Credential Type',
								value: 'genericCredentialType',
								description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
							},
						],
						default: 'none',
					},
					{
						displayName: 'Credential Type',
						name: 'nodeCredentialType',
						type: 'credentialsSelect',
						noDataExpression: true,
						required: true,
						default: '',
						credentialTypes: [
							'extends:oAuth2Api',
							'extends:oAuth1Api',
							'has:authenticate',
						],
						displayOptions: {
							show: {
								authentication: [
									'predefinedCredentialType',
								],
							},
						},
					},
					{
						displayName: 'Generic Auth Type',
						name: 'genericAuthType',
						type: 'credentialsSelect',
						required: true,
						default: '',
						credentialTypes: [
							'has:genericAuth',
						],
						displayOptions: {
							show: {
								authentication: [
									'genericCredentialType',
								],
							},
						},
					},
					{
						displayName: 'Send Body',
						name: 'sendBody',
						type: 'boolean',
						default: false,
						description: 'Whether the request has a body or not',
					},
					{
						displayName: 'Body Content Type',
						name: 'contentType',
						type: 'options',
						displayOptions: {
							show: {
								sendBody: [
									true,
								]	,
							},
						},
						options: [
							{
								name: 'Custom',
								value: 'custom',
							},
							{
								name: 'Form Urlencoded',
								value: 'form-urlencoded',
							},
							{
								name: 'Form-Data',
								value: 'multipart-form-data',
							},
							{
								name: 'JSON',
								value: 'json',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'n8n Binary Data',
								value: 'binaryData',
							},
							{
								name: 'XML',
								value: 'xml',
							},
						],
						default: 'json',
						description: 'Content-Type to use to send body parameters',
					},
					{
						displayName: 'Specify Body',
						name: 'specifyBody',
						type: 'options',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'json',
								],
							},
						},
						options: [
							{
								name: 'Using Key-Value Pairs',
								value: 'keypair',
							},
							{
								name: 'Using JSON',
								value: 'json',
							},
						],
						default: 'keypair',
						description: 'Asasas',
					},
					{
						displayName: 'Body Parameters',
						name: 'bodyParameters',
						type: 'fixedCollection',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'json',
								],
								specifyBody: [
									'keypair',
								],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Parameter',
						default: {
							parameters: [
								{
									name: '',
									value: '',
								},
							],
						},
						options: [
							{
								name: 'parameters',
								displayName: 'Parameter',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the field to set',
									},
								],
							},
						],
					},
					{
						displayName: 'JSON',
						name: 'json',
						type: 'json',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'json',
								],
								specifyBody: [
									'json',
								],
							},
						},
						default: '',
					},
					{
						displayName: 'Body Parameters',
						name: 'bodyParameters',
						type: 'fixedCollection',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'multipart-form-data',
								],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Parameter',
						default: {
							parameters: [
								{
									name: '',
									value: '',
								},
							],
						},
						options: [
							{
								name: 'parameters',
								displayName: 'Parameter',
								values: [
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										displayName: 'n8n Binary Data',
										name: 'isFile',
										type: 'boolean',
										default: false,
									},
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										displayOptions: {
											show: {
												isFile: [
													false,
												],
											},
										},
										default: '',
										description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										displayOptions: {
											show: {
												isFile: [
													false,
												],
											},
										},
										default: '',
										description: 'Value of the field to set',
									},
									{
										displayName: 'Input Data Field Name',
										name: 'inputDataFieldName',
										type: 'string',
										noDataExpression: true,
										displayOptions: {
											show: {
												isFile: [
													true,
												],
											},
										},
										default: '',
										description: 'The name of the incoming field containing the binary file data to be processed',
									},
								],
							},
						],
					},
					{
						displayName: 'Specify Body',
						name: 'specifyBody',
						type: 'options',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'form-urlencoded',
								],
							},
						},
						options: [
							{
								name: 'Using Key-Value Pairs',
								value: 'keypair',
							},
							{
								name: 'Using String',
								value: 'string',
							},
						],
						default: 'keypair',
						description: 'Asasas',
					},
					{
						displayName: 'Body Parameters',
						name: 'bodyParameters',
						type: 'fixedCollection',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'form-urlencoded',
								],
								specifyBody: [
									'keypair',
								],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Parameter',
						default: {
							parameters: [
								{
									name: '',
									value: '',
								},
							],
						},
						options: [
							{
								name: 'parameters',
								displayName: 'Parameter',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the field to set',
									},
								],
							},
						],
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						displayOptions: {
							show: {
								specifyBody: [
									'string',
								],
							},
						},
						default: '',
						placeholder: 'field1=value1&field2=value2',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'xml',
								],
							},
						},
						default: '',
						placeholder: `<?xml version="1.0" encoding="UTF-8"?>
		<note>
			<to>Tove</to>
			<from>Jani</from>
			<heading>Reminder</heading>
			<body>Don't forget me this weekend!</body>
		</note>`,
					},
					{
						displayName: 'Input Data Field Name',
						name: 'inputDataFieldName',
						type: 'string',
						noDataExpression: true,
						displayOptions: {
							show: {
								contentType: [
									'binaryData',
								],
							},
						},
						default: '',
						description: 'The name of the incoming field containing the binary file data to be processed',
					},
					{
						displayName: 'Content Type',
						name: 'customContentType',
						type: 'string',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'custom',
								],
							},
						},
						default: '',
						placeholder: 'text/html',
					},
					{
						displayName: 'Body',
						name: 'customBody',
						type: 'string',
						displayOptions: {
							show: {
								sendBody: [
									true,
								],
								contentType: [
									'custom',
								],
							},
						},
						default: '',
						placeholder: '',
					},
					{
						displayName: 'Send Headers',
						name: 'sendHeaders',
						type: 'boolean',
						default: false,
						description: 'Whether the request has headers or not',
					},
					{
						displayName: 'Header Parameters',
						name: 'headerParameters',
						type: 'fixedCollection',
						displayOptions: {
							show: {
								sendHeaders: [
									true,
								],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Parameter',
						default: {
							parameters: [
								{
									name: '',
									value: '',
								},
							],
						},
						options: [
							{
								name: 'parameters',
								displayName: 'Parameter',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Send Query Parameters',
						name: 'sendQuery',
						type: 'boolean',
						default: false,
						description: 'Whether the request has query params or not',
					},
					{
						displayName: 'Query Parameters',
						name: 'queryParameters',
						type: 'fixedCollection',
						displayOptions: {
							show: {
								sendQuery: [
									true,
								],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Parameter',
						default: {
							parameters: [
								{
									name: '',
									value: '',
								},
							],
						},
						options: [
							{
								name: 'parameters',
								displayName: 'Parameter',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						placeholder: 'Add Option',
						default: {},
						options: [
							{
								displayName: 'Batching',
								name: 'Batching',
								placeholder: 'Add Batching',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'Batching',
										name: 'batch',
										values: [
											{
												displayName: 'Items per Batch',
												name: 'batchSize',
												type: 'number',
												typeOptions: {
													minValue: -1,
												},
												default: 50,
												description: 'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
											},
											{
												displayName: 'Interval',
												name: 'batchInterval',
												type: 'number',
												typeOptions: {
													minValue: 0,
												},
												default: 1000,
												description: 'Time (in milliseconds) between each batch of requests. 0 for disabled.',
											},
										],
									},
								],
							},
							{
								displayName: 'Redirects',
								name: 'redirects',
								placeholder: 'Add Redirect',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'Redirect',
										name: 'batch',
										values: [
											{
												displayName: 'Disable',
												name: 'disable',
												type: 'boolean',
												default: false,
												description: 'Whether to follow all redirects',
											},
											{
												displayName: 'Max Redirects',
												name: 'maxRedirects',
												type: 'number',
												displayOptions: {
													show: {
														disable: [
															false,
														],
													},
												},
												typeOptions: {
													minValue: 0,
												},
												default: 21,
												description: 'Defines the maximum number of redirects to follow',
											},
										],
									},
								],
							},
							{
								displayName: 'Response',
								name: 'response',
								placeholder: 'Add response',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'Response',
										name: 'response',
										values: [
											{
												displayName: 'Full Response',
												name: 'fullResponse',
												type: 'boolean',
												default: false,
												description: 'Whether to return the full reponse data instead of only the body',
											},
											{
												displayName: 'Ignore Response Code',
												name: 'ignoreResponseCode',
												type: 'boolean',
												default: false,
												description: 'Whether to succeeds also when status code is not 2xx',
											},
											{
												displayName: 'Response Format',
												name: 'responseFormat',
												type: 'options',
												options: [
													{
														name: 'File',
														value: 'file',
													},
													{
														name: 'JSON',
														value: 'json',
													},
													{
														name: 'String',
														value: 'string',
													},
												],
												default: 'json',
												description: 'The format in which the data gets returned from the URL',
											},
											{
												displayName: 'Split Into Items',
												name: 'splitIntoItems',
												type: 'boolean',
												default: true,
												description: 'Whether to output each element of an array as own item (Only works in the request response is a JSON)',
											},
										],
									},
								],
							},
							{
								displayName: 'Ignore SSL Issues',
								name: 'allowUnauthorizedCerts',
								type: 'boolean',
								default: false,
								// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
								description: 'Whether to download the response even if SSL certificate validation is not possible',
							},
							{
								displayName: 'Proxy',
								name: 'proxy',
								type: 'string',
								default: '',
								placeholder: 'http://myproxy:3128',
								description: 'HTTP proxy to use',
							},
							{
								displayName: 'Query Params Array Serialization',
								name: 'queryArraySerialization',
								type: 'options',
								displayOptions: {
									show: {
										'/sendQuery': [
											true,
										],
									},
								},
								options: [
									{
										name: 'Brackets',
										value: 'brackets',
										description: '{ a: [\'b\', \'c\'] } => a[]=b&a[]=c',
									},
									{
										name: 'Comma',
										value: 'comma',
										description: '{ a: [\'b\', \'c\'] } => a=b,c',
									},
									{
										name: 'Indices',
										value: 'indices',
										description: '{ a: [\'b\', \'c\'] } => a[0]=b&a[1]=c',
									},
									{
										name: 'Repeat',
										value: 'repeat',
										description: '{ a: [\'b\', \'c\'] } => a=b&a=c',
									},
								],
								default: 'brackets',
							},
							{
								displayName: 'Timeout',
								name: 'timeout',
								type: 'number',
								typeOptions: {
									minValue: 1,
								},
								default: 10000,
								description: 'Time in ms to wait for the server to send response headers (and start the response body) before aborting the request',
							},
						],
					},

					// ----------------------------------
					//           v2 params
					// ----------------------------------
				],
			}
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return this.prepareOutputData([]);
	}
}
