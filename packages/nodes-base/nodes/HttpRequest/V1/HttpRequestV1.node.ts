import type { Readable } from 'stream';

import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep, removeCircularRefs } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';
import type { IAuthDataSanitizeKeys } from '../GenericFunctions';
import { replaceNullValues, sanitizeUiMessage } from '../GenericFunctions';
interface OptionData {
	name: string;
	displayName: string;
}

interface OptionDataParameters {
	[key: string]: OptionData;
}

type OptionsWithUriKeys = keyof OptionsWithUri;

export class HttpRequestV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'HTTP Request',
				color: '#2200DD',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				// ----------------------------------
				//            v1 creds
				// ----------------------------------
				{
					name: 'httpBasicAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['basicAuth'],
						},
					},
				},
				{
					name: 'httpDigestAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['digestAuth'],
						},
					},
				},
				{
					name: 'httpHeaderAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['headerAuth'],
						},
					},
				},
				{
					name: 'httpQueryAuth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['queryAuth'],
						},
					},
				},
				{
					name: 'oAuth1Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth1'],
						},
					},
				},
				{
					name: 'oAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
						},
					},
				},
			],
			properties: [
				// ----------------------------------
				//           v1 params
				// ----------------------------------
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
							name: 'None',
							value: 'none',
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
							name: 'Query Auth',
							value: 'queryAuth',
						},
					],
					default: 'none',
					description: 'The way to authenticate',
				},

				// ----------------------------------
				//        versionless params
				// ----------------------------------
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
					displayName: 'Ignore SSL Issues',
					name: 'allowUnauthorizedCerts',
					type: 'boolean',
					default: false,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
					description:
						'Whether to download the response even if SSL certificate validation is not possible',
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
					displayName: 'Property Name',
					name: 'dataPropertyName',
					type: 'string',
					default: 'data',
					required: true,
					displayOptions: {
						show: {
							responseFormat: ['string'],
						},
					},
					description: 'Name of the property to which to write the response data',
				},
				{
					displayName: 'Binary Property',
					name: 'dataPropertyName',
					type: 'string',
					default: 'data',
					required: true,
					displayOptions: {
						show: {
							responseFormat: ['file'],
						},
					},
					description: 'Name of the binary property to which to write the data of the read file',
				},

				{
					displayName: 'JSON/RAW Parameters',
					name: 'jsonParameters',
					type: 'boolean',
					default: false,
					description:
						'Whether the query and/or body parameter should be set via the value-key pair UI or JSON/RAW',
				},

				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					options: [
						{
							displayName: 'Batch Interval',
							name: 'batchInterval',
							type: 'number',
							typeOptions: {
								minValue: 0,
							},
							default: 1000,
							description: 'Time (in milliseconds) between each batch of requests. 0 for disabled.',
						},
						{
							displayName: 'Batch Size',
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
							displayName: 'Body Content Type',
							name: 'bodyContentType',
							type: 'options',
							displayOptions: {
								show: {
									'/requestMethod': ['PATCH', 'POST', 'PUT'],
								},
							},
							options: [
								{
									name: 'JSON',
									value: 'json',
								},
								{
									name: 'RAW/Custom',
									value: 'raw',
								},
								{
									name: 'Form-Data Multipart',
									value: 'multipart-form-data',
								},
								{
									name: 'Form Urlencoded',
									value: 'form-urlencoded',
								},
							],
							default: 'json',
							description: 'Content-Type to use to send body parameters',
						},
						{
							displayName: 'Full Response',
							name: 'fullResponse',
							type: 'boolean',
							default: false,
							description: 'Whether to return the full response data instead of only the body',
						},
						{
							displayName: 'Follow All Redirects',
							name: 'followAllRedirects',
							type: 'boolean',
							default: false,
							description: 'Whether to follow non-GET HTTP 3xx redirects',
						},
						{
							displayName: 'Follow GET Redirect',
							name: 'followRedirect',
							type: 'boolean',
							default: true,
							description: 'Whether to follow GET HTTP 3xx redirects',
						},
						{
							displayName: 'Ignore Response Code',
							name: 'ignoreResponseCode',
							type: 'boolean',
							default: false,
							description: 'Whether to succeeds also when status code is not 2xx',
						},
						{
							displayName: 'MIME Type',
							name: 'bodyContentCustomMimeType',
							type: 'string',
							default: '',
							placeholder: 'text/xml',
							description: 'Specify the mime type for raw/custom body type',
							displayOptions: {
								show: {
									'/requestMethod': ['PATCH', 'POST', 'PUT'],
								},
							},
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
							displayName: 'Split Into Items',
							name: 'splitIntoItems',
							type: 'boolean',
							default: false,
							description: 'Whether to output each element of an array as own item',
							displayOptions: {
								show: {
									'/responseFormat': ['json'],
								},
							},
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
						{
							displayName: 'Use Querystring',
							name: 'useQueryString',
							type: 'boolean',
							default: false,
							description:
								'Whether you need arrays to be serialized as foo=bar&foo=baz instead of the default foo[0]=bar&foo[1]=baz',
						},
					],
				},

				// Body Parameter
				{
					displayName: 'Send Binary Data',
					name: 'sendBinaryData',
					type: 'boolean',
					displayOptions: {
						show: {
							// TODO: Make it possible to use dot-notation
							// 'options.bodyContentType': [
							// 	'raw',
							// ],
							jsonParameters: [true],
							requestMethod: ['PATCH', 'POST', 'PUT'],
						},
					},
					default: false,
					description: 'Whether binary data should be send as body',
				},
				{
					displayName: 'Binary Property',
					name: 'binaryPropertyName',
					type: 'string',
					required: true,
					default: 'data',
					displayOptions: {
						hide: {
							sendBinaryData: [false],
						},
						show: {
							jsonParameters: [true],
							requestMethod: ['PATCH', 'POST', 'PUT'],
						},
					},
					description:
						'Name of the binary property which contains the data for the file to be uploaded. For Form-Data Multipart, they can be provided in the format: <code>"sendKey1:binaryProperty1,sendKey2:binaryProperty2</code>',
				},
				{
					displayName: 'Body Parameters',
					name: 'bodyParametersJson',
					type: 'json',
					displayOptions: {
						hide: {
							sendBinaryData: [true],
						},
						show: {
							jsonParameters: [true],
							requestMethod: ['PATCH', 'POST', 'PUT', 'DELETE'],
						},
					},
					default: '',
					description: 'Body parameters as JSON or RAW',
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
							jsonParameters: [false],
							requestMethod: ['PATCH', 'POST', 'PUT', 'DELETE'],
						},
					},
					description: 'The body parameter to send',
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
									description: 'Name of the parameter',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
									description: 'Value of the parameter',
								},
							],
						},
					],
				},

				// Header Parameters
				{
					displayName: 'Headers',
					name: 'headerParametersJson',
					type: 'json',
					displayOptions: {
						show: {
							jsonParameters: [true],
						},
					},
					default: '',
					description: 'Header parameters as JSON or RAW',
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
							jsonParameters: [false],
						},
					},
					description: 'The headers to send',
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
									description: 'Name of the header',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
									description: 'Value to set for the header',
								},
							],
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
							jsonParameters: [true],
						},
					},
					default: '',
					description: 'Query parameters as JSON (flat object)',
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
							jsonParameters: [false],
						},
					},
					description: 'The query parameter to send',
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
									description: 'Name of the parameter',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
									description: 'Value of the parameter',
								},
							],
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

		const fullResponseProperties = ['body', 'headers', 'statusCode', 'statusMessage'];

		const responseFormat = this.getNodeParameter('responseFormat', 0) as string;

		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let oAuth1Api;
		let oAuth2Api;

		try {
			httpBasicAuth = await this.getCredentials('httpBasicAuth');
		} catch {}
		try {
			httpDigestAuth = await this.getCredentials('httpDigestAuth');
		} catch {}
		try {
			httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
		} catch {}
		try {
			httpQueryAuth = await this.getCredentials('httpQueryAuth');
		} catch {}
		try {
			oAuth1Api = await this.getCredentials('oAuth1Api');
		} catch {}
		try {
			oAuth2Api = await this.getCredentials('oAuth2Api');
		} catch {}

		let requestOptions: OptionsWithUri & { useStream?: boolean };
		let setUiParameter: IDataObject;

		const uiParameters: IDataObject = {
			bodyParametersUi: 'body',
			headerParametersUi: 'headers',
			queryParametersUi: 'qs',
		};

		const jsonParameters: OptionDataParameters = {
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
				displayName: 'Query Parameters',
			},
		};
		let returnItems: INodeExecutionData[] = [];
		const requestPromises = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const requestMethod = this.getNodeParameter('requestMethod', itemIndex) as string;
			const parametersAreJson = this.getNodeParameter('jsonParameters', itemIndex);

			const options = this.getNodeParameter('options', itemIndex, {});
			const url = this.getNodeParameter('url', itemIndex) as string;

			if (
				itemIndex > 0 &&
				(options.batchSize as number) >= 0 &&
				(options.batchInterval as number) > 0
			) {
				// defaults batch size to 1 of it's set to 0
				const batchSize: number =
					(options.batchSize as number) > 0 ? (options.batchSize as number) : 1;
				if (itemIndex % batchSize === 0) {
					await sleep(options.batchInterval as number);
				}
			}

			const fullResponse = !!options.fullResponse;

			requestOptions = {
				headers: {},
				method: requestMethod,
				uri: url,
				gzip: true,
				rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false),
			};

			if (fullResponse) {
				// @ts-ignore
				requestOptions.resolveWithFullResponse = true;
			}

			if (options.followRedirect !== undefined) {
				requestOptions.followRedirect = options.followRedirect as boolean;
			}

			if (options.followAllRedirects !== undefined) {
				requestOptions.followAllRedirects = options.followAllRedirects as boolean;
			}

			if (options.ignoreResponseCode === true) {
				// @ts-ignore
				requestOptions.simple = false;
			}
			if (options.proxy !== undefined) {
				requestOptions.proxy = options.proxy as string;
			}
			if (options.timeout !== undefined) {
				requestOptions.timeout = options.timeout as number;
			} else {
				requestOptions.timeout = 3600000; // 1 hour
			}

			if (options.useQueryString === true) {
				requestOptions.useQuerystring = true;
			}

			if (parametersAreJson) {
				// Parameters are defined as JSON
				let optionData: OptionData;
				for (const parameterName of Object.keys(jsonParameters)) {
					optionData = jsonParameters[parameterName];
					const tempValue = this.getNodeParameter(parameterName, itemIndex, '') as string | object;
					const sendBinaryData = this.getNodeParameter(
						'sendBinaryData',
						itemIndex,
						false,
					) as boolean;

					if (optionData.name === 'body' && parametersAreJson) {
						if (sendBinaryData) {
							const contentTypesAllowed = ['raw', 'multipart-form-data'];

							if (!contentTypesAllowed.includes(options.bodyContentType as string)) {
								// As n8n-workflow.NodeHelpers.getParameterResolveOrder can not be changed
								// easily to handle parameters in dot.notation simply error for now.
								throw new NodeOperationError(
									this.getNode(),
									'Sending binary data is only supported when option "Body Content Type" is set to "RAW/CUSTOM" or "FORM-DATA/MULTIPART"!',
									{ itemIndex },
								);
							}

							if (options.bodyContentType === 'raw') {
								const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);
								this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
								const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
									itemIndex,
									binaryPropertyName,
								);
								requestOptions.body = binaryDataBuffer;
							} else if (options.bodyContentType === 'multipart-form-data') {
								requestOptions.body = {};
								const binaryPropertyNameFull = this.getNodeParameter(
									'binaryPropertyName',
									itemIndex,
								);
								const binaryPropertyNames = binaryPropertyNameFull
									.split(',')
									.map((key) => key.trim());

								for (const propertyData of binaryPropertyNames) {
									let propertyName = 'file';
									let binaryPropertyName = propertyData;
									if (propertyData.includes(':')) {
										const propertyDataParts = propertyData.split(':');
										propertyName = propertyDataParts[0];
										binaryPropertyName = propertyDataParts[1];
									} else if (binaryPropertyNames.length > 1) {
										throw new NodeOperationError(
											this.getNode(),
											'If more than one property should be send it is needed to define the in the format:<code>"sendKey1:binaryProperty1,sendKey2:binaryProperty2"</code>',
											{ itemIndex },
										);
									}

									const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
									const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
										itemIndex,
										binaryPropertyName,
									);

									requestOptions.body[propertyName] = {
										value: binaryDataBuffer,
										options: {
											filename: binaryData.fileName,
											contentType: binaryData.mimeType,
										},
									};
								}
							}
							continue;
						}
					}

					if (tempValue === '') {
						// Parameter is empty so skip it
						continue;
					}

					// @ts-ignore
					requestOptions[optionData.name] = tempValue;

					if (
						// @ts-ignore
						typeof requestOptions[optionData.name] !== 'object' &&
						options.bodyContentType !== 'raw'
					) {
						// If it is not an object && bodyContentType is not 'raw' it must be JSON so parse it
						try {
							// @ts-ignore
							requestOptions[optionData.name] = JSON.parse(
								requestOptions[optionData.name as OptionsWithUriKeys] as string,
							);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`The data in "${optionData.displayName}" is no valid JSON. Set Body Content Type to "RAW/Custom" for XML or other types of payloads`,
								{ itemIndex },
							);
						}
					}
				}
			} else {
				// Parameters are defined in UI
				let optionName: string;
				for (const parameterName of Object.keys(uiParameters)) {
					setUiParameter = this.getNodeParameter(parameterName, itemIndex, {}) as IDataObject;
					optionName = uiParameters[parameterName] as string;
					if (setUiParameter.parameter !== undefined) {
						// @ts-ignore
						requestOptions[optionName] = {};
						for (const parameterData of setUiParameter!.parameter as IDataObject[]) {
							const parameterDataName = parameterData.name as string;
							const newValue = parameterData.value;
							if (optionName === 'qs') {
								const computeNewValue = (oldValue: unknown) => {
									if (typeof oldValue === 'string') {
										return [oldValue, newValue];
									} else if (Array.isArray(oldValue)) {
										return [...oldValue, newValue];
									} else {
										return newValue;
									}
								};
								requestOptions[optionName][parameterDataName] = computeNewValue(
									requestOptions[optionName][parameterDataName],
								);
							} else if (optionName === 'headers') {
								// @ts-ignore
								requestOptions[optionName][parameterDataName.toString().toLowerCase()] = newValue;
							} else {
								// @ts-ignore
								requestOptions[optionName][parameterDataName] = newValue;
							}
						}
					}
				}
			}

			// Change the way data get send in case a different content-type than JSON got selected
			if (['PATCH', 'POST', 'PUT'].includes(requestMethod)) {
				if (options.bodyContentType === 'multipart-form-data') {
					requestOptions.formData = requestOptions.body;
					delete requestOptions.body;
				} else if (options.bodyContentType === 'form-urlencoded') {
					requestOptions.form = requestOptions.body;
					delete requestOptions.body;
				}
			}

			if (responseFormat === 'file') {
				requestOptions.encoding = null;
				requestOptions.useStream = true;

				if (options.bodyContentType !== 'raw') {
					requestOptions.body = JSON.stringify(requestOptions.body);
					if (requestOptions.headers === undefined) {
						requestOptions.headers = {};
					}
					if (['POST', 'PUT', 'PATCH'].includes(requestMethod)) {
						requestOptions.headers['Content-Type'] = 'application/json';
					}
				}
			} else if (options.bodyContentType === 'raw') {
				requestOptions.json = false;
				requestOptions.useStream = true;
			} else {
				requestOptions.json = true;
			}

			// Add Content Type if any are set
			if (options.bodyContentCustomMimeType) {
				if (requestOptions.headers === undefined) {
					requestOptions.headers = {};
				}
				requestOptions.headers['Content-Type'] = options.bodyContentCustomMimeType;
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
				} else if (responseFormat === 'string') {
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
		}

		// @ts-ignore
		const promisesResponses = await Promise.allSettled(requestPromises);

		let response: any;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			// @ts-ignore
			response = promisesResponses.shift();

			if (response!.status !== 'fulfilled') {
				if (!this.continueOnFail()) {
					// throw error;
					throw new NodeApiError(this.getNode(), response as JsonObject, { itemIndex });
				} else {
					removeCircularRefs(response.reason as JsonObject);
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

			const options = this.getNodeParameter('options', itemIndex, {});

			const fullResponse = !!options.fullResponse;

			if (responseFormat === 'file') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);

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
					// @ts-ignore
					Object.assign(newItem.binary, items[itemIndex].binary);
				}

				let binaryData: Buffer | Readable;
				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullResponseProperties) {
						if (property === 'body') {
							continue;
						}
						returnItem[property] = response![property];
					}

					newItem.json = returnItem;
					binaryData = response!.body;
				} else {
					newItem.json = items[itemIndex].json;
					binaryData = response;
				}

				newItem.binary![dataPropertyName] = await this.helpers.prepareBinaryData(binaryData);
				returnItems.push(newItem);
			} else if (responseFormat === 'string') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);

				if (fullResponse) {
					const returnItem: IDataObject = {};
					for (const property of fullResponseProperties) {
						if (property === 'body') {
							returnItem[dataPropertyName] = response![property];
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
							[dataPropertyName]: response,
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
						returnItem[property] = response![property];
					}

					if (responseFormat === 'json' && typeof returnItem.body === 'string') {
						try {
							returnItem.body = JSON.parse(returnItem.body);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								'Response body is not valid JSON. Change "Response Format" to "String"',
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
								'Response body is not valid JSON. Change "Response Format" to "String"',
								{ itemIndex },
							);
						}
					}

					if (options.splitIntoItems === true && Array.isArray(response)) {
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

		return [returnItems];
	}
}
