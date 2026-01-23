import { mock } from 'jest-mock-extended';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nock = require('nock');
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { WebSocket } from 'ws';
import { GraphQL } from '../GraphQL.node';

// Mock WebSocket for testing
jest.mock('ws', () => {
	return {
		WebSocket: jest.fn().mockImplementation((url, protocols, options) => {
			const mockWs = {
				url,
				protocols,
				options,
				readyState: 0, // CONNECTING
				on: jest.fn(),
				send: jest.fn((data: string) => {
					// Handle connection_init for graphql-transport-ws
					try {
						const message = JSON.parse(data);
						if (message.type === 'connection_init') {
							// Send connection_ack
							setTimeout(() => {
								const messageHandler = mockWs.on.mock.calls.find(
									(call) => call[0] === 'message',
								)?.[1];
								if (messageHandler) {
									messageHandler(
										JSON.stringify({
											type: 'connection_ack',
										}),
									);
								}
							}, 5);
						} else if (message.type === 'subscribe' || message.type === 'start') {
							// Send data message after subscription, then complete
							setTimeout(() => {
								const messageHandler = mockWs.on.mock.calls.find(
									(call) => call[0] === 'message',
								)?.[1];
								if (messageHandler) {
									messageHandler(
										JSON.stringify({
											type: 'data',
											payload: { test: 'data' },
										}),
									);
									// Send complete to resolve the promise
									setTimeout(() => {
										messageHandler(
											JSON.stringify({
												type: 'complete',
											}),
										);
									}, 5);
								}
							}, 5);
						}
					} catch (e) {
						// Ignore parse errors
					}
				}),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			// Simulate connection opening
			setTimeout(() => {
				mockWs.readyState = 1; // OPEN
				const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
				if (openHandler) openHandler();
			}, 10);

			return mockWs;
		}),
	};
});

// Helper function to execute the GraphQL node
async function executeGraphQLNode(
	parameters: Record<string, any>,
): Promise<INodeExecutionData[][]> {
	const node = new GraphQL();
	const mockNode = mock<INode>({ name: 'GraphQL' });

	// Mock request function - for HTTP tests, use http/https which nock can intercept
	// For WebSocket tests, this won't be called
	const mockRequest = jest.fn().mockImplementation(async (options: any) => {
		const http = options.uri.startsWith('https://') ? await import('https') : await import('http');
		const url = new URL(options.uri);
		const method = options.method || 'POST';

		// Handle query parameters from options.qs
		let queryString = url.search;
		if (options.qs && typeof options.qs === 'object') {
			const qsParams = new URLSearchParams();
			// Add existing query params from URL
			url.searchParams.forEach((value, key) => {
				qsParams.append(key, value);
			});
			// Add query params from options.qs
			for (const [key, value] of Object.entries(options.qs)) {
				if (value !== null && value !== undefined) {
					qsParams.set(key, String(value));
				}
			}
			queryString = qsParams.toString() ? `?${qsParams.toString()}` : '';
		}

		return await new Promise((resolve, reject) => {
			const requestOptions = {
				hostname: url.hostname,
				port: url.port || (url.protocol === 'https:' ? 443 : 80),
				path: url.pathname + queryString,
				method,
				headers: options.headers || {},
			};

			// Don't send body for GET/HEAD requests
			if (method !== 'GET' && method !== 'HEAD' && options.body) {
				const body = options.json ? JSON.stringify(options.body) : options.body;
				requestOptions.headers['content-length'] = Buffer.byteLength(body);
			}

			const req = http.request(requestOptions, (res: any) => {
				let data = '';
				res.on('data', (chunk: Buffer) => {
					data += chunk.toString();
				});
				res.on('end', () => {
					try {
						const parsed = options.json !== false ? JSON.parse(data) : data;
						resolve(parsed);
					} catch (e) {
						resolve(data);
					}
				});
			});

			req.on('error', reject);

			if (method !== 'GET' && method !== 'HEAD' && options.body) {
				const body = options.json ? JSON.stringify(options.body) : options.body;
				req.write(body);
			}

			req.end();
		});
	});

	const mockExecuteFunctions = mock<IExecuteFunctions>({
		getNodeParameter: (paramName: string, _itemIndex: number, fallback?: any) => {
			const value = parameters[paramName];
			return value !== undefined ? value : fallback;
		},
		getInputData: () => [{ json: {} }],
		getNode: () => mockNode,
		continueOnFail: () => false,
		helpers: {
			constructExecutionMetaData: (data: INodeExecutionData[], _options: any) => data,
			returnJsonArray: (data: any) => {
				if (Array.isArray(data)) {
					return data.map((item) => ({ json: item }));
				}
				return [{ json: data }];
			},
			request: mockRequest as any,
			requestOAuth1: mockRequest as any,
			requestOAuth2: mockRequest as any,
		} as any,
	});

	return await node.execute.call(mockExecuteFunctions);
}

describe('GraphQL Node', () => {
	const baseUrl = 'https://api.n8n.io/';

	beforeAll(async () => {
		// Mock HTTP GraphQL endpoint - use flexible matching
		const defaultResponse = {
			data: {
				nodes: {
					data: [
						{
							id: '1',
							attributes: {
								name: 'n8n-nodes-base.activeCampaign',
								displayName: 'ActiveCampaign',
								description: 'Create and edit data in ActiveCampaign',
								group: '["transform"]',
								codex: {
									data: {
										details:
											'ActiveCampaign is a cloud software platform that allows customer experience automation, which combines email marketing, marketing automation, sales automation, and CRM categories. Use this node when you want to interact with your ActiveCampaign account.',
										resources: {
											primaryDocumentation: [
												{
													url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.activecampaign/',
												},
											],
											credentialDocumentation: [
												{
													url: 'https://docs.n8n.io/integrations/builtin/credentials/activecampaign/',
												},
											],
										},
										categories: ['Marketing'],
										nodeVersion: '1.0',
										codexVersion: '1.0',
									},
								},
								createdAt: '2019-08-30T22:54:39.934Z',
							},
						},
					],
				},
			},
		};

		// Mock POST requests to /graphql
		nock(baseUrl).persist().post('/graphql').reply(200, defaultResponse);

		// Mock GraphQL error response
		nock('https://graphql-teas-endpoint.netlify.app')
			.persist()
			.post('/')
			.reply(200, {
				errors: [
					{
						message: 'Variable "$name" of type "String" was provided invalid value',
					},
				],
			});

		// Mock GET requests
		nock(baseUrl)
			.persist()
			.get('/graphql')
			.query(true)
			.reply(200, {
				data: { test: 'data' },
			});
	});

	describe('HTTP Mode', () => {
		it('should make successful GraphQL POST request with JSON format', async () => {
			const testData = {
				connectionMode: 'http',
				requestMethod: 'POST',
				requestFormat: 'json',
				url: 'https://api.n8n.io/graphql',
				query:
					'query {\n  nodes(pagination: { limit: 1 }) {\n    data {\n      id\n      attributes {\n        name\n        displayName\n        description\n        group\n        codex\n        createdAt\n      }\n    }\n  }\n}',
				variables: '{}',
				operationName: '',
				responseFormat: 'json',
			};

			const result = await executeGraphQLNode(testData);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('data');
			expect(result[0][0].json.data).toHaveProperty('nodes');
		});

		it('should handle GraphQL errors properly', async () => {
			const testData = {
				connectionMode: 'http',
				requestMethod: 'POST',
				requestFormat: 'json',
				url: 'https://graphql-teas-endpoint.netlify.app/',
				query:
					'query getAllTeas($name: String) {\n   teas(name: $name) {\n     name,\n     id\n   }\n}',
				variables: '={{ 1 }}',
				responseFormat: 'json',
			};

			// This should throw an error due to invalid variables
			await expect(executeGraphQLNode(testData)).rejects.toThrow();
		});

		it('should handle GET requests with query parameters', async () => {
			const testData = {
				connectionMode: 'http',
				requestMethod: 'GET',
				url: 'https://api.n8n.io/graphql',
				query: 'query { nodes { data { id } } }',
				responseFormat: 'json',
			};

			const result = await executeGraphQLNode(testData);

			expect(result).toBeDefined();
		});

		it('should handle raw GraphQL format', async () => {
			const testData = {
				connectionMode: 'http',
				requestMethod: 'POST',
				requestFormat: 'graphql',
				url: 'https://api.n8n.io/graphql',
				query: 'query { nodes { data { id } } }',
				responseFormat: 'json',
			};

			const result = await executeGraphQLNode(testData);

			expect(result).toBeDefined();
		});

		it('should handle string response format', async () => {
			const testData = {
				connectionMode: 'http',
				requestMethod: 'POST',
				requestFormat: 'json',
				url: 'https://api.n8n.io/graphql',
				query: 'query { nodes { data { id } } }',
				responseFormat: 'string',
				dataPropertyName: 'result',
			};

			const result = await executeGraphQLNode(testData);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('result');
		});

		it('should validate HTTP URL scheme', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'POST',
					requestFormat: 'json',
					url: 'ws://example.com/graphql', // Invalid - should be http:// or https://
					query: 'query { nodes { data { id } } }',
					variables: '{}',
					responseFormat: 'json',
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('Invalid HTTP URL');
		});
	});

	describe('WebSocket Mode', () => {
		it('should establish WebSocket connection with graphql-transport-ws protocol', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(WebSocket).toHaveBeenCalledWith(
				'wss://example.com/graphql',
				['graphql-transport-ws'],
				expect.objectContaining({
					headers: {},
					rejectUnauthorized: true,
				}),
			);
		});

		it('should handle WebSocket connection with graphql-ws protocol', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{"channel": "general"}',
					websocketSubprotocol: 'graphql-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(WebSocket).toHaveBeenCalledWith(
				'wss://example.com/graphql',
				['graphql-ws'],
				expect.any(Object),
			);
		});

		it('should handle WebSocket connection with legacy graphql protocol', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(WebSocket).toHaveBeenCalledWith(
				'wss://example.com/graphql',
				['graphql'],
				expect.any(Object),
			);
		});

		it('should handle WebSocket connection with custom headers', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
					headerParametersUi: {
						parameter: [
							{ name: 'Authorization', value: 'Bearer token123' },
							{ name: 'X-Custom-Header', value: 'custom-value' },
						],
					},
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(WebSocket).toHaveBeenCalledWith(
				'wss://example.com/graphql',
				['graphql-transport-ws'],
				expect.objectContaining({
					headers: {
						Authorization: 'Bearer token123',
						'X-Custom-Header': 'custom-value',
					},
				}),
			);
		});

		it('should handle WebSocket connection with SSL issues ignored', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
					allowUnauthorizedCerts: true,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(WebSocket).toHaveBeenCalledWith(
				'wss://example.com/graphql',
				['graphql-transport-ws'],
				expect.objectContaining({
					rejectUnauthorized: false,
				}),
			);
		});

		it('should handle WebSocket connection timeout', async () => {
			// Mock WebSocket that never opens to trigger timeout
			const mockWebSocket = {
				readyState: 0, // CONNECTING - never changes
				on: jest.fn(),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementationOnce(() => mockWebSocket);

			const testData = {
				connectionMode: 'websocket',
				url: 'wss://example.com/graphql',
				query: 'subscription { messageAdded { id content } }',
				variables: '{}',
				websocketSubprotocol: 'graphql-transport-ws',
				connectionTimeout: 1, // Very short timeout
				subscriptionTimeout: 300,
			};

			// This should timeout due to the short connection timeout
			await expect(executeGraphQLNode(testData)).rejects.toThrow('WebSocket connection timeout');
		});

		it('should handle invalid variables JSON in WebSocket mode', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: 'invalid json',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			// This should throw an error due to invalid JSON
			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'Failed to parse variables JSON',
			);
		});

		it('should reject invalid variable types in WebSocket mode', async () => {
			const testCases = [
				{ variables: 123, description: 'number' },
				{ variables: true, description: 'boolean' },
				{ variables: null, description: 'null' },
			];

			for (const testCase of testCases) {
				const testData = {
					parameters: {
						connectionMode: 'websocket',
						url: 'wss://example.com/graphql',
						query: 'subscription { messageAdded { id content } }',
						variables: testCase.variables,
						websocketSubprotocol: 'graphql-transport-ws',
						connectionTimeout: 30,
						subscriptionTimeout: 300,
					},
				};

				// This should throw an error due to invalid variable type
				await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
					'GraphQL variables should be either an object or a string',
				);
			}
		});

		it('should validate WebSocket URL scheme', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'https://example.com/graphql', // Invalid - should be ws:// or wss://
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'Invalid WebSocket URL',
			);
		});

		it('should validate HTTP URL scheme', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'POST',
					requestFormat: 'json',
					url: 'ws://example.com/graphql', // Invalid - should be http:// or https://
					query: 'query { nodes { data { id } } }',
					variables: '{}',
					responseFormat: 'json',
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('Invalid HTTP URL');
		});

		it('should validate connection timeout limits', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 1000, // Exceeds max of 300
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'Connection timeout must be between',
			);
		});

		it('should validate subscription timeout limits', async () => {
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 10000, // Exceeds max of 3600
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'Subscription timeout must be between',
			);
		});

		it('should handle WebSocket connection errors', async () => {
			// Mock WebSocket that emits error
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'error') {
						setTimeout(() => {
							handler(new Error('Connection refused'));
						}, 10);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('WebSocket error');
		});

		it('should handle WebSocket message parsing errors', async () => {
			// Mock WebSocket that sends invalid JSON
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler('invalid json');
						}, 20);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'Failed to parse WebSocket message',
			);
		});

		it('should properly cleanup WebSocket resources on error', async () => {
			const mockWebSocket = {
				readyState: 1, // OPEN
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'error') {
						setTimeout(() => {
							handler(new Error('Test error'));
						}, 20);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				connectionMode: 'websocket',
				url: 'wss://example.com/graphql',
				query: 'subscription { messageAdded { id content } }',
				variables: '{}',
				websocketSubprotocol: 'graphql-transport-ws',
				connectionTimeout: 30,
				subscriptionTimeout: 300,
			};

			try {
				await executeGraphQLNode(testData);
			} catch (error) {
				// Expected to throw
			}

			// Verify cleanup was called
			expect(mockWebSocket.removeAllListeners).toHaveBeenCalled();
			expect(mockWebSocket.close).toHaveBeenCalled();
		});

		it('should handle GraphQL subscription error messages', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'error',
									payload: { message: 'Subscription failed' },
								}),
							);
						}, 20);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('Subscription failed');
		});

		it('should handle connection_ack message for graphql-transport-ws', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'connection_ack',
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 30);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 40);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			// Verify subscribe message was sent after connection_ack
			expect(mockWebSocket.send).toHaveBeenCalledWith(
				expect.stringContaining('"type":"subscribe"'),
			);
		});

		it('should handle ping/pong keepalive messages', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'ping',
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 30);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 40);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			// Verify pong was sent in response to ping
			expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"pong"'));
		});

		it('should handle multiple subscription messages', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'first' } },
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '2', content: 'second' } },
								}),
							);
						}, 30);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 40);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(result[0]).toBeDefined();
		});

		it('should handle next message type', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'next',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 30);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('messageAdded');
		});

		it('should handle done message type', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'done',
								}),
							);
						}, 30);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('messageAdded');
		});

		it('should handle message with data field instead of payload', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									data: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 30);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('messageAdded');
		});

		it('should handle unknown message types by collecting them', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'unknown_type',
									customField: 'customValue',
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 30);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('type', 'unknown_type');
			expect(result[0][0].json).toHaveProperty('customField', 'customValue');
		});

		it('should handle subscription timeout when no messages received', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					// No message handler - timeout should occur
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 1, // Very short timeout
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'WebSocket subscription timeout',
			);
		});

		it('should handle connection failure when close event fires before connection established', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'close') {
						setTimeout(() => {
							handler();
						}, 10);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow(
				'WebSocket connection failed to establish',
			);
		});

		it('should handle error messages with array payload format', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'error',
									payload: [{ message: 'Error 1' }, { message: 'Error 2' }],
								}),
							);
						}, 20);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('Error 1, Error 2');
		});

		it('should handle error messages with string payload format', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'error',
									payload: 'Simple error message',
								}),
							);
						}, 20);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('Simple error message');
		});

		it('should handle connection_error message type', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'connection_error',
									payload: { message: 'Connection failed' },
								}),
							);
						}, 20);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await expect(executeGraphQLNode(testData.parameters)).rejects.toThrow('Connection failed');
		});

		it('should handle empty variables object', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 30);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: {},
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('messageAdded');
		});

		it('should handle variables as object (not string)', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						// For graphql-transport-ws, need to send connection_ack first
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'connection_ack',
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 30);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 40);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: { channel: 'general', userId: 123 },
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			// Verify variables were sent in subscription message
			const sendCalls = mockWebSocket.send.mock.calls;
			const subscribeCall = sendCalls.find((call) => call[0].includes('subscribe'));
			expect(subscribeCall).toBeDefined();
			const subscribeMessage = jsonParse(subscribeCall![0]) as {
				payload: { variables: Record<string, unknown> };
			};
			expect(subscribeMessage.payload.variables).toEqual({ channel: 'general', userId: 123 });
		});

		it('should handle operationName parameter', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'connection_ack',
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 30);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 40);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					operationName: 'MessageSubscription',
					websocketSubprotocol: 'graphql-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			// Verify operationName was sent in subscription message
			const sendCalls = mockWebSocket.send.mock.calls;
			const startCall = sendCalls.find((call) => call[0].includes('start'));
			expect(startCall).toBeDefined();
			const startMessage = jsonParse(startCall![0]) as {
				payload: { operationName: string };
			};
			expect(startMessage.payload.operationName).toBe('MessageSubscription');
		});

		it('should reset subscription timeout on each message', async () => {
			let messageCount = 0;
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						// Send multiple messages with delays to test timeout reset
						setTimeout(() => {
							messageCount++;
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'first' } },
								}),
							);
						}, 20);
						setTimeout(() => {
							messageCount++;
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '2', content: 'second' } },
								}),
							);
						}, 250); // After 250ms, should reset timeout
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 350);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 1, // Short timeout, but should reset on messages
				},
			};

			const result = await executeGraphQLNode(testData.parameters);

			expect(result).toBeDefined();
			expect(messageCount).toBe(2);
		});

		it('should verify connection_init is sent for graphql-transport-ws', async () => {
			const mockWebSocket = {
				readyState: 0,
				on: jest.fn((event, handler) => {
					if (event === 'open') {
						setTimeout(() => {
							handler();
						}, 10);
					}
					if (event === 'message') {
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'connection_ack',
								}),
							);
						}, 20);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'data',
									payload: { messageAdded: { id: '1', content: 'test' } },
								}),
							);
						}, 30);
						setTimeout(() => {
							handler(
								JSON.stringify({
									type: 'complete',
								}),
							);
						}, 40);
					}
				}),
				send: jest.fn(),
				close: jest.fn(),
				removeAllListeners: jest.fn(),
			};

			(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 30,
					subscriptionTimeout: 300,
				},
			};

			await executeGraphQLNode(testData.parameters);

			// Verify connection_init was sent
			const sendCalls = mockWebSocket.send.mock.calls;
			const initCall = sendCalls.find((call) => call[0].includes('connection_init'));
			expect(initCall).toBeDefined();
			const initMessage = jsonParse(initCall![0]) as { type: string };
			expect(initMessage.type).toBe('connection_init');
		});
	});

	describe('Node Parameters', () => {
		it('should have correct parameter structure for HTTP mode', () => {
			const node = new GraphQL();
			const nodeDescription = node.description;

			// Check for HTTP-specific parameters
			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'connectionMode',
					type: 'options',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'requestMethod',
					type: 'options',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'requestFormat',
					type: 'options',
				}),
			);
		});

		it('should have correct parameter structure for WebSocket mode', () => {
			const node = new GraphQL();
			const nodeDescription = node.description;

			// Check for WebSocket-specific parameters
			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'websocketSubprotocol',
					type: 'options',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'connectionTimeout',
					type: 'number',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'subscriptionTimeout',
					type: 'number',
				}),
			);
		});

		it('should have unified parameters for both modes', () => {
			const node = new GraphQL();
			const nodeDescription = node.description;

			// Check for unified parameters
			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'url',
					type: 'string',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'query',
					type: 'string',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'variables',
					type: 'json',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'operationName',
					type: 'string',
				}),
			);

			expect(nodeDescription.properties).toContainEqual(
				expect.objectContaining({
					name: 'responseFormat',
					type: 'options',
				}),
			);
		});
	});
});
