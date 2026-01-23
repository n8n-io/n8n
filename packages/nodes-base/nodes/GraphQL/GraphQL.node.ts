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

// Constants
const MAX_CONNECTION_TIMEOUT = 300; // 5 minutes
const MAX_SUBSCRIPTION_TIMEOUT = 3600; // 1 hour

// WebSocket message types
interface GraphQLWebSocketMessage {
	type: string;
	id?: string;
	payload?: any;
	data?: any;
}

// Protocol handler types
type ProtocolHandler = (
	ws: WebSocket,
	query: string,
	variables: IDataObject,
	operationName?: string,
) => void;

// Helper functions for protocol handling
function createGraphQLTransportWSHandler(
	ws: WebSocket,
	_query: string,
	_variables: IDataObject,
	_operationName?: string,
): void {
	const initMessage: GraphQLWebSocketMessage = {
		type: 'connection_init',
		payload: {},
	};
	ws.send(JSON.stringify(initMessage));
}

function createGraphQLWSHandler(
	ws: WebSocket,
	query: string,
	variables: IDataObject,
	operationName?: string,
): void {
	const subscriptionMessage: GraphQLWebSocketMessage = {
		type: 'start',
		id: '1',
		payload: {
			query,
			variables,
			...(operationName && { operationName }),
		},
	};
	ws.send(JSON.stringify(subscriptionMessage));
}

function createLegacyGraphQLHandler(
	ws: WebSocket,
	query: string,
	variables: IDataObject,
	operationName?: string,
): void {
	const subscriptionMessage: GraphQLWebSocketMessage = {
		type: 'start',
		id: '1',
		payload: {
			query,
			variables,
			...(operationName && { operationName }),
		},
	};
	ws.send(JSON.stringify(subscriptionMessage));
}

function getProtocolHandler(subprotocol: string): ProtocolHandler {
	switch (subprotocol) {
		case 'graphql-transport-ws':
			return createGraphQLTransportWSHandler;
		case 'graphql-ws':
			return createGraphQLWSHandler;
		case 'graphql':
			return createLegacyGraphQLHandler;
		default:
			return createGraphQLTransportWSHandler;
	}
}

function validateURL(node: any, url: string, connectionMode: string, itemIndex?: number): void {
	if (!url || typeof url !== 'string') {
		throw new NodeOperationError(
			node,
			`Invalid URL: URL must be a non-empty string. Received: ${url}`,
			itemIndex !== undefined ? { itemIndex } : undefined,
		);
	}

	if (connectionMode === 'websocket') {
		if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
			throw new NodeOperationError(
				node,
				`Invalid WebSocket URL: URL must start with 'ws://' or 'wss://'. Received: ${url}`,
				itemIndex !== undefined ? { itemIndex } : undefined,
			);
		}
	} else if (connectionMode === 'http') {
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			throw new NodeOperationError(
				node,
				`Invalid HTTP URL: URL must start with 'http://' or 'https://'. Received: ${url}`,
				itemIndex !== undefined ? { itemIndex } : undefined,
			);
		}
	}
}

function validateTimeouts(
	node: any,
	connectionTimeout: number,
	subscriptionTimeout: number,
	itemIndex?: number,
): void {
	if (connectionTimeout < 1 || connectionTimeout > MAX_CONNECTION_TIMEOUT) {
		throw new NodeOperationError(
			node,
			`Connection timeout must be between 1 and ${MAX_CONNECTION_TIMEOUT} seconds. Received: ${connectionTimeout}`,
			itemIndex !== undefined ? { itemIndex } : undefined,
		);
	}

	if (subscriptionTimeout < 1 || subscriptionTimeout > MAX_SUBSCRIPTION_TIMEOUT) {
		throw new NodeOperationError(
			node,
			`Subscription timeout must be between 1 and ${MAX_SUBSCRIPTION_TIMEOUT} seconds. Received: ${subscriptionTimeout}`,
			itemIndex !== undefined ? { itemIndex } : undefined,
		);
	}
}

function parseWebSocketMessage(data: string | ArrayBuffer | Buffer): GraphQLWebSocketMessage {
	try {
		let dataString: string;
		if (typeof data === 'string') {
			dataString = data;
		} else if (data instanceof ArrayBuffer) {
			dataString = Buffer.from(data).toString();
		} else {
			dataString = data.toString();
		}
		const message = JSON.parse(dataString) as GraphQLWebSocketMessage;
		return message;
	} catch (error) {
		throw new NodeOperationError(
			null as any,
			`Failed to parse WebSocket message: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

async function executeWebSocket(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const urlParam = this.getNodeParameter('url', itemIndex, '');
	if (typeof urlParam !== 'string') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid URL parameter: expected string, got ${typeof urlParam}`,
			{ itemIndex },
		);
	}
	const url: string = urlParam;

	const queryParam = this.getNodeParameter('query', itemIndex, '');
	if (typeof queryParam !== 'string') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid query parameter: expected string, got ${typeof queryParam}`,
			{ itemIndex },
		);
	}
	const query: string = queryParam;

	const allowUnauthorizedCertsParam = this.getNodeParameter(
		'allowUnauthorizedCerts',
		itemIndex,
		false,
	);
	if (typeof allowUnauthorizedCertsParam !== 'boolean') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid allowUnauthorizedCerts parameter: expected boolean, got ${typeof allowUnauthorizedCertsParam}`,
			{ itemIndex },
		);
	}
	const allowUnauthorizedCerts: boolean = allowUnauthorizedCertsParam;

	const subprotocolParam = this.getNodeParameter(
		'websocketSubprotocol',
		itemIndex,
		'graphql-transport-ws',
	);
	if (typeof subprotocolParam !== 'string') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid websocketSubprotocol parameter: expected string, got ${typeof subprotocolParam}`,
			{ itemIndex },
		);
	}
	const subprotocol: string = subprotocolParam;

	const connectionTimeoutParam = this.getNodeParameter('connectionTimeout', itemIndex, 30);
	if (typeof connectionTimeoutParam !== 'number') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid connectionTimeout parameter: expected number, got ${typeof connectionTimeoutParam}`,
			{ itemIndex },
		);
	}
	const connectionTimeout: number = connectionTimeoutParam;

	const subscriptionTimeoutParam = this.getNodeParameter('subscriptionTimeout', itemIndex, 300);
	if (typeof subscriptionTimeoutParam !== 'number') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid subscriptionTimeout parameter: expected number, got ${typeof subscriptionTimeoutParam}`,
			{ itemIndex },
		);
	}
	const subscriptionTimeout: number = subscriptionTimeoutParam;

	// Validate URL
	validateURL(this.getNode(), url, 'websocket', itemIndex);

	// Validate and enforce timeout limits
	validateTimeouts(this.getNode(), connectionTimeout, subscriptionTimeout, itemIndex);

	const variablesParam = this.getNodeParameter('variables', itemIndex, {});

	// Parse variables if they're a string, otherwise use as object
	let variables: IDataObject;
	if (typeof variablesParam === 'string') {
		try {
			variables = JSON.parse(variablesParam);
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to parse variables JSON: ${error instanceof Error ? error.message : String(error)}`,
				{ itemIndex },
			);
		}
	} else if (variablesParam && typeof variablesParam === 'object' && variablesParam !== null) {
		variables = variablesParam as IDataObject;
	} else {
		throw new NodeOperationError(
			this.getNode(),
			`Using variables failed:\n${variablesParam}\n\nGraphQL variables should be either an object or a string.`,
			{ itemIndex },
		);
	}

	const operationNameParam = this.getNodeParameter('operationName', itemIndex, '');
	if (typeof operationNameParam !== 'string') {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid operationName parameter: expected string, got ${typeof operationNameParam}`,
			{ itemIndex },
		);
	}
	const operationName: string = operationNameParam;

	const { parameter: headerParameters }: { parameter?: Array<{ name: string; value: string }> } =
		this.getNodeParameter('headerParametersUi', itemIndex, {}) as IDataObject;

	const headers = (headerParameters || []).reduce(
		(result: any, item: any) => ({
			...result,
			[item.name]: item.value,
		}),
		{},
	);

	// Resource tracking for cleanup
	let ws: WebSocket | null = null;
	let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let subscriptionTimeoutId: ReturnType<typeof setTimeout> | null = null;
	const messages: IDataObject[] = [];

	try {
		// Create WebSocket connection
		ws = new WebSocket(url, [subprotocol], {
			headers,
			rejectUnauthorized: !allowUnauthorizedCerts,
		});

		// Ensure WebSocket was created
		if (!ws) {
			throw new NodeOperationError(this.getNode(), 'Failed to create WebSocket connection', {
				itemIndex,
			});
		}

		// Get protocol handler
		const protocolHandler = getProtocolHandler(subprotocol);

		// Promise-based execution with proper error handling
		const result = await new Promise<IDataObject[]>(
			(resolve: (value: IDataObject[]) => void, reject: (error: Error) => void) => {
				let connectionEstablished = false;
				let isResolved = false;

				// Helper to safely resolve/reject
				const safeResolve = (value: IDataObject[]) => {
					if (!isResolved) {
						isResolved = true;
						resolve(value);
					}
				};

				const safeReject = (error: Error) => {
					if (!isResolved) {
						isResolved = true;
						reject(error);
					}
				};

				// Connection timeout
				connectionTimeoutId = setTimeout(() => {
					if (ws && ws.readyState !== WebSocket.CLOSED) {
						ws.close();
					}
					safeReject(
						new NodeOperationError(
							this.getNode(),
							`WebSocket connection timeout after ${connectionTimeout} seconds`,
							{ itemIndex },
						),
					);
				}, connectionTimeout * 1000);

				// Subscription timeout
				const resetSubscriptionTimeout = () => {
					if (subscriptionTimeoutId) {
						clearTimeout(subscriptionTimeoutId);
					}
					subscriptionTimeoutId = setTimeout(() => {
						if (ws && ws.readyState !== WebSocket.CLOSED) {
							ws.close();
						}
						safeReject(
							new NodeOperationError(
								this.getNode(),
								`WebSocket subscription timeout after ${subscriptionTimeout} seconds`,
								{ itemIndex },
							),
						);
					}, subscriptionTimeout * 1000);
				};

				// Initial subscription timeout
				resetSubscriptionTimeout();

				// Handle connection open - ws is guaranteed to be non-null here
				ws!.on('open', () => {
					if (connectionTimeoutId) {
						clearTimeout(connectionTimeoutId);
						connectionTimeoutId = null;
					}
					connectionEstablished = true;

					// Send connection initialization for graphql-transport-ws
					if (subprotocol === 'graphql-transport-ws') {
						const initMessage: GraphQLWebSocketMessage = {
							type: 'connection_init',
							payload: {},
						};
						ws!.send(JSON.stringify(initMessage));
					} else {
						// For other protocols, send subscription directly
						protocolHandler(ws!, query, variables, operationName || undefined);
					}
				});

				// Handle incoming messages - ws is guaranteed to be non-null here
				ws!.on('message', (data: string | ArrayBuffer | Buffer) => {
					try {
						const message = parseWebSocketMessage(data);

						// Handle different GraphQL subscription message types
						if (message.type === 'data' || message.type === 'next') {
							// Standard GraphQL subscription data
							const payload = message.payload || message.data;
							if (payload) {
								messages.push(payload);
							} else {
								messages.push(message as unknown as IDataObject);
							}

							// Reset subscription timeout for next message
							resetSubscriptionTimeout();
						} else if (message.type === 'error' || message.type === 'connection_error') {
							let errorMessage = 'GraphQL subscription error';
							if (message.payload) {
								if (Array.isArray(message.payload)) {
									errorMessage = message.payload
										.map((err: any) => err.message || String(err))
										.join(', ');
								} else if (typeof message.payload === 'string') {
									errorMessage = message.payload;
								} else if (message.payload.message) {
									errorMessage = message.payload.message;
								} else {
									errorMessage = JSON.stringify(message.payload);
								}
							}
							safeReject(
								new NodeApiError(this.getNode(), message.payload || {}, {
									message: errorMessage,
								}),
							);
						} else if (message.type === 'complete' || message.type === 'done') {
							// Subscription completed, resolve with collected messages
							safeResolve(messages);
						} else if (message.type === 'connection_ack') {
							if (subprotocol === 'graphql-transport-ws') {
								const subscriptionMessage: GraphQLWebSocketMessage = {
									type: 'subscribe',
									id: '1',
									payload: {
										query,
										variables,
									},
								};
								ws!.send(JSON.stringify(subscriptionMessage));
							}
						} else if (message.type === 'ping' || message.type === 'ka') {
							// Handle ping/keepalive messages
							const pongMessage: GraphQLWebSocketMessage = {
								type: 'pong',
								payload: { message: 'keepalive' },
							};
							ws!.send(JSON.stringify(pongMessage));
						} else {
							// Unknown message type, but still collect it
							messages.push(message as unknown as IDataObject);
						}
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						// If it's already a NodeOperationError, rethrow it
						if (error instanceof NodeOperationError) {
							safeReject(error);
						} else {
							safeReject(
								new NodeOperationError(
									this.getNode(),
									`Failed to process WebSocket message: ${errorMessage}`,
									{ itemIndex },
								),
							);
						}
					}
				});

				// Handle errors - ws is guaranteed to be non-null here
				ws!.on('error', (error: Error) => {
					safeReject(
						new NodeOperationError(this.getNode(), `WebSocket error: ${error.message}`, {
							itemIndex,
						}),
					);
				});

				// Handle connection close - ws is guaranteed to be non-null here
				ws!.on('close', () => {
					if (!connectionEstablished) {
						safeReject(
							new NodeOperationError(this.getNode(), 'WebSocket connection failed to establish', {
								itemIndex,
							}),
						);
					} else if (!isResolved) {
						// Connection closed but we haven't resolved yet - resolve with collected messages
						safeResolve(messages);
					}
				});

				// Final timeout to ensure we always resolve
				setTimeout(() => {
					if (!isResolved) {
						safeResolve(messages);
					}
				}, subscriptionTimeout * 1000);
			},
		);

		// Return collected messages
		if (result.length > 0) {
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(result),
				{ itemData: { item: itemIndex } },
			);
			return executionData[0];
		} else {
			// Return empty result if no messages received
			return {
				json: {},
			};
		}
	} finally {
		// Guaranteed cleanup
		if (connectionTimeoutId) {
			clearTimeout(connectionTimeoutId);
		}
		if (subscriptionTimeoutId) {
			clearTimeout(subscriptionTimeoutId);
		}
		if (ws) {
			// Remove all event listeners to prevent memory leaks
			ws.removeAllListeners();
			if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
				ws.close();
			}
		}
	}
}

export class GraphQL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GraphQL',
		name: 'graphql',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:graphql.png',
		group: ['input'],
		version: [1, 1.1, 1.2],
		description:
			'Makes a GraphQL request and returns the received data. Supports both HTTP and WebSocket connections for real-time GraphQL subscriptions. For WebSocket usage examples, see the n8n documentation.',
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
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/graphql or wss://example.com/graphql',
				description: 'The GraphQL endpoint URL (use wss:// for WebSocket, https:// for HTTP)',
				required: true,
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
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '',
				description: 'Query variables as JSON object (for HTTP POST with JSON format)',
				displayOptions: {
					show: {
						connectionMode: ['http'],
						requestMethod: ['POST'],
						requestFormat: ['json'],
					},
				},
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '',
				description: 'Query variables as JSON object (for WebSocket subscriptions)',
				displayOptions: {
					show: {
						connectionMode: ['websocket'],
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
				description: 'The format in which the data gets returned',
			},
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
				displayName: 'Ignore Ssl Issues (Insecure)',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues
				description: 'Whether to connect even if SSL certificate validation is not possible',
			},
			{
				displayName: 'Connection Timeout (Seconds)',
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
				displayName: 'Subscription Timeout (Seconds)',
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
				displayName: 'Websocket Subprotocol',
				name: 'websocketSubprotocol',
				type: 'options',
				options: [
					{
						name: 'GraphQL Transport WS',
						value: 'graphql-transport-ws',
						description: 'Modern GraphQL over WebSocket protocol',
					},
					{
						name: 'GraphQL WS',
						value: 'graphql-ws',
						description: 'Alternative GraphQL WebSocket protocol',
					},
					{
						name: 'GraphQL',
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
					const result = await executeWebSocket.call(this, itemIndex);
					returnItems.push(result);
				} catch (error) {
					if (!this.continueOnFail()) {
						throw error;
					}

					const errorData = this.helpers.returnJsonArray({
						error: error instanceof Error ? error.message : String(error),
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
					const endpoint = this.getNodeParameter('url', itemIndex, '') as string;

					// Validate URL
					validateURL(this.getNode(), endpoint, 'http', itemIndex);
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
