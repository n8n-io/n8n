import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import { WebSocket } from 'ws';

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
				send: jest.fn(),
				close: jest.fn(),
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

describe('GraphQL Node', () => {
	const baseUrl = 'https://api.n8n.io/';

	beforeAll(async () => {
		// Mock HTTP GraphQL endpoint
		nock(baseUrl)
			.matchHeader('accept', 'application/json')
			.matchHeader('content-type', 'application/json')
			.matchHeader('content-length', '263')
			.matchHeader('accept-encoding', 'gzip, compress, deflate, br')
			.post(
				'/graphql',
				'{"query":"query {\\n  nodes(pagination: { limit: 1 }) {\\n    data {\\n      id\\n      attributes {\\n        name\\n        displayName\\n        description\\n        group\\n        codex\\n        createdAt\\n      }\\n    }\\n  }\\n}","variables":{},"operationName":null}',
			)
			.reply(200, {
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
														url: 'https://docs.n8n.io/integrations/builtin/credentials/activeCampaign/',
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
			});

		// Mock GraphQL error response
		nock('https://graphql-teas-endpoint.netlify.app')
			.post('/')
			.reply(200, {
				errors: [
					{
						message: 'Variable "$name" of type "String" was provided invalid value',
					},
				],
			});
	});

	describe('HTTP Mode', () => {
		it('should make successful GraphQL POST request with JSON format', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'POST',
					requestFormat: 'json',
					url: 'https://api.n8n.io/graphql',
					query:
						'query {\n  nodes(pagination: { limit: 1 }) {\n    data {\n      id\n      attributes {\n        name\n        displayName\n        description\n        group\n        codex\n        createdAt\n      }\n    }\n  }\n}',
					variables: '{}',
					operationName: '',
					responseFormat: 'json',
				},
			};

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('data');
			expect(result[0][0].json.data).toHaveProperty('nodes');
		});

		it('should handle GraphQL errors properly', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'POST',
					requestFormat: 'json',
					url: 'https://graphql-teas-endpoint.netlify.app/',
					query:
						'query getAllTeas($name: String) {\n   teas(name: $name) {\n     name,\n     id\n   }\n}',
					variables: '={{ 1 }}',
					responseFormat: 'json',
				},
			};

			const harness = new NodeTestHarness();
			await harness.setupTests();

			// This should throw an error due to invalid variables
			await expect(harness.executeNode(testData)).rejects.toThrow();
		});

		it('should handle GET requests with query parameters', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'GET',
					url: 'https://api.n8n.io/graphql',
					query: 'query { nodes { data { id } } }',
					responseFormat: 'json',
				},
			};

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

			expect(result).toBeDefined();
		});

		it('should handle raw GraphQL format', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'POST',
					requestFormat: 'graphql',
					url: 'https://api.n8n.io/graphql',
					query: 'query { nodes { data { id } } }',
					responseFormat: 'json',
				},
			};

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

			expect(result).toBeDefined();
		});

		it('should handle string response format', async () => {
			const testData = {
				parameters: {
					connectionMode: 'http',
					requestMethod: 'POST',
					requestFormat: 'json',
					url: 'https://api.n8n.io/graphql',
					query: 'query { nodes { data { id } } }',
					responseFormat: 'string',
					dataPropertyName: 'result',
				},
			};

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

			expect(result).toBeDefined();
			expect(result[0][0].json).toHaveProperty('result');
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

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

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

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

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

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

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

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

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

			const harness = new NodeTestHarness();
			await harness.setupTests();
			const result = await harness.executeNode(testData);

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
			const testData = {
				parameters: {
					connectionMode: 'websocket',
					url: 'wss://example.com/graphql',
					query: 'subscription { messageAdded { id content } }',
					variables: '{}',
					websocketSubprotocol: 'graphql-transport-ws',
					connectionTimeout: 1, // Very short timeout
					subscriptionTimeout: 300,
				},
			};

			const harness = new NodeTestHarness();
			await harness.setupTests();

			// This should timeout due to the short connection timeout
			await expect(harness.executeNode(testData)).rejects.toThrow('WebSocket connection timeout');
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

			const harness = new NodeTestHarness();
			await harness.setupTests();

			// This should throw an error due to invalid JSON
			await expect(harness.executeNode(testData)).rejects.toThrow('Failed to parse variables JSON');
		});
	});

	describe('Node Parameters', () => {
		it('should have correct parameter structure for HTTP mode', () => {
			const harness = new NodeTestHarness();
			const nodeDescription = harness.getNodeDescription();

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
			const harness = new NodeTestHarness();
			const nodeDescription = harness.getNodeDescription();

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
			const harness = new NodeTestHarness();
			const nodeDescription = harness.getNodeDescription();

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

	new NodeTestHarness().setupTests();
});
