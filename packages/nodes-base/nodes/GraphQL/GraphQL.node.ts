/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	IRequestOptionsSimplified,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, jsonParse } from 'n8n-workflow';
import { WebSocket } from 'ws';

export class GraphQL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GraphQL',
		name: 'graphql',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:graphql.png',
		group: ['input'],
		version: [1, 1.1, 1.2],
		description:
			'Makes a GraphQL request and returns the received data. Supports both HTTP and WebSocket connections for real-time GraphQL subscriptions.',
		defaults: {
			name: 'GraphQL',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
						connectionMode: ['http'],
					},
				},
			},
			{
				name: 'httpCustomAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['customAuth'],
						connectionMode: ['http'],
					},
				},
			},
			{
				name: 'httpDigestAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['digestAuth'],
						connectionMode: ['http'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
						connectionMode: ['http'],
					},
				},
			},
			{
				name: 'httpQueryAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['queryAuth'],
						connectionMode: ['http'],
					},
				},
			},
			{
				name: 'oAuth1Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth1'],
						connectionMode: ['http'],
					},
				},
			},
			{
				name: 'oAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
						connectionMode: ['http'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Connection Mode',
				name: 'connectionMode',
				type: 'options',
				options: [
					{
						name: 'HTTP',
						value: 'http',
						description: 'Standard HTTP request',
					},
					{
						name: 'WebSocket',
						value: 'websocket',
						description: 'WebSocket connection for real-time subscriptions',
					},
				],
				default: 'http',
				description: 'The connection mode to use',
			},
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
						name: 'Custom Auth',
						value: 'customAuth',
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
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
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
				description: 'The underlying HTTP request method to use',
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
			},
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: '',
				placeholder: 'http://example.com/graphql',
				description: 'The GraphQL endpoint',
				required: true,
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
			},
			{
				displayName: 'WebSocket URL',
				name: 'websocketUrl',
				type: 'string',
				default: '',
				placeholder: 'wss://example.com/graphql',
				description: 'The WebSocket URL for GraphQL subscriptions',
				required: true,
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Ignore SSL Issues (Insecure)',
				name: 'websocketAllowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Whether to connect even if SSL certificate validation is not possible',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Request Format',
				name: 'websocketRequestFormat',
				type: 'options',
				required: true,
				options: [
					{
						name: 'JSON (Recommended)',
						value: 'json',
						description: 'JSON object with query, variables, and operationName properties',
					},
					{
						name: 'GraphQL (Raw)',
						value: 'graphql',
						description: 'Raw GraphQL query string',
					},
				],
				default: 'json',
				description: 'The request format for the subscription payload',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Query',
				name: 'websocketQuery',
				type: 'string',
				default: '',
				description: 'GraphQL subscription query',
				required: true,
				typeOptions: {
					rows: 6,
				},
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Operation Name',
				name: 'websocketOperationName',
				type: 'string',
				default: '',
				description: 'Name of operation to execute (optional for WebSocket)',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Response Format',
				name: 'websocketResponseFormat',
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
				description: 'The format in which the data gets returned from the WebSocket',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Variables',
				name: 'websocketVariables',
				type: 'json',
				default: '',
				description: 'Query variables as JSON object',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'WebSocket Headers',
				name: 'websocketHeaders',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Headers to send with the WebSocket connection',
				default: {},
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
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
			{
				displayName: 'Connection Timeout (seconds)',
				name: 'connectionTimeout',
				type: 'number',
				default: 30,
				description: 'Timeout for WebSocket connection in seconds',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Subscription Timeout (seconds)',
				name: 'subscriptionTimeout',
				type: 'number',
				default: 300,
				description: 'Timeout for subscription messages in seconds',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'WebSocket Subprotocol',
				name: 'websocketSubprotocol',
				type: 'options',
				options: [
					{
						name: 'graphql-transport-ws',
						value: 'graphql-transport-ws',
						description: 'Modern GraphQL over WebSocket protocol',
					},
					{
						name: 'graphql-ws',
						value: 'graphql-ws',
						description: 'Alternative GraphQL WebSocket protocol',
					},
					{
						name: 'graphql',
						value: 'graphql',
						description: 'Legacy GraphQL WebSocket protocol',
					},
				],
				default: 'graphql-transport-ws',
				description: 'The WebSocket subprotocol to use',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
					},
				},
			},
			{
				displayName: 'Ignore SSL Issues (Insecure)',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
				description:
					'Whether to download the response even if SSL certificate validation is not possible',
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
			},
			{
				displayName: 'Request Format',
				name: 'requestFormat',
				type: 'options',
				required: true,
				options: [
					{
						name: 'GraphQL (Raw)',
						value: 'graphql',
					},
					{
						name: 'JSON',
						value: 'json',
					},
				],
				displayOptions: {
					show: {
						requestMethod: ['POST'],
						connectionMode: ['http'],
						'@version': [1],
					},
				},
				default: 'graphql',
				description: 'The format for the query payload',
			},
			{
				displayName: 'Request Format',
				name: 'requestFormat',
				type: 'options',
				required: true,
				options: [
					{
						name: 'JSON (Recommended)',
						value: 'json',
						description:
							'JSON object with query, variables, and operationName properties. The standard and most widely supported format for GraphQL requests.',
					},
					{
						name: 'GraphQL (Raw)',
						value: 'graphql',
						description:
							'Raw GraphQL query string. Not all servers support this format. Use JSON for better compatibility.',
					},
				],
				displayOptions: {
					show: {
						requestMethod: ['POST'],
						connectionMode: ['http'],
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
				default: 'json',
				description: 'The request format for the query payload',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'GraphQL query',
				required: true,
				typeOptions: {
					rows: 6,
				},
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '',
				description: 'Query variables as JSON object',
				displayOptions: {
					show: {
						requestFormat: ['json'],
						requestMethod: ['POST'],
						connectionMode: ['http'],
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
						requestFormat: ['json'],
						requestMethod: ['POST'],
						connectionMode: ['http'],
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
				description: 'The format in which the data gets returned from the URL',
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
			},
			{
				displayName: 'Response Data Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						responseFormat: ['string'],
						connectionMode: ['http'],
					},
				},
				description: 'Name of the property to which to write the response data',
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
				description: 'The headers to send',
				default: {},
				displayOptions: {
					show: {
						connectionMode: ['http'],
					},
				},
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const connectionMode = this.getNodeParameter('connectionMode', 0, 'http') as string;

		if (connectionMode === 'websocket') {
			// WebSocket implementation
			const items = this.getInputData();
			const returnItems: INodeExecutionData[] = [];

			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const websocketUrl = this.getNodeParameter('websocketUrl', itemIndex, '') as string;
					const query = this.getNodeParameter('websocketQuery', itemIndex, '') as string;
					const allowUnauthorizedCerts = this.getNodeParameter(
						'websocketAllowUnauthorizedCerts',
						itemIndex,
						false,
					) as boolean;
					const subprotocol = this.getNodeParameter(
						'websocketSubprotocol',
						itemIndex,
						'graphql-transport-ws',
					) as string;
					const connectionTimeout = this.getNodeParameter(
						'connectionTimeout',
						itemIndex,
						30,
					) as number;
					const subscriptionTimeout = this.getNodeParameter(
						'subscriptionTimeout',
						itemIndex,
						300,
					) as number;

					const variablesParam = this.getNodeParameter(
						'websocketVariables',
						itemIndex,
						{},
					) as IDataObject;

					// Parse variables if they're a string, otherwise use as object
					let variables: IDataObject;
					if (typeof variablesParam === 'string') {
						try {
							variables = JSON.parse(variablesParam as string);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Failed to parse variables JSON: ${error}`,
								{ itemIndex },
							);
						}
					} else {
						variables = variablesParam;
					}
					const operationName = this.getNodeParameter(
						'websocketOperationName',
						itemIndex,
						'',
					) as string;

					const {
						parameter: websocketHeaders,
					}: { parameter?: Array<{ name: string; value: string }> } = this.getNodeParameter(
						'websocketHeaders',
						itemIndex,
						{},
					) as IDataObject;

					const headers = (websocketHeaders || []).reduce(
						(result, item) => ({
							...result,
							[item.name]: item.value,
						}),
						{},
					);

					// Create WebSocket connection
					const ws = new WebSocket(websocketUrl, [subprotocol], {
						headers,
						rejectUnauthorized: !allowUnauthorizedCerts,
					});

					// Set up connection timeout
					const connectionTimeoutId = setTimeout(() => {
						ws.close();
						throw new NodeOperationError(
							this.getNode(),
							`WebSocket connection timeout after ${connectionTimeout} seconds`,
							{ itemIndex },
						);
					}, connectionTimeout * 1000);

					// Set up subscription timeout
					let subscriptionTimeoutId = setTimeout(() => {
						ws.close();
						throw new NodeOperationError(
							this.getNode(),
							`WebSocket subscription timeout after ${subscriptionTimeout} seconds`,
							{ itemIndex },
						);
					}, subscriptionTimeout * 1000);

					// Handle WebSocket events
					const messages: IDataObject[] = [];
					let connectionEstablished = false;

					ws.on('open', () => {
						clearTimeout(connectionTimeoutId);
						connectionEstablished = true;

						// Send connection initialization for graphql-transport-ws
						if (subprotocol === 'graphql-transport-ws') {
							const initMessage = {
								type: 'connection_init',
								payload: {},
							};
							console.log('Sending connection init message:', initMessage);
							ws.send(JSON.stringify(initMessage));
						} else {
							// For other protocols, send subscription directly
							let subscriptionMessage: any;

							if (subprotocol === 'graphql-ws') {
								subscriptionMessage = {
									type: 'start',
									id: '1',
									payload: {
										query,
										variables,
										...(operationName && { operationName }),
									},
								};
							} else {
								// Legacy graphql protocol
								subscriptionMessage = {
									type: 'start',
									id: '1',
									payload: {
										query,
										variables,
										...(operationName && { operationName }),
									},
								};
							}

							console.log('Sending subscription message:', subscriptionMessage);
							ws.send(JSON.stringify(subscriptionMessage));
						}
					});

					ws.on('message', (data: any) => {
						try {
							const message = JSON.parse(data.toString());
							console.log('WebSocket message received:', message);

							// Handle different GraphQL subscription message types
							if (message.type === 'data' || message.type === 'next') {
								// Standard GraphQL subscription data
								const payload = message.payload || message.data;
								if (payload) {
									messages.push(payload);
								} else {
									messages.push(message);
								}
								clearTimeout(subscriptionTimeoutId);

								// Reset subscription timeout for next message
								const newTimeoutId = setTimeout(() => {
									ws.close();
									throw new NodeOperationError(
										this.getNode(),
										`WebSocket subscription timeout after ${subscriptionTimeout} seconds`,
										{ itemIndex },
									);
								}, subscriptionTimeout * 1000);

								subscriptionTimeoutId = newTimeoutId;
							} else if (message.type === 'error' || message.type === 'connection_error') {
								ws.close();
								let errorMessage = 'GraphQL subscription error';
								if (message.payload) {
									if (Array.isArray(message.payload)) {
										errorMessage = message.payload.map((err: any) => err.message).join(', ');
									} else if (typeof message.payload === 'string') {
										errorMessage = message.payload;
									} else {
										errorMessage = JSON.stringify(message.payload);
									}
								}
								throw new NodeApiError(this.getNode(), message.payload || {}, {
									message: errorMessage,
								});
							} else if (message.type === 'complete' || message.type === 'done') {
								ws.close();
							} else if (message.type === 'connection_ack') {
								// Connection acknowledged, now send subscription for graphql-transport-ws
								console.log('WebSocket connection acknowledged');

								if (subprotocol === 'graphql-transport-ws') {
									const subscriptionMessage = {
										type: 'subscribe',
										id: '1',
										payload: {
											query,
											variables,
										},
									};
									console.log(
										'Sending subscription message after connection ack:',
										subscriptionMessage,
									);
									ws.send(JSON.stringify(subscriptionMessage));
								}
							} else if (message.type === 'ping' || message.type === 'ka') {
								// Handle ping/keepalive messages
								console.log('Received ping/keepalive message');
								// Send pong response if needed
								const pongMessage = {
									type: 'pong',
									payload: { message: 'keepalive' },
								};
								ws.send(JSON.stringify(pongMessage));
							} else {
								// Unknown message type, but still collect it
								console.log('Unknown message type:', message.type);
								messages.push(message);
							}
						} catch (error) {
							ws.close();
							throw new NodeOperationError(
								this.getNode(),
								`Failed to parse WebSocket message: ${error}`,
								{ itemIndex },
							);
						}
					});

					ws.on('error', (error: Error) => {
						clearTimeout(connectionTimeoutId);
						clearTimeout(subscriptionTimeoutId);
						ws.close();
						throw new NodeOperationError(this.getNode(), `WebSocket error: ${error}`, {
							itemIndex,
						});
					});

					ws.on('close', () => {
						clearTimeout(connectionTimeoutId);
						clearTimeout(subscriptionTimeoutId);

						if (!connectionEstablished) {
							throw new NodeOperationError(
								this.getNode(),
								'WebSocket connection failed to establish',
								{ itemIndex },
							);
						}
					});

					// Wait for connection and messages
					await new Promise<void>((resolve: () => void, reject: (error: Error) => void) => {
						let messageReceived = false;

						ws.on('open', () => {
							// Connection established, wait for messages
							console.log('WebSocket connection opened');
						});

						ws.on('message', (data: any) => {
							try {
								const message = JSON.parse(data.toString());
								console.log('Message in Promise handler:', message);

								// If we receive actual data (not just ping), mark as received
								if (message.type === 'data' || message.type === 'next') {
									messageReceived = true;
									console.log('Data message received, resolving...');
									resolve();
								}
							} catch (error) {
								console.log('Error parsing message in Promise:', error);
							}
						});

						ws.on('close', () => {
							console.log('WebSocket connection closed');
							if (!messageReceived) {
								resolve(); // Resolve even if no data received
							}
						});

						ws.on('error', (error: Error) => {
							console.log('WebSocket error in Promise:', error);
							reject(error);
						});

						// Set a timeout to resolve if no data received
						setTimeout(() => {
							console.log('Timeout reached, resolving...');
							resolve();
						}, subscriptionTimeout * 1000);
					});

					// Return collected messages
					if (messages.length > 0) {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(messages),
							{ itemData: { item: itemIndex } },
						);
						returnItems.push(...executionData);
					} else {
						// Return empty result if no messages received
						returnItems.push({
							json: {},
						});
					}
				} catch (error) {
					if (!this.continueOnFail()) {
						throw error;
					}

					const errorData = this.helpers.returnJsonArray({
						error: error.message,
					});
					const executionErrorWithMetaData = this.helpers.constructExecutionMetaData(errorData, {
						itemData: { item: itemIndex },
					});
					returnItems.push(...executionErrorWithMetaData);
				}
			}

			return [returnItems];
		} else {
			// HTTP implementation
			const items = this.getInputData();
			let httpBasicAuth;
			let httpDigestAuth;
			let httpCustomAuth;
			let httpHeaderAuth;
			let httpQueryAuth;
			let oAuth1Api;
			let oAuth2Api;

			try {
				httpBasicAuth = await this.getCredentials('httpBasicAuth');
			} catch (error) {
				// Do nothing
			}
			try {
				httpCustomAuth = await this.getCredentials('httpCustomAuth');
			} catch (error) {
				// Do nothing
			}
			try {
				httpDigestAuth = await this.getCredentials('httpDigestAuth');
			} catch (error) {
				// Do nothing
			}
			try {
				httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
			} catch (error) {
				// Do nothing
			}
			try {
				httpQueryAuth = await this.getCredentials('httpQueryAuth');
			} catch (error) {
				// Do nothing
			}
			try {
				oAuth1Api = await this.getCredentials('oAuth1Api');
			} catch (error) {
				// Do nothing
			}
			try {
				oAuth2Api = await this.getCredentials('oAuth2Api');
			} catch (error) {
				// Do nothing
			}

			let requestOptions: IRequestOptions;

			const returnItems: INodeExecutionData[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const requestMethod = this.getNodeParameter(
						'requestMethod',
						itemIndex,
						'POST',
					) as IHttpRequestMethods;
					const endpoint = this.getNodeParameter('endpoint', itemIndex, '') as string;
					const requestFormat = this.getNodeParameter('requestFormat', itemIndex, 'json') as string;
					const responseFormat = this.getNodeParameter('responseFormat', 0) as string;
					const { parameter }: { parameter?: Array<{ name: string; value: string }> } =
						this.getNodeParameter('headerParametersUi', itemIndex, {}) as IDataObject;
					const headerParameters = (parameter || []).reduce(
						(result, item) => ({
							...result,
							[item.name]: item.value,
						}),
						{},
					);

					requestOptions = {
						headers: {
							'content-type': `application/${requestFormat}`,
							...headerParameters,
						},
						method: requestMethod,
						uri: endpoint,
						simple: false,
						rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false),
					};

					// Add credentials if any are set
					if (httpBasicAuth !== undefined) {
						requestOptions.auth = {
							user: httpBasicAuth.user as string,
							pass: httpBasicAuth.password as string,
						};
					}
					if (httpCustomAuth !== undefined) {
						const customAuth = jsonParse<IRequestOptionsSimplified>(
							(httpCustomAuth.json as string) || '{}',
							{ errorMessage: 'Invalid Custom Auth JSON' },
						);
						if (customAuth.headers) {
							requestOptions.headers = { ...requestOptions.headers, ...customAuth.headers };
						}
						if (customAuth.body) {
							requestOptions.body = { ...requestOptions.body, ...customAuth.body };
						}
						if (customAuth.qs) {
							requestOptions.qs = { ...requestOptions.qs, ...customAuth.qs };
						}
					}
					if (httpHeaderAuth !== undefined) {
						requestOptions.headers![httpHeaderAuth.name as string] = httpHeaderAuth.value;
					}
					if (httpQueryAuth !== undefined) {
						if (!requestOptions.qs) {
							requestOptions.qs = {};
						}
						requestOptions.qs[httpQueryAuth.name as string] = httpQueryAuth.value;
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
						requestOptions.qs = requestOptions.qs ?? {};
						requestOptions.qs.query = gqlQuery;
					}

					if (requestFormat === 'json') {
						const variables = this.getNodeParameter('variables', itemIndex, {});

						let parsedVariables;
						if (typeof variables === 'string') {
							try {
								parsedVariables = JSON.parse(variables || '{}');
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									`Using variables failed:\n${variables}\n\nWith error message:\n${error}`,
									{ itemIndex },
								);
							}
						} else if (typeof variables === 'object' && variables !== null) {
							parsedVariables = variables;
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`Using variables failed:\n${variables}\n\nGraphQL variables should be either an object or a string.`,
								{ itemIndex },
							);
						}

						const jsonBody = {
							...requestOptions.body,
							query: gqlQuery,
							variables: parsedVariables,
							operationName: this.getNodeParameter('operationName', itemIndex, '') as string,
						};

						if (jsonBody.operationName === '') {
							jsonBody.operationName = null;
						}

						requestOptions.json = true;
						requestOptions.body = jsonBody;
					} else {
						requestOptions.body = gqlQuery;
					}

					let response;
					// Now that the options are all set make the actual http request
					if (oAuth1Api !== undefined) {
						response = await this.helpers.requestOAuth1.call(this, 'oAuth1Api', requestOptions);
					} else if (oAuth2Api !== undefined) {
						response = await this.helpers.requestOAuth2.call(this, 'oAuth2Api', requestOptions, {
							tokenType: 'Bearer',
						});
					} else {
						response = await this.helpers.request(requestOptions);
					}
					if (responseFormat === 'string') {
						const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);
						returnItems.push({
							json: {
								[dataPropertyName]: response,
							},
						});
					} else {
						if (typeof response === 'string') {
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

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response as IDataObject),
							{ itemData: { item: itemIndex } },
						);
						returnItems.push(...executionData);
					}

					// parse error string messages
					if (typeof response === 'string' && response.startsWith('{"errors":')) {
						try {
							const errorResponse = JSON.parse(response) as IDataObject;
							if (Array.isArray(errorResponse.errors)) {
								response = errorResponse;
							}
						} catch (e) {}
					}
					// throw from response object.errors[]
					if (typeof response === 'object' && response.errors) {
						const message =
							response.errors?.map((error: IDataObject) => error.message).join(', ') ||
							'Unexpected error';
						throw new NodeApiError(this.getNode(), response.errors as JsonObject, { message });
					}
				} catch (error) {
					if (!this.continueOnFail()) {
						throw error;
					}

					const errorData = this.helpers.returnJsonArray({
						error: error.message,
					});
					const executionErrorWithMetaData = this.helpers.constructExecutionMetaData(errorData, {
						itemData: { item: itemIndex },
					});
					returnItems.push(...executionErrorWithMetaData);
				}
			}
			return [returnItems];
		}
	}
}
