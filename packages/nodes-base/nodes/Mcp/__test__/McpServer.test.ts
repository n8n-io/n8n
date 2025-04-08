import { jest } from '@jest/globals';
import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';

import type { CompressionResponse } from '../FlushingSSEServerTransport';
import { FlushingSSEServerTransport } from '../FlushingSSEServerTransport';
import { McpServer } from '../McpServer';

// Mocks
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
	return {
		Server: jest.fn().mockImplementation(() => ({
			connect: jest.fn(),
			setRequestHandler: jest.fn(),
			onclose: jest.fn(),
			onerror: jest.fn(),
		})),
	};
});

// Mock FlushingSSEServerTransport with our own implementation
jest.mock('../FlushingSSEServerTransport', () => {
	return {
		FlushingSSEServerTransport: jest.fn().mockImplementation(() => {
			// When transport is created, store a reference to the response
			return {
				sessionId: 'mock-session-id',
				handlePostMessage: jest.fn(),
			};
		}),
	};
});

// Mock the Server to call start() on the transport when connect() is called
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
	return {
		Server: jest.fn().mockImplementation(() => ({
			connect: jest.fn().mockImplementation(async (transport) => {
				// When server connects to transport, it calls start() on the transport
				if (transport && transport.start) {
					await transport.start();
				}
			}),
			setRequestHandler: jest.fn(),
			onclose: jest.fn(),
			onerror: jest.fn(),
		})),
	};
});

describe('McpServer', () => {
	let mockLogger: any;
	let mcpServer: McpServer;
	let mockResponse: CompressionResponse;
	let mockRequest: any;

	beforeEach(() => {
		// Create mock logger
		mockLogger = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		};

		// Create mock response
		mockResponse = {
			flush: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			writeHead: jest.fn().mockReturnThis(),
			on: jest.fn().mockImplementation((event, callback) => {
				if (event === 'close') {
					mockResponse.closeCallback = callback;
				}
				return mockResponse;
			}),
			closeCallback: null,
		} as unknown as CompressionResponse;

		// Create mock request
		mockRequest = {
			query: { sessionId: 'mock-session-id' },
			rawBody: {
				toString: jest
					.fn()
					.mockReturnValue(
						'{"jsonrpc":"2.0","method":"tools/call","id":123,"params":{"name":"mockTool", "arguments": {}}}',
					),
			},
		};

		// Reset mocks
		jest.clearAllMocks();

		// Create server instance
		mcpServer = new McpServer(mockLogger);
	});

	describe('connectTransport', () => {
		it('should set up a transport and server', async () => {
			const postUrl = '/post-url';

			await mcpServer.connectTransport(postUrl, mockResponse);

			// Check that FlushingSSEServerTransport was initialized with correct params
			expect(FlushingSSEServerTransport).toHaveBeenCalledWith(postUrl, mockResponse);

			// Check that Server was initialized
			expect(Server).toHaveBeenCalled();

			// Check that transport and server are stored
			expect(mcpServer.transports['mock-session-id']).toBeDefined();
			expect(mcpServer.servers['mock-session-id']).toBeDefined();

			// Check that connect was called on the server
			expect(mcpServer.servers['mock-session-id'].connect).toHaveBeenCalled();

			// Check that flush was called if available
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should set up close handler that cleans up resources', async () => {
			const postUrl = '/post-url';

			await mcpServer.connectTransport(postUrl, mockResponse);

			// Get the close callback and execute it
			const closeCallback = mockResponse.closeCallback;
			await closeCallback();

			// Check that resources were cleaned up
			expect(mcpServer.transports['mock-session-id']).toBeUndefined();
			expect(mcpServer.servers['mock-session-id']).toBeUndefined();
			expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Deleting transport'));
		});
	});

	describe('handlePostMessage', () => {
		it('should call transport.handlePostMessage when transport exists', async () => {
			//const postUrl = '/post-url';
			const mockTools = [
				{ name: 'mockTool', description: 'mockDesc', schema: z.object({}) },
			] as unknown as Tool[];

			// Create a mock transport with handlePostMessage
			const mockTransport = {
				sessionId: 'mock-session-id',
				handlePostMessage: jest.fn().mockImplementation(() => {
					// @ts-expect-error 2341 (private property resolveFunctions)
					mcpServer.resolveFunctions['mock-session-id']();
				}),
			};

			// Add the transport directly
			// @ts-expect-error 2740 (missing functions on transport)
			mcpServer.transports['mock-session-id'] = mockTransport;

			// Call the method
			const result = await mcpServer.handlePostMessage(mockRequest, mockResponse, mockTools);

			// Verify that transport's handlePostMessage was called
			expect(mockTransport.handlePostMessage).toHaveBeenCalledWith(
				mockRequest,
				mockResponse,
				expect.any(String),
			);

			// Verify that we check if it was a tool call
			expect(result).toBe(true);

			// Verify flush was called
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should return 401 when transport does not exist', async () => {
			const mockTools = [{ name: 'mockTool' }] as unknown as Tool[];

			// Call without setting up transport
			await mcpServer.handlePostMessage(mockRequest, mockResponse, mockTools);

			// Verify error status was set
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('No transport found'));

			// Verify warning was logged
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No transport found'));
		});
	});
});
