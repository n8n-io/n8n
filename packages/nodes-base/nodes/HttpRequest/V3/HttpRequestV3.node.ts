import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	jsonParse,
	NodeApiError,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request-promise-native';

import {
	binaryContentTypes,
	getOAuth2AdditionalParameters,
	IAuthDataSanitizeKeys,
	replaceNullValues,
	sanitizeUiMessage,
} from '../GenericFunctions';

function toText<T>(data: T) {
	if (typeof data === 'object' && data !== null) {
		return JSON.stringify(data);
	}
	return data;
}
export class HttpRequestV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			subtitle: '={{$parameter["method"] + ": " + $parameter["url"]}}',
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
					displayName: '',
					name: 'curlImport',
					type: 'curlImport',
					default: '',
				},
				{
					displayName: 'Method',
					name: 'method',
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
							description:
								"We've already implemented auth for many services so that you don't have to set it up manually",
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
					credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
					displayOptions: {
						show: {
							authentication: ['predefinedCredentialType'],
						},
					},
				},
				{
					displayName: 'Generic Auth Type',
					name: 'genericAuthType',
					type: 'credentialsSelect',
					required: true,
					default: '',
					credentialTypes: ['has:genericAuth'],
					displayOptions: {
						show: {
							authentication: ['genericCredentialType'],
						},
					},
				},
				{
					displayName: 'Send Query Parameters',
					name: 'sendQuery',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Whether the request has query params or not',
				},
				{
					displayName: 'Specify Query Parameters',
					name: 'specifyQuery',
					type: 'options',
					displayOptions: {
						show: {
							sendQuery: [true],
						},
					},
					options: [
						{
							name: 'Using Fields Below',
							value: 'keypair',
						},
						{
							name: 'Using JSON',
							value: 'json',
						},
					],
					default: 'keypair',
				},
				{
					displayName: 'Query Parameters',
					name: 'queryParameters',
					type: 'fixedCollection',
					displayOptions: {
						show: {
							sendQuery: [true],
							specifyQuery: ['keypair'],
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
					displayName: 'JSON',
					name: 'jsonQuery',
					type: 'json',
					displayOptions: {
						show: {
							sendQuery: [true],
							specifyQuery: ['json'],
						},
					},
					default: '',
				},
				{
					displayName: 'Send Headers',
					name: 'sendHeaders',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Whether the request has headers or not',
				},
				{
					displayName: 'Specify Headers',
					name: 'specifyHeaders',
					type: 'options',
					displayOptions: {
						show: {
							sendHeaders: [true],
						},
					},
					options: [
						{
							name: 'Using Fields Below',
							value: 'keypair',
						},
						{
							name: 'Using JSON',
							value: 'json',
						},
					],
					default: 'keypair',
				},
				{
					displayName: 'Header Parameters',
					name: 'headerParameters',
					type: 'fixedCollection',
					displayOptions: {
						show: {
							sendHeaders: [true],
							specifyHeaders: ['keypair'],
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
					displayName: 'JSON',
					name: 'jsonHeaders',
					type: 'json',
					displayOptions: {
						show: {
							sendHeaders: [true],
							specifyHeaders: ['json'],
						},
					},
					default: '',
				},
				{
					displayName: 'Send Body',
					name: 'sendBody',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Whether the request has a body or not',
				},
				{
					displayName: 'Body Content Type',
					name: 'contentType',
					type: 'options',
					displayOptions: {
						show: {
							sendBody: [true],
						},
					},
					options: [
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
							name: 'Raw',
							value: 'raw',
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
							sendBody: [true],
							contentType: ['json'],
						},
					},
					options: [
						{
							name: 'Using Fields Below',
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
							sendBody: [true],
							contentType: ['json'],
							specifyBody: ['keypair'],
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
									description:
										'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
					name: 'jsonBody',
					type: 'json',
					displayOptions: {
						show: {
							sendBody: [true],
							contentType: ['json'],
							specifyBody: ['json'],
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
							sendBody: [true],
							contentType: ['multipart-form-data'],
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
									displayName: 'Parameter Type',
									name: 'parameterType',
									type: 'options',
									options: [
										{
											// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
											name: 'n8n Binary Data',
											value: 'formBinaryData',
										},
										{
											name: 'Form Data',
											value: 'formData',
										},
									],
									default: 'formData',
								},
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
									description:
										'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									displayOptions: {
										show: {
											parameterType: ['formData'],
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
											parameterType: ['formBinaryData'],
										},
									},
									default: '',
									description:
										'The name of the incoming field containing the binary file data to be processed',
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
							sendBody: [true],
							contentType: ['form-urlencoded'],
						},
					},
					options: [
						{
							name: 'Using Fields Below',
							value: 'keypair',
						},
						{
							name: 'Using Single Field',
							value: 'string',
						},
					],
					default: 'keypair',
				},
				{
					displayName: 'Body Parameters',
					name: 'bodyParameters',
					type: 'fixedCollection',
					displayOptions: {
						show: {
							sendBody: [true],
							contentType: ['form-urlencoded'],
							specifyBody: ['keypair'],
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
									description:
										'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							sendBody: [true],
							specifyBody: ['string'],
						},
					},
					default: '',
					placeholder: 'field1=value1&field2=value2',
				},
				{
					displayName: 'Input Data Field Name',
					name: 'inputDataFieldName',
					type: 'string',
					noDataExpression: true,
					displayOptions: {
						show: {
							sendBody: [true],
							contentType: ['binaryData'],
						},
					},
					default: '',
					description:
						'The name of the incoming field containing the binary file data to be processed',
				},
				{
					displayName: 'Content Type',
					name: 'rawContentType',
					type: 'string',
					displayOptions: {
						show: {
							sendBody: [true],
							contentType: ['raw'],
						},
					},
					default: '',
					placeholder: 'text/html',
				},
				{
					displayName: 'Body',
					name: 'body',
					type: 'string',
					displayOptions: {
						show: {
							sendBody: [true],
							contentType: ['raw'],
						},
					},
					default: '',
					placeholder: '',
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
							name: 'batching',
							placeholder: 'Add Batching',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								batch: {},
							},
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
											description:
												'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
										},
										{
											// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
											displayName: 'Batch Interval (ms)',
											name: 'batchInterval',
											type: 'number',
											typeOptions: {
												minValue: 0,
											},
											default: 1000,
											description:
												'Time (in milliseconds) between each batch of requests. 0 for disabled.',
										},
									],
								},
							],
						},
						{
							displayName: 'Ignore SSL Issues',
							name: 'allowUnauthorizedCerts',
							type: 'boolean',
							noDataExpression: true,
							default: false,
							// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
							description:
								'Whether to download the response even if SSL certificate validation is not possible',
						},
						{
							displayName: 'Array Format in Query Parameters',
							name: 'queryParameterArrays',
							type: 'options',
							displayOptions: {
								show: {
									'/sendQuery': [true],
								},
							},
							options: [
								{
									name: 'No Brackets',
									value: 'repeat',
									// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
									description: 'e.g. foo=bar&foo=qux',
								},
								{
									name: 'Brackets Only',
									value: 'brackets',
									// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
									description: 'e.g. foo[]=bar&foo[]=qux',
								},
								{
									name: 'Brackets with Indices',
									value: 'indices',
									// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
									description: 'e.g. foo[0]=bar&foo[1]=qux',
								},
							],
							default: 'brackets',
						},
						{
							displayName: 'Redirects',
							name: 'redirect',
							placeholder: 'Add Redirect',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								redirect: {},
							},
							options: [
								{
									displayName: 'Redirect',
									name: 'redirect',
									values: [
										{
											displayName: 'Follow Redirects',
											name: 'followRedirects',
											type: 'boolean',
											default: false,
											noDataExpression: true,
											description: 'Whether to follow all redirects',
										},
										{
											displayName: 'Max Redirects',
											name: 'maxRedirects',
											type: 'number',
											displayOptions: {
												show: {
													followRedirects: [true],
												},
											},
											default: 21,
											description: 'Max number of redirects to follow',
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
								multipleValues: false,
							},
							default: {
								response: {},
							},
							options: [
								{
									displayName: 'Response',
									name: 'response',
									values: [
										{
											displayName: 'Include Response Headers and Status',
											name: 'fullResponse',
											type: 'boolean',
											default: false,
											description:
												'Whether to return the full reponse (headers and response status code) data instead of only the body',
										},
										{
											displayName: 'Never Error',
											name: 'neverError',
											type: 'boolean',
											default: false,
											description: 'Whether to succeeds also when status code is not 2xx',
										},
										{
											displayName: 'Response Format',
											name: 'responseFormat',
											type: 'options',
											noDataExpression: true,
											options: [
												{
													name: 'Autodetect',
													value: 'autodetect',
												},
												{
													name: 'File',
													value: 'file',
												},
												{
													name: 'JSON',
													value: 'json',
												},
												{
													name: 'Text',
													value: 'text',
												},
											],
											default: 'autodetect',
											description: 'The format in which the data gets returned from the URL',
										},
										{
											displayName: 'Put Output in Field',
											name: 'outputPropertyName',
											type: 'string',
											default: 'data',
											required: true,
											displayOptions: {
												show: {
													responseFormat: ['file', 'text'],
												},
											},
											description:
												'Name of the binary property to which to write the data of the read file',
										},
									],
								},
							],
						},
						{
							displayName: 'Proxy',
							name: 'proxy',
							type: 'string',
							default: '',
							placeholder: 'e.g. http://myproxy:3128',
							description: 'HTTP proxy to use',
						},
						{
							displayName: 'Timeout',
							name: 'timeout',
							type: 'number',
							typeOptions: {
								minValue: 1,
							},
							default: 10000,
							description:
								'Time in ms to wait for the server to send response headers (and start the response body) before aborting the request',
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const fullReponseProperties = ['body', 'headers', 'statusCode', 'statusMessage'];

		let authentication;

		try {
			authentication = this.getNodeParameter('authentication', 0) as
				| 'predefinedCredentialType'
				| 'genericCredentialType'
				| 'none';
		} catch (_) {}

		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let oAuth1Api;
		let oAuth2Api;
		let nodeCredentialType;

		if (authentication === 'genericCredentialType') {
			const genericAuthType = this.getNodeParameter('genericAuthType', 0) as string;

			if (genericAuthType === 'httpBasicAuth') {
				try {
					httpBasicAuth = await this.getCredentials('httpBasicAuth');
				} catch (_) {}
			} else if (genericAuthType === 'httpDigestAuth') {
				try {
					httpDigestAuth = await this.getCredentials('httpDigestAuth');
				} catch (_) {}
			} else if (genericAuthType === 'httpHeaderAuth') {
				try {
					httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
				} catch (_) {}
			} else if (genericAuthType === 'httpQueryAuth') {
				try {
					httpQueryAuth = await this.getCredentials('httpQueryAuth');
				} catch (_) {}
			} else if (genericAuthType === 'oAuth1Api') {
				try {
					oAuth1Api = await this.getCredentials('oAuth1Api');
				} catch (_) {}
			} else if (genericAuthType === 'oAuth2Api') {
				try {
					oAuth2Api = await this.getCredentials('oAuth2Api');
				} catch (_) {}
			}
		} else if (authentication === 'predefinedCredentialType') {
			try {
				nodeCredentialType = this.getNodeParameter('nodeCredentialType', 0) as string;
			} catch (_) {}
		}

		let requestOptions: OptionsWithUri = {
			uri: '',
		};

		let returnItems: INodeExecutionData[] = [];
		const requestPromises = [];

		let fullResponse = false;

		let autoDetectResponseFormat = false;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const requestMethod = this.getNodeParameter('method', itemIndex) as string;

			const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
			const queryParameters = this.getNodeParameter(
				'queryParameters.parameters',
				itemIndex,
				[],
			) as [{ name: string; value: string }];
			const specifyQuery = this.getNodeParameter('specifyQuery', itemIndex, 'keypair') as string;
			const jsonQueryParameter = this.getNodeParameter('jsonQuery', itemIndex, '') as string;

			const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;
			const bodyContentType = this.getNodeParameter('contentType', itemIndex, '') as string;
			const specifyBody = this.getNodeParameter('specifyBody', itemIndex, '') as string;
			const bodyParameters = this.getNodeParameter('bodyParameters.parameters', itemIndex, []) as [
				{ name: string; value: string },
			];
			const jsonBodyParameter = this.getNodeParameter('jsonBody', itemIndex, '') as string;
			const body = this.getNodeParameter('body', itemIndex, '') as string;

			const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
			const headerParameters = this.getNodeParameter(
				'headerParameters.parameters',
				itemIndex,
				[],
			) as [{ name: string; value: string }];
			const specifyHeaders = this.getNodeParameter(
				'specifyHeaders',
				itemIndex,
				'keypair',
			) as string;
			const jsonHeadersParameter = this.getNodeParameter('jsonHeaders', itemIndex, '') as string;

			const {
				redirect,
				batching,
				proxy,
				timeout,
				allowUnauthorizedCerts,
				queryParameterArrays,
				response,
			} = this.getNodeParameter('options', itemIndex, {}) as {
				batching: { batch: { batchSize: number; batchInterval: number } };
				proxy: string;
				timeout: number;
				allowUnauthorizedCerts: boolean;
				queryParameterArrays: 'indices' | 'brackets' | 'repeat';
				response: {
					response: { neverError: boolean; responseFormat: string; fullResponse: boolean };
				};
				redirect: { redirect: { maxRedirects: number; followRedirects: boolean } };
			};

			const url = this.getNodeParameter('url', itemIndex) as string;

			const responseFormat = response?.response?.responseFormat || 'autodetect';

			fullResponse = response?.response?.fullResponse || false;

			autoDetectResponseFormat = responseFormat === 'autodetect';

			// defaults batch size to 1 of it's set to 0
			const batchSize = batching?.batch?.batchSize > 0 ? batching?.batch?.batchSize : 1;
			const batchInterval = batching?.batch.batchInterval;

			if (itemIndex > 0 && batchSize >= 0 && batchInterval > 0) {
				if (itemIndex % batchSize === 0) {
					await sleep(batchInterval);
				}
			}

			requestOptions = {
				headers: {},
				method: requestMethod,
				uri: url,
				gzip: true,
				rejectUnauthorized: !allowUnauthorizedCerts || false,
				followRedirect: false,
			};

			// When response format is set to auto-detect,
			// we need to access to response header content-type
			// and the only way is using "resolveWithFullResponse"
			if (autoDetectResponseFormat || fullResponse) {
				requestOptions.resolveWithFullResponse = true;
			}

			if (redirect?.redirect?.followRedirects) {
				requestOptions.followRedirect = true;
				requestOptions.followAllRedirects = true;
			}

			if (redirect?.redirect?.maxRedirects) {
				requestOptions.maxRedirects = redirect?.redirect?.maxRedirects;
			}

			if (response?.response?.neverError) {
				requestOptions.simple = false;
			}

			if (proxy) {
				requestOptions.proxy = proxy;
			}

			if (timeout) {
				requestOptions.timeout = timeout;
			} else {
				// set default timeout to 1 hour
				requestOptions.timeout = 3600000;
			}

			if (sendQuery && queryParameterArrays) {
				Object.assign(requestOptions, {
					qsStringifyOptions: { arrayFormat: queryParameterArrays },
				});
			}

			const parmetersToKeyValue = async (
				acc: Promise<{ [key: string]: any }>,
				cur: { name: string; value: string; parameterType?: string; inputDataFieldName?: string },
			) => {
				const acumulator = await acc;
				if (cur.parameterType === 'formBinaryData') {
					const binaryDataOnInput = items[itemIndex]?.binary;
					if (!cur.inputDataFieldName) return acumulator;

					if (!binaryDataOnInput?.[cur.inputDataFieldName]) {
						throw new NodeOperationError(
							this.getNode(),
							`Input Data Field Name '${cur.inputDataFieldName}' could not be found in input`,
							{
								runIndex: itemIndex,
							},
						);
					}

					if (!cur.inputDataFieldName) return acumulator;

					const binaryData = binaryDataOnInput[cur.inputDataFieldName];
					const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, cur.inputDataFieldName);

					acumulator[cur.name] = {
						value: buffer,
						options: {
							filename: binaryData.fileName,
							contentType: binaryData.mimeType,
						},
					};
					return acumulator;
				}
				acumulator[cur.name] = cur.value;
				return acumulator;
			};

			// Get parameters defined in the UI
			if (sendBody && bodyParameters) {
				if (specifyBody === 'keypair' || bodyContentType === 'multipart-form-data') {
					requestOptions.body = await bodyParameters.reduce(
						parmetersToKeyValue,
						Promise.resolve({}),
					);
				} else if (specifyBody === 'json') {
					// body is specified using JSON
					if (typeof jsonBodyParameter !== 'object' && jsonBodyParameter !== null) {
						try {
							JSON.parse(jsonBodyParameter);
						} catch (_) {
							throw new NodeOperationError(
								this.getNode(),
								'JSON parameter need to be an valid JSON',
								{
									runIndex: itemIndex,
								},
							);
						}

						requestOptions.body = jsonParse(jsonBodyParameter);
					} else {
						requestOptions.body = jsonBodyParameter;
					}
				} else if (specifyBody === 'string') {
					//form urlencoded
					requestOptions.body = Object.fromEntries(new URLSearchParams(body));
				}
			}

			// Change the way data get send in case a different content-type than JSON got selected
			if (sendBody && ['PATCH', 'POST', 'PUT', 'GET'].includes(requestMethod)) {
				if (bodyContentType === 'multipart-form-data') {
					requestOptions.formData = requestOptions.body;
					delete requestOptions.body;
				} else if (bodyContentType === 'form-urlencoded') {
					requestOptions.form = requestOptions.body;
					delete requestOptions.body;
				} else if (bodyContentType === 'binaryData') {
					const inputDataFieldName = this.getNodeParameter(
						'inputDataFieldName',
						itemIndex,
					) as string;
					requestOptions.body = await this.helpers.getBinaryDataBuffer(
						itemIndex,
						inputDataFieldName,
					);
				} else if (bodyContentType === 'raw') {
					requestOptions.body = body;
				}
			}

			// Get parameters defined in the UI
			if (sendQuery && queryParameters) {
				if (specifyQuery === 'keypair') {
					requestOptions.qs = await queryParameters.reduce(
						parmetersToKeyValue,
						Promise.resolve({}),
					);
				} else if (specifyQuery === 'json') {
					// query is specified using JSON
					try {
						JSON.parse(jsonQueryParameter);
					} catch (_) {
						throw new NodeOperationError(
							this.getNode(),
							'JSON parameter need to be an valid JSON',
							{
								runIndex: itemIndex,
							},
						);
					}

					requestOptions.qs = jsonParse(jsonQueryParameter);
				}
			}

			// Get parameters defined in the UI
			if (sendHeaders && headerParameters) {
				if (specifyHeaders === 'keypair') {
					requestOptions.headers = await headerParameters.reduce(
						parmetersToKeyValue,
						Promise.resolve({}),
					);
				} else if (specifyHeaders === 'json') {
					// body is specified using JSON
					try {
						JSON.parse(jsonHeadersParameter);
					} catch (_) {
						throw new NodeOperationError(
							this.getNode(),
							'JSON parameter need to be an valid JSON',
							{
								runIndex: itemIndex,
							},
						);
					}

					requestOptions.headers = jsonParse(jsonHeadersParameter);
				}
			}

			if (autoDetectResponseFormat || responseFormat === 'file') {
				requestOptions.encoding = null;
				requestOptions.json = false;
			} else if (bodyContentType === 'raw') {
				requestOptions.json = false;
			} else {
				requestOptions.json = true;
			}

			// // Add Content Type if any are set
			if (bodyContentType === 'raw') {
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}
				const rawContentType = this.getNodeParameter('rawContentType', itemIndex) as string;
				requestOptions.headers['Content-Type'] = rawContentType;
			}

			const authDataKeys: IAuthDataSanitizeKeys = {};

			// Add credentials if any are set
			if (httpBasicAuth !== undefined) {
				requestOptions.auth = {
					user: httpBasicAuth.user as string,
					pass: httpBasicAuth.password as string,
				};
				authDataKeys.auth = ['pass'];
			}
			if (httpHeaderAuth !== undefined) {
				requestOptions.headers![httpHeaderAuth.name as string] = httpHeaderAuth.value;
				authDataKeys.headers = [httpHeaderAuth.name as string];
			}
			if (httpQueryAuth !== undefined) {
				if (!requestOptions.qs) {
					requestOptions.qs = {};
				}
				requestOptions.qs[httpQueryAuth.name as string] = httpQueryAuth.value;
				authDataKeys.qs = [httpQueryAuth.name as string];
			}
			if (httpDigestAuth !== undefined) {
				requestOptions.auth = {
					user: httpDigestAuth.user as string,
					pass: httpDigestAuth.password as string,
					sendImmediately: false,
				};
				authDataKeys.auth = ['pass'];
			}

			if (requestOptions.headers!.accept === undefined) {
				if (responseFormat === 'json') {
					requestOptions.headers!.accept = 'application/json,text/*;q=0.99';
				} else if (responseFormat === 'text') {
					requestOptions.headers!.accept =
						'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, */*;q=0.1';
				} else {
					requestOptions.headers!.accept =
						'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, image/*;q=0.8, */*;q=0.7';
				}
			}

			try {
				this.sendMessageToUI(sanitizeUiMessage(requestOptions, authDataKeys));
			} catch (e) {}

			if (authentication === 'genericCredentialType' || authentication === 'none') {
				if (oAuth1Api) {
					const requestOAuth1 = this.helpers.requestOAuth1.call(this, 'oAuth1Api', requestOptions);
					requestOAuth1.catch(() => {});
					requestPromises.push(requestOAuth1);
				} else if (oAuth2Api) {
					const requestOAuth2 = this.helpers.requestOAuth2.call(this, 'oAuth2Api', requestOptions, {
						tokenType: 'Bearer',
					});
					requestOAuth2.catch(() => {});
					requestPromises.push(requestOAuth2);
				} else {
					// bearerAuth, queryAuth, headerAuth, digestAuth, none
					const request = this.helpers.request(requestOptions);
					request.catch(() => {});
					requestPromises.push(request);
				}
			} else if (authentication === 'predefinedCredentialType' && nodeCredentialType) {
				const additionalOAuth2Options = getOAuth2AdditionalParameters(nodeCredentialType);

				// service-specific cred: OAuth1, OAuth2, plain

				const requestWithAuthentication = this.helpers.requestWithAuthentication.call(
					this,
					nodeCredentialType,
					requestOptions,
					additionalOAuth2Options && { oauth2: additionalOAuth2Options },
				);
				requestWithAuthentication.catch(() => {});
				requestPromises.push(requestWithAuthentication);
			}
		}

		const promisesResponses = await Promise.allSettled(requestPromises);

		let response: any;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			response = promisesResponses.shift();

			if (response!.status !== 'fulfilled') {
				if (!this.continueOnFail()) {
					if (autoDetectResponseFormat && response.reason.error instanceof Buffer) {
						response.reason.error = Buffer.from(response.reason.error).toString();
					}
					throw new NodeApiError(this.getNode(), response);
				} else {
					// Return the actual reason as error
					returnItems.push({
						json: {
							error: response.reason,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
			}

			response = response.value;

			const url = this.getNodeParameter('url', itemIndex) as string;

			let responseFormat = this.getNodeParameter(
				'options.response.response.responseFormat',
				0,
				'autodetect',
			) as string;

			fullResponse = this.getNodeParameter(
				'options.response.response.fullResponse',
				0,
				false,
			) as boolean;

			if (autoDetectResponseFormat) {
				const responseContentType = response.headers['content-type'] ?? '';
				if (responseContentType.includes('application/json')) {
					responseFormat = 'json';
					response.body = jsonParse(Buffer.from(response.body).toString());
				} else if (binaryContentTypes.some((e) => responseContentType.includes(e))) {
					responseFormat = 'file';
				} else {
					responseFormat = 'text';
					const data = Buffer.from(response.body).toString();
					response.body = !data ? undefined : data;
				}
			}

			if (autoDetectResponseFormat && !fullResponse) {
				delete response.headers;
				delete response.statusCode;
				delete response.statusMessage;
				response = response.body;
				requestOptions.resolveWithFullResponse = false;
			}

			if (responseFormat === 'file') {
				const outputPropertyName = this.getNodeParameter(
					'options.response.response.outputPropertyName',
					0,
					'data',
				) as string;

				const newItem: INodeExecutionData = {
					json: {},
					binary: {},
					pairedItem: {
						item: itemIndex,
					},
				};

				if (items[itemIndex].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary as IBinaryKeyData, items[itemIndex].binary);
				}

				const fileName = url.split('/').pop();

				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullReponseProperties) {
						if (property === 'body') {
							continue;
						}
						returnItem[property] = response![property];
					}

					newItem.json = returnItem;

					newItem.binary![outputPropertyName] = await this.helpers.prepareBinaryData(
						response!.body,
						fileName,
					);
				} else {
					newItem.json = items[itemIndex].json;

					newItem.binary![outputPropertyName] = await this.helpers.prepareBinaryData(
						response!,
						fileName,
					);
				}

				returnItems.push(newItem);
			} else if (responseFormat === 'text') {
				const outputPropertyName = this.getNodeParameter(
					'options.response.response.outputPropertyName',
					0,
					'data',
				) as string;
				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullReponseProperties) {
						if (property === 'body') {
							returnItem[outputPropertyName] = toText(response![property]);
							continue;
						}

						returnItem[property] = response![property];
					}
					returnItems.push({
						json: returnItem,
						pairedItem: {
							item: itemIndex,
						},
					});
				} else {
					returnItems.push({
						json: {
							[outputPropertyName]: toText(response),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				}
			} else {
				// responseFormat: 'json'
				if (requestOptions.resolveWithFullResponse === true) {
					const returnItem: IDataObject = {};
					for (const property of fullReponseProperties) {
						returnItem[property] = response![property];
					}

					if (responseFormat === 'json' && typeof returnItem.body === 'string') {
						try {
							returnItem.body = JSON.parse(returnItem.body);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								'Response body is not valid JSON. Change "Response Format" to "Text"',
								{ itemIndex },
							);
						}
					}

					returnItems.push({
						json: returnItem,
						pairedItem: {
							item: itemIndex,
						},
					});
				} else {
					if (responseFormat === 'json' && typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								'Response body is not valid JSON. Change "Response Format" to "Text"',
								{ itemIndex },
							);
						}
					}

					if (Array.isArray(response)) {
						// eslint-disable-next-line @typescript-eslint/no-loop-func
						response.forEach((item) =>
							returnItems.push({
								json: item,
								pairedItem: {
									item: itemIndex,
								},
							}),
						);
					} else {
						returnItems.push({
							json: response,
							pairedItem: {
								item: itemIndex,
							},
						});
					}
				}
			}
		}

		returnItems = returnItems.map(replaceNullValues);

		return this.prepareOutputData(returnItems);
	}
}
