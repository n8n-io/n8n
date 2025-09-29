import set from 'lodash/set';
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
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	jsonParse,
	removeCircularRefs,
	sleep,
	isDomainAllowed,
} from 'n8n-workflow';
import type { Readable } from 'stream';

import { keysToLowercase } from '@utils/utilities';

import { mainProperties } from './Description';
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
import { setFilename } from './utils/binaryData';
import { mimeTypeFromResponse } from './utils/parse';
import { configureResponseOptimizer } from '../shared/optimizeResponse';

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
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
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
			usableAsTool: {
				replacements: {
					codex: {
						subcategories: {
							Tools: ['Recommended Tools'],
						},
					},
				},
			},
			properties: mainProperties,
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
		let httpBearerAuth;
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
		const errorItems: { [key: string]: string } = {};
		const requestPromises = [];

		let fullResponse = false;

		let autoDetectResponseFormat = false;

		let responseFileName: string | undefined;

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
			try {
				if (authentication === 'genericCredentialType') {
					genericCredentialType = this.getNodeParameter('genericAuthType', 0) as string;

					if (genericCredentialType === 'httpBasicAuth') {
						httpBasicAuth = await this.getCredentials('httpBasicAuth', itemIndex);
					} else if (genericCredentialType === 'httpBearerAuth') {
						httpBearerAuth = await this.getCredentials('httpBearerAuth', itemIndex);
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

				const url = this.getNodeParameter('url', itemIndex) as string;

				if (!url.startsWith('http://') && !url.startsWith('https://')) {
					throw new NodeOperationError(
						this.getNode(),
						`Invalid URL: ${url}. URL must start with "http" or "https".`,
					);
				}

				const checkDomainRestrictions = async (
					credentialData: ICredentialDataDecryptedObject,
					url: string,
					credentialType?: string,
				) => {
					if (credentialData.allowedHttpRequestDomains === 'domains') {
						const allowedDomains = credentialData.allowedDomains as string;

						if (!allowedDomains || allowedDomains.trim() === '') {
							throw new NodeOperationError(
								this.getNode(),
								'No allowed domains specified. Configure allowed domains or change restriction setting.',
							);
						}

						if (!isDomainAllowed(url, { allowedDomains })) {
							const credentialInfo = credentialType ? ` (${credentialType})` : '';
							throw new NodeOperationError(
								this.getNode(),
								`Domain not allowed: This credential${credentialInfo} is restricted from accessing ${url}. ` +
									`Only the following domains are allowed: ${allowedDomains}`,
							);
						}
					} else if (credentialData.allowedHttpRequestDomains === 'none') {
						throw new NodeOperationError(
							this.getNode(),
							'This credential is configured to prevent use within an HTTP Request node',
						);
					}
				};

				if (httpBasicAuth) await checkDomainRestrictions(httpBasicAuth, url);
				if (httpBearerAuth) await checkDomainRestrictions(httpBearerAuth, url);
				if (httpDigestAuth) await checkDomainRestrictions(httpDigestAuth, url);
				if (httpHeaderAuth) await checkDomainRestrictions(httpHeaderAuth, url);
				if (httpQueryAuth) await checkDomainRestrictions(httpQueryAuth, url);
				if (httpCustomAuth) await checkDomainRestrictions(httpCustomAuth, url);
				if (oAuth1Api) await checkDomainRestrictions(oAuth1Api, url);
				if (oAuth2Api) await checkDomainRestrictions(oAuth2Api, url);

				if (nodeCredentialType) {
					try {
						const credentialData = await this.getCredentials(nodeCredentialType, itemIndex);
						await checkDomainRestrictions(credentialData, url, nodeCredentialType);
					} catch (error) {
						if (
							error.message?.includes('Domain not allowed') ||
							error.message?.includes('configured to prevent') ||
							error.message?.includes('No allowed domains specified')
						) {
							throw error;
						}
					}
				}

				const provideSslCertificates = this.getNodeParameter(
					'provideSslCertificates',
					itemIndex,
					false,
				);

				if (provideSslCertificates) {
					sslCertificates = await this.getCredentials('httpSslAuth', itemIndex);
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
					lowercaseHeaders,
				} = this.getNodeParameter('options', itemIndex, {}) as {
					batching: { batch: { batchSize: number; batchInterval: number } };
					proxy: string;
					timeout: number;
					allowUnauthorizedCerts: boolean;
					queryParameterArrays: 'indices' | 'brackets' | 'repeat';
					response: {
						response: {
							neverError: boolean;
							responseFormat: string;
							fullResponse: boolean;
							outputPropertyName: string;
						};
					};
					redirect: { redirect: { maxRedirects: number; followRedirects: boolean } };
					lowercaseHeaders: boolean;
				};

				responseFileName = response?.response?.outputPropertyName;

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
									'JSON parameter needs to be valid JSON',
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
								'JSON parameter needs to be valid JSON',
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
								'JSON parameter needs to be valid JSON',
								{
									itemIndex,
								},
							);
						}

						additionalHeaders = jsonParse(jsonHeadersParameter);
					}
					requestOptions.headers = {
						...requestOptions.headers,
						...(lowercaseHeaders === undefined || lowercaseHeaders
							? keysToLowercase(additionalHeaders)
							: additionalHeaders),
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
				if (httpBearerAuth !== undefined) {
					requestOptions.headers = requestOptions.headers ?? {};
					requestOptions.headers.Authorization = `Bearer ${String(httpBearerAuth.token)}`;
					authDataKeys.headers = ['Authorization'];
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
						if (
							parameters.length === 1 &&
							parameters[0].name === '' &&
							parameters[0].value === ''
						) {
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
						const requestOAuth1 = this.helpers.requestOAuth1.call(
							this,
							'oAuth1Api',
							requestOptions,
						);
						requestOAuth1.catch(() => {});
						requestPromises.push(requestOAuth1);
					} else if (oAuth2Api) {
						const requestOAuth2 = this.helpers.requestOAuth2.call(
							this,
							'oAuth2Api',
							requestOptions,
							{
								tokenType: 'Bearer',
							},
						);
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
			} catch (error) {
				if (!this.continueOnFail()) throw error;

				requestPromises.push(Promise.reject(error).catch(() => {}));

				errorItems[itemIndex] = error.message;

				continue;
			}
		}

		const sanitizedRequests: IDataObject[] = [];
		const promisesResponses = await Promise.allSettled(
			requestPromises.map(
				async (requestPromise, itemIndex) =>
					await requestPromise
						.then((response) => response)
						.finally(async () => {
							if (errorItems[itemIndex]) return;
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
			try {
				responseData = promisesResponses.shift();

				if (errorItems[itemIndex]) {
					returnItems.push({
						json: { error: errorItems[itemIndex] },
						pairedItem: { item: itemIndex },
					});

					continue;
				}

				if (responseData!.status !== 'fulfilled') {
					if (responseData.reason.statusCode === 429) {
						responseData.reason.message =
							"Try spacing your requests out using the batching settings under 'Options'";
					}
					if (!this.continueOnFail()) {
						if (autoDetectResponseFormat && responseData.reason.error instanceof Buffer) {
							responseData.reason.error = Buffer.from(
								responseData.reason.error as Buffer,
							).toString();
						}

						let error;
						if (responseData?.reason instanceof NodeApiError) {
							error = responseData.reason;
							set(error, 'context.itemIndex', itemIndex);
						} else {
							const errorData = (
								responseData.reason ? responseData.reason : responseData
							) as JsonObject;
							error = new NodeApiError(this.getNode(), errorData, { itemIndex });
						}

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

								const data = await this.helpers.binaryToString(response.body as Buffer | Readable);
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
								const data = await this.helpers.binaryToString(response.body as Buffer | Readable);
								response.body = !data ? undefined : data;
							}
						}
					}
					// This is a no-op outside of tool usage
					const optimizeResponse = configureResponseOptimizer(this, itemIndex);

					if (autoDetectResponseFormat && !fullResponse) {
						delete response.headers;
						delete response.statusCode;
						delete response.statusMessage;
					}
					if (!fullResponse) {
						response = optimizeResponse(response.body);
					} else {
						response.body = optimizeResponse(response.body);
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
							mimeTypeFromResponse(responseContentType),
						);

						preparedBinaryData.fileName = setFilename(
							preparedBinaryData,
							requestOptions,
							responseFileName,
						);

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
			} catch (error) {
				if (!this.continueOnFail()) throw error;

				returnItems.push({
					json: { error: error.message },
					pairedItem: { item: itemIndex },
				});

				continue;
			}
		}

		returnItems = returnItems.map(replaceNullValues);

		if (
			returnItems.length === 1 &&
			returnItems[0].json.data &&
			Array.isArray(returnItems[0].json.data)
		) {
			const message =
				'To split the contents of ‘data’ into separate items for easier processing, add a ‘Split Out’ node after this one';

			if (this.addExecutionHints) {
				this.addExecutionHints({
					message,
					location: 'outputPane',
				});
			} else {
				this.logger.info(message);
			}
		}

		return [returnItems];
	}
}
