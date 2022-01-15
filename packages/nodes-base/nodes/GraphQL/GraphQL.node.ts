import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';
import { RequestPromiseOptions } from 'request-promise-native';

export class GraphQL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GraphQL',
		name: 'graphql',
		icon: 'file:graphql.png',
		group: ['input'],
		version: 1,
		description: 'Makes a GraphQL request and returns the received data',
		defaults: {
			name: 'GraphQL',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'basicAuth',
						],
					},
				},
			},
			{
				name: 'httpDigestAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'digestAuth',
						],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'headerAuth',
						],
					},
				},
			},
			{
				name: 'httpQueryAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'queryAuth',
						],
					},
				},
			},
			{
				name: 'oAuth1Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth1',
						],
					},
				},
			},
			{
				name: 'oAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'Digest Auth',
						value: 'digestAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'Query Auth',
						value: 'queryAuth',
					},
					{
						name: 'OAuth1',
						value: 'oAuth1',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate.',
			},
			{
				displayName: 'HTTP Request Method',
				name: 'requestMethod',
				type: 'options',
				options: [
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'POST',
						value: 'POST',
					},
				],
				default: 'POST',
				description: 'The underlying HTTP request method to use.',
			},
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: '',
				placeholder: 'http://example.com/graphql',
				description: 'The GraphQL endpoint.',
				required: true,
			},
			{
				displayName: 'Ignore SSL Issues',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Still fetch the response even if SSL certificate validation is not possible.',
			},
			{
				displayName: 'Request Format',
				name: 'requestFormat',
				type: 'options',
				required: true,
				options: [
					{
						name: 'GraphQL (raw)',
						value: 'graphql',
					},
					{
						name: 'JSON',
						value: 'json',
					},
				],
				displayOptions: {
					show: {
						requestMethod: [
							'POST',
						],
					},
				},
				default: 'graphql',
				description: 'The format for the query payload',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'json',
				default: '',
				description: 'GraphQL query',
				required: true,
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '',
				description: 'Query variables',
				displayOptions: {
					show: {
						requestFormat: [
							'json',
						],
						requestMethod: [
							'POST',
						],
					},
				},
			},
			{
				displayName: 'Operation Name',
				name: 'operationName',
				type: 'string',
				default: '',
				description: 'Name of operation to execute',
				displayOptions: {
					show: {
						requestFormat: [
							'json',
						],
						requestMethod: [
							'POST',
						],
					},
				},
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
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
				description: 'The format in which the data gets returned from the URL.',
			},
			{
				displayName: 'Response Data Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						responseFormat: [
							'string',
						],
					},
				},
				description: 'Name of the property to which to write the response data.',
			},

			// Header Parameters
			{
				displayName: 'Headers',
				name: 'headerParametersUi',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The headers to send.',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the header.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the header.',
							},
						],
					},
				],
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const httpBasicAuth = await this.getCredentials('httpBasicAuth');
		const httpDigestAuth = await this.getCredentials('httpDigestAuth');
		const httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
		const httpQueryAuth = await this.getCredentials('httpQueryAuth');
		const oAuth1Api = await this.getCredentials('oAuth1Api');
		const oAuth2Api = await this.getCredentials('oAuth2Api');

		let requestOptions: OptionsWithUri & RequestPromiseOptions;

		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const requestMethod = this.getNodeParameter('requestMethod', itemIndex, 'POST') as string;
				const endpoint = this.getNodeParameter('endpoint', itemIndex, '') as string;
				const requestFormat = this.getNodeParameter('requestFormat', itemIndex, 'graphql') as string;
				const responseFormat = this.getNodeParameter('responseFormat', 0) as string;

				const { parameter }: { parameter?: Array<{ name: string, value: string }> } = this
					.getNodeParameter('headerParametersUi', itemIndex, {}) as IDataObject;
				const headerParameters = (parameter || []).reduce((result, item) => ({
					...result,
					[item.name]: item.value,
				}), {});

				requestOptions = {
					headers: {
						'content-type': `application/${requestFormat}`,
						...headerParameters,
					},
					method: requestMethod,
					uri: endpoint,
					simple: false,
					rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
				};

				// Add credentials if any are set
				if (httpBasicAuth !== undefined) {
					requestOptions.auth = {
						user: httpBasicAuth.user as string,
						pass: httpBasicAuth.password as string,
					};
				}
				if (httpHeaderAuth !== undefined) {
					requestOptions.headers![httpHeaderAuth.name as string] = httpHeaderAuth.value;
				}
				if (httpQueryAuth !== undefined) {
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}
					requestOptions.qs![httpQueryAuth.name as string] = httpQueryAuth.value;
				}
				if (httpDigestAuth !== undefined) {
					requestOptions.auth = {
						user: httpDigestAuth.user as string,
						pass: httpDigestAuth.password as string,
						sendImmediately: false,
					};
				}

				const gqlQuery = this.getNodeParameter('query', itemIndex, '') as string;
				if (requestMethod === 'GET') {
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}
					requestOptions.qs.query = gqlQuery;
				} else {
					if (requestFormat === 'json') {
						requestOptions.body = {
							query: gqlQuery,
							variables: this.getNodeParameter('variables', itemIndex, {}) as object,
							operationName: this.getNodeParameter('operationName', itemIndex) as string,
						};
						if (typeof requestOptions.body.variables === 'string') {
							try {
								requestOptions.body.variables = JSON.parse(requestOptions.body.variables || '{}');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Using variables failed:\n' + requestOptions.body.variables + '\n\nWith error message:\n' + error);
							}
						}
						if (requestOptions.body.operationName === '') {
							requestOptions.body.operationName = null;
						}
						requestOptions.json = true;
					} else {
						requestOptions.body = gqlQuery;
					}
				}

				let response;
				// Now that the options are all set make the actual http request
				if (oAuth1Api !== undefined) {
					response = await this.helpers.requestOAuth1.call(this, 'oAuth1Api', requestOptions);
				} else if (oAuth2Api !== undefined) {
					response = await this.helpers.requestOAuth2.call(this, 'oAuth2Api', requestOptions, { tokenType: 'Bearer' });
				} else {
					response = await this.helpers.request(requestOptions);
				}
				if (responseFormat === 'string') {
					const dataPropertyName = this.getNodeParameter('dataPropertyName', 0) as string;

					returnItems.push({
						json: {
							[dataPropertyName]: response,
						},
					});
				} else {
					if (typeof response === 'string') {
						try {
							returnItems.push({ json: JSON.parse(response) });
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Response body is not valid JSON. Change "Response Format" to "String"');
						}
					} else {
						returnItems.push({ json: response });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnItems);
	}
}
