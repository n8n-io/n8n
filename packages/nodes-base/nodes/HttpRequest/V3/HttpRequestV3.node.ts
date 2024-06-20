import type { Readable } from 'stream';

import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IRequestOptionsSimplified,
	PaginationOptions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

import {
	BINARY_ENCODING,
	NodeApiError,
	NodeOperationError,
	jsonParse,
	removeCircularRefs,
	sleep,
} from 'n8n-workflow';

import set from 'lodash/set';
import type { BodyParameter, IAuthDataSanitizeKeys } from '../GenericFunctions';
import {
	binaryContentTypes,
	getOAuth2AdditionalParameters,
	getSecrets,
	prepareRequestBody,
	reduceAsync,
	replaceNullValues,
	sanitizeUiMessage,
	setAgentOptions,
} from '../GenericFunctions';
import type { HttpSslAuthCredentials } from '../interfaces';
import { keysToLowercase } from '@utils/utilities';

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
			version: [3, 4, 4.1, 4.2],
			defaults: {
				name: 'HTTP Request',
				color: '#0004F5',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'httpSslAuth',
					required: true,
					displayOptions: {
						show: {
							provideSslCertificates: [true],
						},
					},
				},
			],
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
					displayName:
						'Make sure you have specified the scope(s) for the Service Account in the credential',
					name: 'googleApiWarning',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							nodeCredentialType: ['googleApi'],
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
					displayName: 'SSL Certificates',
					name: 'provideSslCertificates',
					type: 'boolean',
					default: false,
					isNodeSetting: true,
				},
				{
					displayName: "Provide certificates in node's 'Credential for SSL Certificates' parameter",
					name: 'provideSslCertificatesNotice',
					type: 'notice',
					default: '',
					isNodeSetting: true,
					displayOptions: {
						show: {
							provideSslCertificates: [true],
						},
					},
				},
				{
					displayName: 'SSL Certificate',
					name: 'sslCertificate',
					type: 'credentials',
					default: '',
					displayOptions: {
						show: {
							provideSslCertificates: [true],
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
							name: 'n8n Binary File',
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
					// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
					description:
						'The body can be specified using explicit fields (<code>keypair</code>) or using a JavaScript object (<code>json</code>)',
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
											name: 'n8n Binary File',
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
							default: { redirect: {} },
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
							displayOptions: {
								show: {
									'@version': [1, 2, 3],
								},
							},
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
											default: true,
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
							displayOptions: {
								hide: {
									'@version': [1, 2, 3],
								},
							},
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
												'Whether to return the full response (headers and response status code) data instead of only the body',
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
							displayName: 'Pagination',
							name: 'pagination',
							placeholder: 'Add pagination',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								pagination: {},
							},
							options: [
								{
									displayName: 'Pagination',
									name: 'pagination',
									values: [
										{
											displayName: 'Pagination Mode',
											name: 'paginationMode',
											type: 'options',
											typeOptions: {
												noDataExpression: true,
											},
											options: [
												{
													name: 'Off',
													value: 'off',
												},
												{
													name: 'Update a Parameter in Each Request',
													value: 'updateAParameterInEachRequest',
												},
												{
													name: 'Response Contains Next URL',
													value: 'responseContainsNextURL',
												},
											],
											default: 'updateAParameterInEachRequest',
											description: 'If pagination should be used',
										},
										{
											displayName:
												'Use the $response variables to access the data of the previous response. <a href="https://docs.n8n.io/code/builtin/http-node-variables/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.httpRequest" target="_blank">More info</a>',
											name: 'webhookNotice',
											displayOptions: {
												hide: {
													paginationMode: ['off'],
												},
											},
											type: 'notice',
											default: '',
										},
										{
											displayName: 'Next URL',
											name: 'nextURL',
											type: 'string',
											displayOptions: {
												show: {
													paginationMode: ['responseContainsNextURL'],
												},
											},
											default: '',
											description:
												'Should evaluate to the URL of the next page. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination" target="_blank">More info</a>.',
										},
										{
											displayName: 'Parameters',
											name: 'parameters',
											type: 'fixedCollection',
											displayOptions: {
												show: {
													paginationMode: ['updateAParameterInEachRequest'],
												},
											},
											typeOptions: {
												multipleValues: true,
												noExpression: true,
											},
											placeholder: 'Add Parameter',
											default: {
												parameters: [
													{
														type: 'qs',
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
															displayName: 'Type',
															name: 'type',
															type: 'options',
															options: [
																{
																	name: 'Body',
																	value: 'body',
																},
																{
																	name: 'Header',
																	value: 'headers',
																},
																{
																	name: 'Query',
																	value: 'qs',
																},
															],
															default: 'qs',
															description: 'Where the parameter should be set',
														},
														{
															displayName: 'Name',
															name: 'name',
															type: 'string',
															default: '',
															placeholder: 'e.g page',
														},
														{
															displayName: 'Value',
															name: 'value',
															type: 'string',
															default: '',
															hint: 'Use expression mode and $response to access response data',
														},
													],
												},
											],
										},
										{
											displayName: 'Pagination Complete When',
											name: 'paginationCompleteWhen',
											type: 'options',
											typeOptions: {
												noDataExpression: true,
											},
											displayOptions: {
												hide: {
													paginationMode: ['off'],
												},
											},
											options: [
												{
													name: 'Response Is Empty',
													value: 'responseIsEmpty',
												},
												{
													name: 'Receive Specific Status Code(s)',
													value: 'receiveSpecificStatusCodes',
												},
												{
													name: 'Other',
													value: 'other',
												},
											],
											default: 'responseIsEmpty',
											description: 'When should no further requests be made?',
										},
										{
											displayName: 'Status Code(s) when Complete',
											name: 'statusCodesWhenComplete',
											type: 'string',
											typeOptions: {
												noDataExpression: true,
											},
											displayOptions: {
												show: {
													paginationCompleteWhen: ['receiveSpecificStatusCodes'],
												},
											},
											default: '',
											description: 'Accepts comma-separated values',
										},
										{
											displayName: 'Complete Expression',
											name: 'completeExpression',
											type: 'string',
											displayOptions: {
												show: {
													paginationCompleteWhen: ['other'],
												},
											},
											default: '',
											description:
												'Should evaluate to true when pagination is complete. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#pagination" target="_blank">More info</a>.',
										},
										{
											displayName: 'Limit Pages Fetched',
											name: 'limitPagesFetched',
											type: 'boolean',
											typeOptions: {
												noDataExpression: true,
											},
											displayOptions: {
												hide: {
													paginationMode: ['off'],
												},
											},
											default: false,
											noDataExpression: true,
											description: 'Whether the number of requests should be limited',
										},
										{
											displayName: 'Max Pages',
											name: 'maxRequests',
											type: 'number',
											typeOptions: {
												noDataExpression: true,
											},
											displayOptions: {
												show: {
													limitPagesFetched: [true],
												},
											},
											default: 100,
											description: 'Maximum amount of request to be make',
										},
										{
											// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
											displayName: 'Interval Between Requests (ms)',
											name: 'requestInterval',
											type: 'number',
											displayOptions: {
												hide: {
													paginationMode: ['off'],
												},
											},
											default: 0,
											description: 'Time in milliseconds to wait between requests',
											hint: 'At 0 no delay will be added',
											typeOptions: {
												minValue: 0,
											},
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
				{
					displayName:
						"You can view the raw requests this node makes in your browser's developer console",
					name: 'infoMessage',
					type: 'notice',
					default: '',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const nodeVersion = this.getNode().typeVersion;

		const fullResponseProperties = ['body', 'headers', 'statusCode', 'statusMessage'];

		let authentication;

		try {
			authentication = this.getNodeParameter('authentication', 0) as
				| 'predefinedCredentialType'
				| 'genericCredentialType'
				| 'none';
		} catch {}

		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let httpCustomAuth;
		let oAuth1Api;
		let oAuth2Api;
		let sslCertificates;
		let nodeCredentialType: string | undefined;
		let genericCredentialType: string | undefined;

		let requestOptions: IRequestOptions = {
			uri: '',
		};

		let returnItems: INodeExecutionData[] = [];
		const requestPromises = [];

		let fullResponse = false;

		let autoDetectResponseFormat = false;

		// Can not be defined on a per item level
		const pagination = this.getNodeParameter('options.pagination.pagination', 0, null, {
			rawExpressions: true,
		}) as {
			paginationMode: 'off' | 'updateAParameterInEachRequest' | 'responseContainsNextURL';
			nextURL?: string;
			parameters: {
				parameters: Array<{
					type: 'body' | 'headers' | 'qs';
					name: string;
					value: string;
				}>;
			};
			paginationCompleteWhen: 'responseIsEmpty' | 'receiveSpecificStatusCodes' | 'other';
			statusCodesWhenComplete: string;
			completeExpression: string;
			limitPagesFetched: boolean;
			maxRequests: number;
			requestInterval: number;
		};

		const requests: Array<{
			options: IRequestOptions;
			authKeys: IAuthDataSanitizeKeys;
			credentialType?: string;
		}> = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			if (authentication === 'genericCredentialType') {
				genericCredentialType = this.getNodeParameter('genericAuthType', 0) as string;

				if (genericCredentialType === 'httpBasicAuth') {
					httpBasicAuth = await this.getCredentials('httpBasicAuth', itemIndex);
				} else if (genericCredentialType === 'httpDigestAuth') {
					httpDigestAuth = await this.getCredentials('httpDigestAuth', itemIndex);
				} else if (genericCredentialType === 'httpHeaderAuth') {
					httpHeaderAuth = await this.getCredentials('httpHeaderAuth', itemIndex);
				} else if (genericCredentialType === 'httpQueryAuth') {
					httpQueryAuth = await this.getCredentials('httpQueryAuth', itemIndex);
				} else if (genericCredentialType === 'httpCustomAuth') {
					httpCustomAuth = await this.getCredentials('httpCustomAuth', itemIndex);
				} else if (genericCredentialType === 'oAuth1Api') {
					oAuth1Api = await this.getCredentials('oAuth1Api', itemIndex);
				} else if (genericCredentialType === 'oAuth2Api') {
					oAuth2Api = await this.getCredentials('oAuth2Api', itemIndex);
				}
			} else if (authentication === 'predefinedCredentialType') {
				nodeCredentialType = this.getNodeParameter('nodeCredentialType', itemIndex) as string;
			}

			const provideSslCertificates = this.getNodeParameter(
				'provideSslCertificates',
				itemIndex,
				false,
			);

			if (provideSslCertificates) {
				sslCertificates = (await this.getCredentials(
					'httpSslAuth',
					itemIndex,
				)) as HttpSslAuthCredentials;
			}

			const requestMethod = this.getNodeParameter('method', itemIndex) as IHttpRequestMethods;

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
			const bodyParameters = this.getNodeParameter(
				'bodyParameters.parameters',
				itemIndex,
				[],
			) as BodyParameter[];
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
				resolveWithFullResponse: true,
			};

			if (requestOptions.method !== 'GET' && nodeVersion >= 4.1) {
				requestOptions = { ...requestOptions, followAllRedirects: false };
			}

			const defaultRedirect = nodeVersion >= 4 && redirect === undefined;

			if (redirect?.redirect?.followRedirects || defaultRedirect) {
				requestOptions.followRedirect = true;
				requestOptions.followAllRedirects = true;
			}

			if (redirect?.redirect?.maxRedirects || defaultRedirect) {
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
				// set default timeout to 5 minutes
				requestOptions.timeout = 300_000;
			}
			if (sendQuery && queryParameterArrays) {
				Object.assign(requestOptions, {
					qsStringifyOptions: { arrayFormat: queryParameterArrays },
				});
			}

			const parametersToKeyValue = async (
				accumulator: { [key: string]: any },
				cur: { name: string; value: string; parameterType?: string; inputDataFieldName?: string },
			) => {
				if (cur.parameterType === 'formBinaryData') {
					if (!cur.inputDataFieldName) return accumulator;
					const binaryData = this.helpers.assertBinaryData(itemIndex, cur.inputDataFieldName);
					let uploadData: Buffer | Readable;
					const itemBinaryData = items[itemIndex].binary![cur.inputDataFieldName];
					if (itemBinaryData.id) {
						uploadData = await this.helpers.getBinaryStream(itemBinaryData.id);
					} else {
						uploadData = Buffer.from(itemBinaryData.data, BINARY_ENCODING);
					}

					accumulator[cur.name] = {
						value: uploadData,
						options: {
							filename: binaryData.fileName,
							contentType: binaryData.mimeType,
						},
					};
					return accumulator;
				}
				accumulator[cur.name] = cur.value;
				return accumulator;
			};

			// Get parameters defined in the UI
			if (sendBody && bodyParameters) {
				if (specifyBody === 'keypair' || bodyContentType === 'multipart-form-data') {
					requestOptions.body = await prepareRequestBody(
						bodyParameters,
						bodyContentType,
						nodeVersion,
						parametersToKeyValue,
					);
				} else if (specifyBody === 'json') {
					// body is specified using JSON
					if (typeof jsonBodyParameter !== 'object' && jsonBodyParameter !== null) {
						try {
							JSON.parse(jsonBodyParameter);
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'JSON parameter need to be an valid JSON',
								{
									itemIndex,
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
					requestOptions.formData = requestOptions.body as IDataObject;
					delete requestOptions.body;
				} else if (bodyContentType === 'form-urlencoded') {
					requestOptions.form = requestOptions.body as IDataObject;
					delete requestOptions.body;
				} else if (bodyContentType === 'binaryData') {
					const inputDataFieldName = this.getNodeParameter(
						'inputDataFieldName',
						itemIndex,
					) as string;

					let uploadData: Buffer | Readable;
					let contentLength: number;

					const itemBinaryData = this.helpers.assertBinaryData(itemIndex, inputDataFieldName);

					if (itemBinaryData.id) {
						uploadData = await this.helpers.getBinaryStream(itemBinaryData.id);
						const metadata = await this.helpers.getBinaryMetadata(itemBinaryData.id);
						contentLength = metadata.fileSize;
					} else {
						uploadData = Buffer.from(itemBinaryData.data, BINARY_ENCODING);
						contentLength = uploadData.length;
					}
					requestOptions.body = uploadData;
					requestOptions.headers = {
						...requestOptions.headers,
						'content-length': contentLength,
						'content-type': itemBinaryData.mimeType ?? 'application/octet-stream',
					};
				} else if (bodyContentType === 'raw') {
					requestOptions.body = body;
				}
			}

			// Get parameters defined in the UI
			if (sendQuery && queryParameters) {
				if (specifyQuery === 'keypair') {
					requestOptions.qs = await reduceAsync(queryParameters, parametersToKeyValue);
				} else if (specifyQuery === 'json') {
					// query is specified using JSON
					try {
						JSON.parse(jsonQueryParameter);
					} catch {
						throw new NodeOperationError(
							this.getNode(),
							'JSON parameter need to be an valid JSON',
							{
								itemIndex,
							},
						);
					}

					requestOptions.qs = jsonParse(jsonQueryParameter);
				}
			}

			// Get parameters defined in the UI
			if (sendHeaders && headerParameters) {
				let additionalHeaders: IDataObject = {};
				if (specifyHeaders === 'keypair') {
					additionalHeaders = await reduceAsync(
						headerParameters.filter((header) => header.name),
						parametersToKeyValue,
					);
				} else if (specifyHeaders === 'json') {
					// body is specified using JSON
					try {
						JSON.parse(jsonHeadersParameter);
					} catch {
						throw new NodeOperationError(
							this.getNode(),
							'JSON parameter need to be an valid JSON',
							{
								itemIndex,
							},
						);
					}

					additionalHeaders = jsonParse(jsonHeadersParameter);
				}
				requestOptions.headers = {
					...requestOptions.headers,
					...keysToLowercase(additionalHeaders),
				};
			}

			if (autoDetectResponseFormat || responseFormat === 'file') {
				requestOptions.encoding = null;
				requestOptions.json = false;
				requestOptions.useStream = true;
			} else if (bodyContentType === 'raw') {
				requestOptions.json = false;
				requestOptions.useStream = true;
			} else {
				requestOptions.json = true;
			}

			// Add Content Type if any are set
			if (bodyContentType === 'raw') {
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}
				const rawContentType = this.getNodeParameter('rawContentType', itemIndex) as string;
				requestOptions.headers['content-type'] = rawContentType;
			}

			const authDataKeys: IAuthDataSanitizeKeys = {};

			// Add SSL certificates if any are set
			setAgentOptions(requestOptions, sslCertificates);
			if (requestOptions.agentOptions) {
				authDataKeys.agentOptions = Object.keys(requestOptions.agentOptions);
			}

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
			if (httpCustomAuth !== undefined) {
				const customAuth = jsonParse<IRequestOptionsSimplified>(
					(httpCustomAuth.json as string) || '{}',
					{ errorMessage: 'Invalid Custom Auth JSON' },
				);
				if (customAuth.headers) {
					requestOptions.headers = { ...requestOptions.headers, ...customAuth.headers };
					authDataKeys.headers = Object.keys(customAuth.headers);
				}
				if (customAuth.body) {
					requestOptions.body = { ...(requestOptions.body as IDataObject), ...customAuth.body };
					authDataKeys.body = Object.keys(customAuth.body);
				}
				if (customAuth.qs) {
					requestOptions.qs = { ...requestOptions.qs, ...customAuth.qs };
					authDataKeys.qs = Object.keys(customAuth.qs);
				}
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

			requests.push({
				options: requestOptions,
				authKeys: authDataKeys,
				credentialType: nodeCredentialType,
			});

			if (pagination && pagination.paginationMode !== 'off') {
				let continueExpression = '={{false}}';
				if (pagination.paginationCompleteWhen === 'receiveSpecificStatusCodes') {
					// Split out comma separated list of status codes into array
					const statusCodesWhenCompleted = pagination.statusCodesWhenComplete
						.split(',')
						.map((item) => parseInt(item.trim()));

					continueExpression = `={{ !${JSON.stringify(
						statusCodesWhenCompleted,
					)}.includes($response.statusCode) }}`;
				} else if (pagination.paginationCompleteWhen === 'responseIsEmpty') {
					continueExpression =
						'={{ Array.isArray($response.body) ? $response.body.length : !!$response.body }}';
				} else {
					// Other
					if (!pagination.completeExpression.length || pagination.completeExpression[0] !== '=') {
						throw new NodeOperationError(this.getNode(), 'Invalid or empty Complete Expression');
					}
					continueExpression = `={{ !(${pagination.completeExpression.trim().slice(3, -2)}) }}`;
				}

				const paginationData: PaginationOptions = {
					continue: continueExpression,
					request: {},
					requestInterval: pagination.requestInterval,
				};

				if (pagination.paginationMode === 'updateAParameterInEachRequest') {
					// Iterate over all parameters and add them to the request
					paginationData.request = {};
					const { parameters } = pagination.parameters;
					if (parameters.length === 1 && parameters[0].name === '' && parameters[0].value === '') {
						throw new NodeOperationError(
							this.getNode(),
							"At least one entry with 'Name' and 'Value' filled must be included in 'Parameters' to use 'Update a Parameter in Each Request' mode ",
						);
					}
					pagination.parameters.parameters.forEach((parameter, index) => {
						if (!paginationData.request[parameter.type]) {
							paginationData.request[parameter.type] = {};
						}
						const parameterName = parameter.name;
						if (parameterName === '') {
							throw new NodeOperationError(
								this.getNode(),
								`Parameter name must be set for parameter [${index + 1}] in pagination settings`,
							);
						}
						const parameterValue = parameter.value;
						if (parameterValue === '') {
							throw new NodeOperationError(
								this.getNode(),
								`Some value must be provided for parameter [${
									index + 1
								}] in pagination settings, omitting it will result in an infinite loop`,
							);
						}
						paginationData.request[parameter.type]![parameterName] = parameterValue;
					});
				} else if (pagination.paginationMode === 'responseContainsNextURL') {
					paginationData.request.url = pagination.nextURL;
				}

				if (pagination.limitPagesFetched) {
					paginationData.maxRequests = pagination.maxRequests;
				}

				if (responseFormat === 'file') {
					paginationData.binaryResult = true;
				}

				const requestPromise = this.helpers.requestWithAuthenticationPaginated
					.call(
						this,
						requestOptions,
						itemIndex,
						paginationData,
						nodeCredentialType ?? genericCredentialType,
					)
					.catch((error) => {
						if (error instanceof NodeOperationError && error.type === 'invalid_url') {
							const urlParameterName =
								pagination.paginationMode === 'responseContainsNextURL' ? 'Next URL' : 'URL';
							throw new NodeOperationError(this.getNode(), error.message, {
								description: `Make sure the "${urlParameterName}" parameter evaluates to a valid URL.`,
							});
						}

						throw error;
					});
				requestPromises.push(requestPromise);
			} else if (authentication === 'genericCredentialType' || authentication === 'none') {
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
					itemIndex,
				);
				requestWithAuthentication.catch(() => {});
				requestPromises.push(requestWithAuthentication);
			}
		}

		const sanitizedRequests: IDataObject[] = [];
		const promisesResponses = await Promise.allSettled(
			requestPromises.map(
				async (requestPromise, itemIndex) =>
					await requestPromise.finally(async () => {
						try {
							// Secrets need to be read after the request because secrets could have changed
							// For example: OAuth token refresh, preAuthentication
							const { options, authKeys, credentialType } = requests[itemIndex];
							let secrets: string[] = [];
							if (credentialType) {
								const properties = this.getCredentialsProperties(credentialType);
								const credentials = await this.getCredentials(credentialType, itemIndex);
								secrets = getSecrets(properties, credentials);
							}
							const sanitizedRequestOptions = sanitizeUiMessage(options, authKeys, secrets);
							sanitizedRequests.push(sanitizedRequestOptions);
							this.sendMessageToUI(sanitizedRequestOptions);
						} catch (e) {}
					}),
			),
		);

		let responseData: any;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			responseData = promisesResponses.shift();
			if (responseData!.status !== 'fulfilled') {
				if (responseData.reason.statusCode === 429) {
					responseData.reason.message =
						"Try spacing your requests out using the batching settings under 'Options'";
				}
				if (!this.continueOnFail()) {
					if (autoDetectResponseFormat && responseData.reason.error instanceof Buffer) {
						responseData.reason.error = Buffer.from(responseData.reason.error as Buffer).toString();
					}
					const error = new NodeApiError(this.getNode(), responseData as JsonObject, { itemIndex });
					set(error, 'context.request', sanitizedRequests[itemIndex]);
					throw error;
				} else {
					removeCircularRefs(responseData.reason as JsonObject);
					// Return the actual reason as error
					returnItems.push({
						json: {
							error: responseData.reason,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
			}

			let responses: any[];
			if (Array.isArray(responseData.value)) {
				responses = responseData.value;
			} else {
				responses = [responseData.value];
			}

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

			// eslint-disable-next-line prefer-const
			for (let [index, response] of Object.entries(responses)) {
				if (response?.request?.constructor.name === 'ClientRequest') delete response.request;

				if (this.getMode() === 'manual' && index === '0') {
					// For manual executions save the first response in the context
					// so that we can use it in the frontend and so make it easier for
					// the users to create the required pagination expressions
					const nodeContext = this.getContext('node');
					if (pagination && pagination.paginationMode !== 'off') {
						nodeContext.response = responseData.value[0];
					} else {
						nodeContext.response = responseData.value;
					}
				}

				const responseContentType = response.headers['content-type'] ?? '';
				if (autoDetectResponseFormat) {
					if (responseContentType.includes('application/json')) {
						responseFormat = 'json';
						if (!response.__bodyResolved) {
							const neverError = this.getNodeParameter(
								'options.response.response.neverError',
								0,
								false,
							) as boolean;

							const data = await this.helpers
								.binaryToBuffer(response.body as Buffer | Readable)
								.then((body) => body.toString());
							response.body = jsonParse(data, {
								...(neverError
									? { fallbackValue: {} }
									: { errorMessage: 'Invalid JSON in response body' }),
							});
						}
					} else if (binaryContentTypes.some((e) => responseContentType.includes(e))) {
						responseFormat = 'file';
					} else {
						responseFormat = 'text';
						if (!response.__bodyResolved) {
							const data = await this.helpers
								.binaryToBuffer(response.body as Buffer | Readable)
								.then((body) => body.toString());
							response.body = !data ? undefined : data;
						}
					}
				}

				if (autoDetectResponseFormat && !fullResponse) {
					delete response.headers;
					delete response.statusCode;
					delete response.statusMessage;
				}
				if (!fullResponse) {
					response = response.body;
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

					let binaryData: Buffer | Readable;
					if (fullResponse) {
						const returnItem: IDataObject = {};
						for (const property of fullResponseProperties) {
							if (property === 'body') {
								continue;
							}
							returnItem[property] = response[property];
						}

						newItem.json = returnItem;
						binaryData = response?.body;
					} else {
						newItem.json = items[itemIndex].json;
						binaryData = response;
					}
					const preparedBinaryData = await this.helpers.prepareBinaryData(
						binaryData,
						undefined,
						responseContentType || undefined,
					);

					if (
						!preparedBinaryData.fileName &&
						preparedBinaryData.fileExtension &&
						typeof requestOptions.uri === 'string' &&
						requestOptions.uri.endsWith(preparedBinaryData.fileExtension)
					) {
						preparedBinaryData.fileName = requestOptions.uri.split('/').pop();
					}

					newItem.binary![outputPropertyName] = preparedBinaryData;

					returnItems.push(newItem);
				} else if (responseFormat === 'text') {
					const outputPropertyName = this.getNodeParameter(
						'options.response.response.outputPropertyName',
						0,
						'data',
					) as string;
					if (fullResponse) {
						const returnItem: IDataObject = {};
						for (const property of fullResponseProperties) {
							if (property === 'body') {
								returnItem[outputPropertyName] = toText(response[property]);
								continue;
							}

							returnItem[property] = response[property];
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
					if (fullResponse) {
						const returnItem: IDataObject = {};
						for (const property of fullResponseProperties) {
							returnItem[property] = response[property];
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
								if (typeof response !== 'object') {
									response = JSON.parse(response);
								}
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
		}

		returnItems = returnItems.map(replaceNullValues);

		return [returnItems];
	}
}
