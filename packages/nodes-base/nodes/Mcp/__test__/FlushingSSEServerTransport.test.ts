import { jest } from '@jest/globals';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import { FlushingSSEServerTransport } from '../FlushingSSEServerTransport';
import type { CompressionResponse } from '../FlushingSSEServerTransport';

describe('FlushingSSEServerTransport', () => {
	let mockResponse: CompressionResponse;
	let transport: FlushingSSEServerTransport;
	const endpoint = '/test/endpoint';

	beforeEach(() => {
		// Create a mock response object with flush method
		mockResponse = {
			flush: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			setHeader: jest.fn().mockReturnThis(),
			writeHead: jest.fn().mockReturnThis(),
			write: jest.fn().mockReturnThis(),
			on: jest.fn().mockReturnThis(),
		} as unknown as CompressionResponse;

		transport = new FlushingSSEServerTransport(endpoint, mockResponse);
	});

	it('should call flush after sending a message', async () => {
		// Create a sample JSONRPC message
		const message: JSONRPCMessage = {
			jsonrpc: '2.0',
			id: '123',
			result: { success: true },
		};

		// Mock the superclass send method
		const superSendSpy = jest
			.spyOn(Object.getPrototypeOf(FlushingSSEServerTransport.prototype), 'send')
			.mockImplementation(async () => {});

		// Send a message through the transport
		await transport.send(message);

		// Verify that superclass send was called with the correct message
		expect(superSendSpy).toHaveBeenCalledWith(message);

		// Verify that flush was called on the response
		expect(mockResponse.flush).toHaveBeenCalled();
	});
});
