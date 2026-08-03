import type { INodeExecutionData } from 'n8n-workflow';
import { Gotify } from '../Gotify.node';
import * as transport from '../GenericFunctions';
import { createMockExecuteFunction } from './helpers';
import type { Mock } from 'vitest';

vi.mock('../GenericFunctions', () => ({
	gotifyApiRequest: vi.fn().mockResolvedValue({}),
	gotifyApiRequestAllItems: vi.fn().mockResolvedValue([]),
}));

const gotifyApiRequestMock = transport.gotifyApiRequest as Mock;
const gotifyApiRequestAllItemsMock = transport.gotifyApiRequestAllItems as Mock;

describe('Test Gotify Node', () => {
	let gotifyNode: Gotify;

	beforeEach(() => {
		gotifyNode = new Gotify();
		vi.clearAllMocks();
	});

	describe('create operation', () => {
		it('should create message with basic fields', async () => {
			const mockResponse = { id: 123, message: 'Test message', priority: 5 };
			gotifyApiRequestMock.mockResolvedValue(mockResponse);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: 'Test message',
				additionalFields: {},
				options: {},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			const result = await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('POST', '/message', {
				message: 'Test message',
			});
			expect(result).toEqual([
				[
					{
						json: mockResponse,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should create message with title and priority', async () => {
			const mockResponse = { id: 124, message: 'Important message', priority: 10, title: 'Alert' };
			gotifyApiRequestMock.mockResolvedValue(mockResponse);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: 'Important message',
				additionalFields: {
					title: 'Alert',
					priority: 10,
				},
				options: {},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('POST', '/message', {
				message: 'Important message',
				title: 'Alert',
				priority: 10,
			});
		});

		it('should create message with markdown content type', async () => {
			const mockResponse = { id: 125, message: '# Markdown Title' };
			gotifyApiRequestMock.mockResolvedValue(mockResponse);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: '# Markdown Title',
				additionalFields: {},
				options: {
					contentType: 'text/markdown',
				},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('POST', '/message', {
				message: '# Markdown Title',
				extras: {
					'client::display': {
						contentType: 'text/markdown',
					},
				},
			});
		});

		it('should create message with URL click action', async () => {
			const mockResponse = { id: 126, message: 'Click me' };
			gotifyApiRequestMock.mockResolvedValue(mockResponse);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: 'Click me',
				additionalFields: {
					url: 'https://example.com',
				},
				options: {},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('POST', '/message', {
				message: 'Click me',
				extras: {
					'client::notification': {
						click: { url: 'https://example.com' },
					},
				},
			});
		});

		it('should create message with all options', async () => {
			const mockResponse = { id: 127, message: '# Full featured message' };
			gotifyApiRequestMock.mockResolvedValue(mockResponse);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: '# Full featured message',
				additionalFields: {
					title: 'Important Alert',
					priority: 8,
					url: 'https://example.com/details',
				},
				options: {
					contentType: 'text/markdown',
				},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('POST', '/message', {
				message: '# Full featured message',
				title: 'Important Alert',
				priority: 8,
				extras: {
					'client::display': {
						contentType: 'text/markdown',
					},
					'client::notification': {
						click: { url: 'https://example.com/details' },
					},
				},
			});
		});
	});

	describe('delete operation', () => {
		it('should delete message by ID', async () => {
			gotifyApiRequestMock.mockResolvedValue({});

			const nodeParameters = {
				resource: 'message',
				operation: 'delete',
				messageId: '123',
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			const result = await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('DELETE', '/message/123');
			expect(result).toEqual([
				[
					{
						json: { success: true },
						pairedItem: { item: 0 },
					},
				],
			]);
		});
	});

	describe('getAll operation', () => {
		it('should get all messages with returnAll true', async () => {
			const mockMessages = [
				{ id: 1, message: 'Message 1' },
				{ id: 2, message: 'Message 2' },
				{ id: 3, message: 'Message 3' },
			];
			gotifyApiRequestAllItemsMock.mockResolvedValue(mockMessages);

			const nodeParameters = {
				resource: 'message',
				operation: 'getAll',
				returnAll: true,
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			const result = await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequestAllItems).toHaveBeenCalledWith(
				'messages',
				'GET',
				'/message',
				{},
				{},
			);
			expect(result[0]).toHaveLength(3);
			expect(result[0][0].json).toEqual(mockMessages[0]);
		});

		it('should use custom limit value', async () => {
			const mockResponse = {
				messages: [{ id: 1, message: 'Message 1' }],
			};
			gotifyApiRequestMock.mockResolvedValue(mockResponse);

			const nodeParameters = {
				resource: 'message',
				operation: 'getAll',
				returnAll: false,
				limit: 5,
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledWith('GET', '/message', {}, { limit: 5 });
		});
	});

	describe('error handling', () => {
		it('should handle errors when continueOnFail is true', async () => {
			const error = new Error('API Error');
			gotifyApiRequestMock.mockRejectedValue(error);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: 'Test message',
				additionalFields: {},
				options: {},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			mockExecute.continueOnFail = () => true;

			const result = await gotifyNode.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: { error: 'API Error' },
					},
				],
			]);
		});

		it('should throw error when continueOnFail is false', async () => {
			const error = new Error('API Error');
			gotifyApiRequestMock.mockRejectedValue(error);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: 'Test message',
				additionalFields: {},
				options: {},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);

			await expect(gotifyNode.execute.call(mockExecute)).rejects.toThrow('API Error');
		});
	});

	describe('multiple items processing', () => {
		it('should process multiple items in a single execution', async () => {
			const mockResponse1 = { id: 200, message: 'First message' };
			const mockResponse2 = { id: 201, message: 'Second message' };

			gotifyApiRequestMock
				.mockResolvedValueOnce(mockResponse1)
				.mockResolvedValueOnce(mockResponse2);

			const nodeParameters = {
				resource: 'message',
				operation: 'create',
				message: 'Test message',
				additionalFields: {},
				options: {},
			};

			const mockExecute = createMockExecuteFunction(nodeParameters);
			mockExecute.getInputData = () => [{ json: {} }, { json: {} }] as INodeExecutionData[];

			const result = await gotifyNode.execute.call(mockExecute);

			expect(transport.gotifyApiRequest).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toEqual(mockResponse1);
			expect(result[0][1].json).toEqual(mockResponse2);
		});
	});
});
