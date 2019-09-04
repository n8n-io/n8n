import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

interface OptionData {
	name: string;
	displayName: string;
}

interface OptionDataParamters {
	[key: string]: OptionData;
}


export class HttpRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTTP Request',
		name: 'httpRequest',
		icon: 'fa:at',
		group: ['input'],
		version: 1,
		description: 'Makes a HTTP request and returns the received data',
		defaults: {
			name: 'HTTP Request',
			color: '#2200DD',
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
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth'
					},
					{
						name: 'Digest Auth',
						value: 'digestAuth'
					},
					{
						name: 'Header Auth',
						value: 'headerAuth'
					},
					{
						name: 'None',
						value: 'none'
					},
				],
				default: 'none',
				description: 'The way to authenticate.',
			},
			{
				displayName: 'Request Method',
				name: 'requestMethod',
				type: 'options',
				options: [
					{
						name: 'DELETE',
						value: 'DELETE'
					},
					{
						name: 'GET',
						value: 'GET'
					},
					{
						name: 'HEAD',
						value: 'HEAD'
					},
					{
						name: 'POST',
						value: 'POST'
					},
					{
						name: 'PUT',
						value: 'PUT'
					},
				],
				default: 'GET',
				description: 'The request method to use.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'http://example.com/index.html',
				description: 'The URL to make the request to.',
				required: true,
			},
			{
				displayName: 'Ignore SSL Issues',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Still download the response even if SSL certificate validation is not possible.',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{
						name: 'File',
						value: 'file'
					},
					{
						name: 'JSON',
						value: 'json'
					},
					{
						name: 'String',
						value: 'string'
					},
				],
				default: 'json',
				description: 'The format in which the data gets returned from the URL.',
			},

			{
				displayName: 'Property Name',
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
			{
				displayName: 'Binary Property',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						responseFormat: [
							'file',
						],
					},

				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},

			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				description: 'If the query and/or body parameter should be set via the UI or raw as JSON',
			},

			// Header Parameters
			{
				displayName: 'Headers',
				name: 'headerParametersJson',
				type: 'json',
				displayOptions: {
					show: {
						jsonParameters: [
							true,
						],
					},
				},
				default: '',
				description: 'Header parameters as JSON (flat object).',
			},
			{
				displayName: 'Headers',
				name: 'headerParametersUi',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [
							false,
						],
					},
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
						]
					},
				],
			},

			// Body Parameter
			{
				displayName: 'Body Parameters',
				name: 'bodyParametersJson',
				type: 'json',
				displayOptions: {
					show: {
						jsonParameters: [
							true,
						],
						requestMethod: [
							'POST',
						],
					},
				},
				default: '',
				description: 'Body parameters as JSON.',
			},
			{
				displayName: 'Body Parameters',
				name: 'bodyParametersUi',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [
							false,
						],
						requestMethod: [
							'POST',
						],
					},
				},
				description: 'The body parameter to send.',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the parameter.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the parameter.',
							},
						]
					},
				],
			},

			// Query Parameter
			{
				displayName: 'Query Parameters',
				name: 'queryParametersJson',
				type: 'json',
				displayOptions: {
					show: {
						jsonParameters: [
							true,
						],
					},
				},
				default: '',
				description: 'Query parameters as JSON (flat object).',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParametersUi',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [
							false,
						],
					},
				},
				description: 'The query parameter to send.',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the parameter.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the parameter.',
							},
						]
					},
				],
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// TODO: Should have a setting which makes clear that this parameter can not change for each item
		const requestMethod = this.getNodeParameter('requestMethod', 0) as string;
		const parametersAreJson = this.getNodeParameter('jsonParameters', 0) as boolean;
		const responseFormat = this.getNodeParameter('responseFormat', 0) as string;

		const httpBasicAuth = this.getCredentials('httpBasicAuth');
		const httpDigestAuth = this.getCredentials('httpDigestAuth');
		const httpHeaderAuth = this.getCredentials('httpHeaderAuth');

		let url: string;
		let requestOptions: OptionsWithUri;
		let setUiParameter: IDataObject;

		const uiParameters: IDataObject = {
			bodyParametersUi: 'body',
			headerParametersUi: 'headers',
			queryParametersUi: 'qs',
		};

		const jsonParameters: OptionDataParamters = {
			bodyParametersJson: {
				name: 'body',
				displayName: 'Body Parameters',
			},
			headerParametersJson: {
				name: 'headers',
				displayName: 'Headers',
			},
			queryParametersJson: {
				name: 'qs',
				displayName: 'Query Paramters',
			},
		};

		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			url = this.getNodeParameter('url', itemIndex) as string;

			requestOptions = {
				headers: {},
				method: requestMethod,
				uri: url,
				rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
			};

			if (parametersAreJson === true) {
				// Parameters are defined as JSON
				let optionData: OptionData;
				for (const parameterName of Object.keys(jsonParameters)) {
					optionData = jsonParameters[parameterName] as OptionData;
					const tempValue = this.getNodeParameter(parameterName, itemIndex, {}) as string | object;
					if (tempValue === '') {
						// Paramter is empty so skip it
						continue;
					}
					// @ts-ignore
					requestOptions[optionData.name] = tempValue;

					// @ts-ignore
					if (typeof requestOptions[optionData.name] !== 'object') {
						// If it is not an object it must be JSON so parse it
						try {
							// @ts-ignore
							requestOptions[optionData.name] = JSON.parse(requestOptions[optionData.name]);
						} catch (e) {
							throw new Error(`The data in "${optionData.displayName}" is no valid JSON.`);
						}
					}
				}
			} else {
				// Paramters are defined in UI
				let optionName: string;
				for (const parameterName of Object.keys(uiParameters)) {
					setUiParameter = this.getNodeParameter(parameterName, itemIndex, {}) as IDataObject;
					optionName = uiParameters[parameterName] as string;
					if (setUiParameter.parameter !== undefined) {
						// @ts-ignore
						requestOptions[optionName] = {};
						for (const parameterData of setUiParameter!.parameter as IDataObject[]) {
							// @ts-ignore
							requestOptions[optionName][parameterData!.name as string] = parameterData!.value;
						}
					}
				}
			}

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
			if (httpDigestAuth !== undefined) {
				requestOptions.auth = {
					user: httpDigestAuth.user as string,
					pass: httpDigestAuth.password as string,
					sendImmediately: false,
				};
			}

			if (responseFormat === 'file') {
				requestOptions.encoding = null;
			} else {
				requestOptions.json = true;
			}

			// Now that the options are all set make the actual http request
			const response = await this.helpers.request(requestOptions);

			if (responseFormat === 'file') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0) as string;

				const newItem: INodeExecutionData = {
					json: items[itemIndex].json,
					binary: {},
				};

				if (items[itemIndex].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[itemIndex].binary);
				}

				items[itemIndex] = newItem;

				const fileName = (url).split('/').pop();

				items[itemIndex].binary![dataPropertyName] = await this.helpers.prepareBinaryData(response, fileName);
			} else if (responseFormat === 'string') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0) as string;

				returnItems.push({
					json: {
						[dataPropertyName]: response,
					}
				});
			} else {
				// responseFormat: 'json'
				returnItems.push({ json: response });
			}
		}

		if (responseFormat === 'file') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output items get replaced
			return this.prepareOutputData(returnItems);
		}
	}
}
