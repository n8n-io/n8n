import { jest } from '@jest/globals';
import type { IWebhookFunctions } from 'n8n-workflow';

import { McpServerSingleton } from '../McpServer';
import { McpTrigger } from '../McpTrigger.node';

// Mocking the helper function
jest.mock('@utils/helpers', () => ({
	getConnectedTools: jest
		.fn()
		.mockResolvedValue([{ name: 'testTool', description: 'Test tool for testing' }]),
}));

// Mocking the McpServerSingleton
jest.mock('../McpServer', () => {
	const mockHandlePostMessage = jest.fn().mockResolvedValue(true);
	const mockConnectTransport = jest.fn().mockResolvedValue(undefined);

	const mockServer = {
		handlePostMessage: mockHandlePostMessage,
		connectTransport: mockConnectTransport,
	};

	return {
		McpServerSingleton: {
			instance: jest.fn().mockReturnValue(mockServer),
		},
	};
});

describe('McpTrigger', () => {
	let mcpTrigger: McpTrigger;
	let mockContext: IWebhookFunctions;
	let mockRequest: any;
	let mockResponse: any;

	beforeEach(() => {
		// Create the McpTrigger instance
		mcpTrigger = new McpTrigger();

		// Create mocks for request and response
		mockRequest = {};
		mockResponse = {
			on: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};

		// Create mock context
		mockContext = {
			getWebhookName: jest.fn(),
			getRequestObject: jest.fn().mockReturnValue(mockRequest),
			getResponseObject: jest.fn().mockReturnValue(mockResponse),
			getNodeWebhookUrl: jest.fn(),
			logger: {
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				debug: jest.fn(),
			},
		} as unknown as IWebhookFunctions;

		// Reset all mocks
		jest.clearAllMocks();
	});

	describe('webhook method', () => {
		it('should handle setup webhook', async () => {
			// Configure the context for setup webhook
			mockContext.getWebhookName = jest.fn().mockReturnValue('setup');
			mockContext.getNodeWebhookUrl = jest
				.fn()
				.mockReturnValue('https://example.com/custom-path/messages');

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Get the server from singleton
			const server = McpServerSingleton.instance(mockContext.logger);

			// Verify that the server was retrieved
			expect(McpServerSingleton.instance).toHaveBeenCalledWith(mockContext.logger);

			// Verify that the connectTransport method was called with correct URL
			expect(server.connectTransport).toHaveBeenCalledWith('/custom-path/messages', mockResponse);

			// Verify the returned result has noWebhookResponse: true
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should handle default webhook for tool execution', async () => {
			// Configure the context for default webhook (tool execution)
			mockContext.getWebhookName = jest.fn().mockReturnValue('default');

			// Mock that the server executes a tool and returns true
			(
				McpServerSingleton.instance(mockContext.logger).handlePostMessage as jest.Mock
			).mockResolvedValueOnce(true);

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Get the server from singleton
			const server = McpServerSingleton.instance(mockContext.logger);

			// Verify that handlePostMessage was called with request, response and tools
			expect(server.handlePostMessage).toHaveBeenCalledWith(
				mockRequest,
				mockResponse,
				expect.any(Array),
			);

			// Verify the returned result when a tool was called
			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: [[{ json: expect.any(Object) }]],
			});
		});

		it('should handle default webhook when no tool was executed', async () => {
			// Configure the context for default webhook
			mockContext.getWebhookName = jest.fn().mockReturnValue('default');

			// Mock that the server doesn't execute a tool and returns false
			(
				McpServerSingleton.instance(mockContext.logger).handlePostMessage as jest.Mock
			).mockResolvedValueOnce(false);

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify the returned result when no tool was called
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});
});
