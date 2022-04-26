import path from 'path';
import { OptionsWithUri } from 'request';

import { IExecuteFunctions } from 'n8n-core';
import {
	IBinaryData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { versionDescription } from './VersionDescription';

interface OptionData {
	name: string;
	displayName: string;
}

interface OptionDataParamters {
	[key: string]: OptionData;
}

export class HttpRequestV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			getNodeCredentialTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const nodesBaseRoot = path.resolve(__dirname, '..', '..', '..', '..');
				const packageJson = require(path.resolve(nodesBaseRoot, 'package.json'));
				const credPaths: string[] = packageJson.n8n.credentials;

				const credOptions = credPaths.reduce<INodePropertyOptions[]>((acc, credPath) => {
					const match = credPath.match(/(^dist\/credentials\/(?<credType>.*)\.credentials\.js$)/);

					if (!match?.groups) return acc;

					const { credType } = match.groups;

					if (!isSupportedByHttpRequestNode(credType)) return acc;

					const credClass = require(path.resolve(nodesBaseRoot, credPath))[credType];
					const credTypeValue = credType[0].toLocaleLowerCase() + credType.substring(1);

					return [
						...acc,
						{
							name: new credClass().displayName,
							value: credTypeValue,
					 	},
					];
				}, []);

				return Promise.resolve(credOptions);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const fullReponseProperties = [
			'body',
			'headers',
			'statusCode',
			'statusMessage',
		];

		// TODO: Should have a setting which makes clear that this parameter cannot change for each item
		const requestMethod = this.getNodeParameter('requestMethod', 0) as string;
		const parametersAreJson = this.getNodeParameter('jsonParameters', 0) as boolean;
		const responseFormat = this.getNodeParameter('responseFormat', 0) as string;

		const authenticateWith = this.getNodeParameter('authenticateWith', 0) as 'nodeCredential' | 'genericAuth' | 'none';

		let httpBasicAuth;
		let httpDigestAuth;
		let httpHeaderAuth;
		let httpQueryAuth;
		let oAuth1Api;
		let oAuth2Api;
		let nodeCredentialType;

		if (authenticateWith === 'genericAuth') {
			try {
				httpBasicAuth = await this.getCredentials('httpBasicAuth');
			} catch (_) {}
			try {
				httpDigestAuth = await this.getCredentials('httpDigestAuth');
			} catch (_) {}
			try {
				httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
			} catch (_) {}
			try {
				httpQueryAuth = await this.getCredentials('httpQueryAuth');
			} catch (_) {}
			try {
				oAuth1Api = await this.getCredentials('oAuth1Api');
			} catch (_) {}
			try {
				oAuth2Api = await this.getCredentials('oAuth2Api');
			} catch (_) {}
		} else if (authenticateWith === 'nodeCredential') {
			try {
				nodeCredentialType = this.getNodeParameter('nodeCredentialType', 0) as string;
			} catch (_) {}
		}

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
		const requestPromises = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
			const url = this.getNodeParameter('url', itemIndex) as string;

			if (itemIndex > 0 && options.batchSize as number >= 0 && options.batchInterval as number > 0) {
				// defaults batch size to 1 of it's set to 0
				const batchSize: number = options.batchSize as number > 0 ? options.batchSize as number : 1;
				if (itemIndex % batchSize === 0) {
					await new Promise(resolve => setTimeout(resolve, options.batchInterval as number));
				}
			}

			const fullResponse = !!options.fullResponse as boolean;

			requestOptions = {
				headers: {},
				method: requestMethod,
				uri: url,
				gzip: true,
				rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
			};

			if (fullResponse === true) {
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

			if (parametersAreJson === true) {
				// Parameters are defined as JSON
				let optionData: OptionData;
				for (const parameterName of Object.keys(jsonParameters)) {
					optionData = jsonParameters[parameterName] as OptionData;
					const tempValue = this.getNodeParameter(parameterName, itemIndex, '') as string | object;
					const sendBinaryData = this.getNodeParameter('sendBinaryData', itemIndex, false) as boolean;

					if (optionData.name === 'body' && parametersAreJson === true) {
						if (sendBinaryData === true) {

							const contentTypesAllowed = [
								'raw',
								'multipart-form-data',
							];

							if (!contentTypesAllowed.includes(options.bodyContentType as string)) {
								// As n8n-workflow.NodeHelpers.getParamterResolveOrder can not be changed
								// easily to handle parameters in dot.notation simply error for now.
								throw new NodeOperationError(this.getNode(), 'Sending binary data is only supported when option "Body Content Type" is set to "RAW/CUSTOM" or "FORM-DATA/MULTIPART"!');
							}

							const item = items[itemIndex];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
							}

							if (options.bodyContentType === 'raw') {
								const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
								if (item.binary[binaryPropertyName] === undefined) {
									throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" does not exists on item!`);
								}

								const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
								requestOptions.body = binaryDataBuffer;
							} else if (options.bodyContentType === 'multipart-form-data') {
								requestOptions.body = {};
								const binaryPropertyNameFull = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
								const binaryPropertyNames = binaryPropertyNameFull.split(',').map(key => key.trim());

								for (const propertyData of binaryPropertyNames) {
									let propertyName = 'file';
									let binaryPropertyName = propertyData;
									if (propertyData.includes(':')) {
										const propertyDataParts = propertyData.split(':');
										propertyName = propertyDataParts[0];
										binaryPropertyName = propertyDataParts[1];
									} else if (binaryPropertyNames.length > 1) {
										throw new NodeOperationError(this.getNode(), 'If more than one property should be send it is needed to define the in the format:<code>"sendKey1:binaryProperty1,sendKey2:binaryProperty2"</code>');
									}

									if (item.binary[binaryPropertyName] === undefined) {
										throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" does not exists on item!`);
									}

									const binaryProperty = item.binary[binaryPropertyName] as IBinaryData;
									const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

									requestOptions.body[propertyName] = {
										value: binaryDataBuffer,
										options: {
											filename: binaryProperty.fileName,
											contentType: binaryProperty.mimeType,
										},
									};
								}
							}
							continue;
						}
					}

					if (tempValue === '') {
						// Paramter is empty so skip it
						continue;
					}

					// @ts-ignore
					requestOptions[optionData.name] = tempValue;

					// @ts-ignore
					if (typeof requestOptions[optionData.name] !== 'object' && options.bodyContentType !== 'raw') {
						// If it is not an object && bodyContentType is not 'raw' it must be JSON so parse it
						try {
							// @ts-ignore
							requestOptions[optionData.name] = JSON.parse(requestOptions[optionData.name]);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `The data in "${optionData.displayName}" is no valid JSON. Set Body Content Type to "RAW/Custom" for XML or other types of payloads`);
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
							const parameterDataName = parameterData!.name as string;
							const newValue = parameterData!.value;
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
								requestOptions[optionName][parameterDataName] = computeNewValue(requestOptions[optionName][parameterDataName]);
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

			if (requestOptions.headers!['accept'] === undefined) {
				if (responseFormat === 'json') {
					requestOptions.headers!['accept'] = 'application/json,text/*;q=0.99';
				} else if (responseFormat === 'string') {
					requestOptions.headers!['accept'] = 'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, */*;q=0.1';
				} else {
					requestOptions.headers!['accept'] = 'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, image/*;q=0.8, */*;q=0.7';
				}
			}

			try {
				let sendRequest: any = requestOptions; // tslint:disable-line:no-any
				// Protect browser from sending large binary data
				if (Buffer.isBuffer(sendRequest.body) && sendRequest.body.length > 250000) {
					sendRequest = {
						...requestOptions,
						body: `Binary data got replaced with this text. Original was a Buffer with a size of ${requestOptions.body.length} byte.`,
					};
				}
				this.sendMessageToUI(sendRequest);
			} catch (e) { }

			if (authenticateWith === 'genericAuth' || authenticateWith === 'none') {
				if (oAuth1Api) {
					requestPromises.push(
						this.helpers.requestOAuth1.call(this, 'oAuth1Api', requestOptions),
					);
				} else if (oAuth2Api) {
					requestPromises.push(
						this.helpers.requestOAuth2.call(this, 'oAuth2Api', requestOptions, { tokenType: 'Bearer' }),
					);
				} else {
					requestPromises.push(
						this.helpers.request(requestOptions),
					);
				}
			} else if (authenticateWith === 'nodeCredential') {
				// @TODO Make call using OAuth2 cred from `nodeCredentialType`

				// @TODO Make call using OAuth1 cred from `nodeCredentialType`

				// @TODO Make call using plain-auth cred from `nodeCredentialType`
			}

		}


		// @ts-ignore
		const promisesResponses = await Promise.allSettled(requestPromises);

		let response: any; // tslint:disable-line:no-any
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			// @ts-ignore
			response = promisesResponses.shift();

			if (response!.status !== 'fulfilled') {
				if (this.continueOnFail() !== true) {
					// throw error;
					throw new NodeApiError(this.getNode(), response);
				} else {
					// Return the actual reason as error
					returnItems.push(
						{
							json: {
								error: response.reason,
							},
						},
					);
					continue;
				}
			}

			response = response.value;

			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
			const url = this.getNodeParameter('url', itemIndex) as string;

			const fullResponse = !!options.fullResponse as boolean;

			if (responseFormat === 'file') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0) as string;

				const newItem: INodeExecutionData = {
					json: {},
					binary: {},
				};

				if (items[itemIndex].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[itemIndex].binary);
				}


				const fileName = (url).split('/').pop();

				if (fullResponse === true) {
					const returnItem: IDataObject = {};
					for (const property of fullReponseProperties) {
						if (property === 'body') {
							continue;
						}
						returnItem[property] = response![property];
					}

					newItem.json = returnItem;

					newItem.binary![dataPropertyName] = await this.helpers.prepareBinaryData(response!.body, fileName);
				} else {
					newItem.json = items[itemIndex].json;

					newItem.binary![dataPropertyName] = await this.helpers.prepareBinaryData(response!, fileName);
				}

				returnItems.push(newItem);
			} else if (responseFormat === 'string') {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', 0) as string;

				if (fullResponse === true) {
					const returnItem: IDataObject = {};
					for (const property of fullReponseProperties) {
						if (property === 'body') {
							returnItem[dataPropertyName] = response![property];
							continue;
						}

						returnItem[property] = response![property];
					}
					returnItems.push({ json: returnItem });
				} else {
					returnItems.push({
						json: {
							[dataPropertyName]: response,
						},
					});
				}
			} else {
				// responseFormat: 'json'
				if (fullResponse === true) {
					const returnItem: IDataObject = {};
					for (const property of fullReponseProperties) {
						returnItem[property] = response![property];
					}

					if (responseFormat === 'json' && typeof returnItem.body === 'string') {
						try {
							returnItem.body = JSON.parse(returnItem.body);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Response body is not valid JSON. Change "Response Format" to "String"');
						}
					}

					returnItems.push({ json: returnItem });
				} else {
					if (responseFormat === 'json' && typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Response body is not valid JSON. Change "Response Format" to "String"');
						}
					}

					if (options.splitIntoItems === true && Array.isArray(response)) {
						response.forEach(item => returnItems.push({ json: item }));
					} else {
						returnItems.push({ json: response });
					}
				}
			}
		}

		return this.prepareOutputData(returnItems);
	}
}

/**
 * Whether a credential type may be used to make a request with
 * this version of the HTTP Request Node.
 */
function isSupportedByHttpRequestNode(credType: string) {
	if (credType.slice(0, -4).endsWith('OAuth')) return true;

	// @TODO Final list TBD
	const SUPPORTED_PLAIN_AUTH_CRED_TYPES: Readonly<string[]> = [
		'ActionNetworkApi',
		'AsanaApi',
		'DiscourseApi',
		'Magento2Api',
		'MattermostApi',
		'PipedriveApi',
		'ZendeskApi',
	];

	return SUPPORTED_PLAIN_AUTH_CRED_TYPES.includes(credType);
}
