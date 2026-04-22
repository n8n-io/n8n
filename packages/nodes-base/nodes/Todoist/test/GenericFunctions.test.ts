import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import type { Context } from '../GenericFunctions';
import { todoistApiGetAllRequest } from '../GenericFunctions';

const createMockContext = (typeVersion: number = 2.2) => {
	const mockRequestWithAuth = jest.fn();
	const mockCtx = mock<IExecuteFunctions>({
		getNode: () => mock<INode>({ typeVersion }),
		getNodeParameter: jest.fn((param: string) => {
			if (param === 'authentication') return 'oAuth2';
			return '';
		}) as any,
		helpers: {
			requestWithAuthentication: {
				call: mockRequestWithAuth,
			} as any,
		} as any,
	});

	return {
		ctx: mockCtx as unknown as Context,
		mockRequestWithAuth,
	};
};

describe('GenericFunctions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('todoistApiGetAllRequest', () => {
		describe('Legacy mode (node version < 2.2)', () => {
			it('should fetch all items without pagination for version 2.0', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.0);
				const resource = '/tasks';
				const qs = { project_id: '123' };

				const mockResponse = [
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
					{ id: '3', content: 'Task 3' },
				];

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource, qs);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual(mockResponse);
			});

			it('should fetch all items without pagination for version 2.1', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.1);
				const resource = '/tasks';
				const qs = { project_id: '123' };

				const mockResponse = [
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
					{ id: '3', content: 'Task 3' },
				];

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource, qs);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual(mockResponse);
			});

			it('should apply limit when specified for old node versions', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.1);
				const resource = '/tasks';
				const qs = { project_id: '123' };
				const limit = 2;

				const mockResponse = [
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
					{ id: '3', content: 'Task 3' },
				];

				mockRequestWithAuth.mockResolvedValue([...mockResponse]);

				const result = await todoistApiGetAllRequest(ctx, resource, qs, limit);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual([
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
				]);
			});

			it('should handle limit greater than available items', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.1);
				const resource = '/tasks';
				const limit = 10;

				const mockResponse = [
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
				];

				mockRequestWithAuth.mockResolvedValue([...mockResponse]);

				const result = await todoistApiGetAllRequest(ctx, resource, {}, limit);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual(mockResponse);
			});

			it('should handle empty response for old node versions', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.1);
				const resource = '/tasks';

				mockRequestWithAuth.mockResolvedValue([]);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual([]);
			});

			it('should handle query parameters correctly', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.0);
				const resource = '/tasks';
				const qs = { project_id: '456', filter: 'today' };

				const mockResponse = [{ id: '1', content: 'Task 1' }];

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource, qs);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual(mockResponse);
			});

			it('should work without query parameters', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.1);
				const resource = '/projects';

				const mockResponse = [
					{ id: '1', name: 'Project 1' },
					{ id: '2', name: 'Project 2' },
				];

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalled();
				expect(result).toEqual(mockResponse);
			});
		});

		describe('Pagination mode (node version >= 2.2)', () => {
			it('should fetch all items with pagination for version 2.2', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';
				const qs = { project_id: '123' };

				const mockResponsePage1 = {
					results: [
						{ id: '1', content: 'Task 1' },
						{ id: '2', content: 'Task 2' },
					],
					next_cursor: 'cursor-123',
				};

				const mockResponsePage2 = {
					results: [
						{ id: '3', content: 'Task 3' },
						{ id: '4', content: 'Task 4' },
					],
					next_cursor: null,
				};

				mockRequestWithAuth
					.mockResolvedValueOnce(mockResponsePage1)
					.mockResolvedValueOnce(mockResponsePage2);

				const result = await todoistApiGetAllRequest(ctx, resource, qs);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(2);
				expect(result).toEqual([
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
					{ id: '3', content: 'Task 3' },
					{ id: '4', content: 'Task 4' },
				]);
			});

			it('should fetch all items with pagination for version greater then 2.2', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.3);
				const resource = '/projects';

				const mockResponsePage1 = {
					results: [{ id: '1', name: 'Project 1' }],
					next_cursor: 'next-page',
				};

				const mockResponsePage2 = {
					results: [{ id: '2', name: 'Project 2' }],
					next_cursor: null,
				};

				mockRequestWithAuth
					.mockResolvedValueOnce(mockResponsePage1)
					.mockResolvedValueOnce(mockResponsePage2);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(2);
				expect(result).toHaveLength(2);
			});

			it('should respect limit and stop fetching when limit is reached', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';
				const qs = { project_id: '123' };
				const limit = 3;

				const mockResponsePage1 = {
					results: [
						{ id: '1', content: 'Task 1' },
						{ id: '2', content: 'Task 2' },
					],
					next_cursor: 'cursor-123',
				};

				const mockResponsePage2 = {
					results: [
						{ id: '3', content: 'Task 3' },
						{ id: '4', content: 'Task 4' },
					],
					next_cursor: 'cursor-456',
				};

				mockRequestWithAuth
					.mockResolvedValueOnce(mockResponsePage1)
					.mockResolvedValueOnce(mockResponsePage2);

				const result = await todoistApiGetAllRequest(ctx, resource, qs, limit);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(2);
				expect(result).toEqual([
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
					{ id: '3', content: 'Task 3' },
				]);
			});

			it('should handle single page response with no next cursor', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';

				const mockResponse = {
					results: [
						{ id: '1', content: 'Task 1' },
						{ id: '2', content: 'Task 2' },
					],
					next_cursor: null,
				};

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
				expect(result).toEqual([
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
				]);
			});

			it('should handle empty results array', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';

				const mockResponse = {
					results: [],
					next_cursor: null,
				};

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
				expect(result).toEqual([]);
			});

			it('should handle response without results property', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';

				const mockResponse = {
					next_cursor: null,
				};

				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
				expect(result).toEqual([]);
			});

			it('should respect limit of 200 items per request', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';
				const limit = 250;

				const mockResponsePage1 = {
					results: Array.from({ length: 200 }, (_, i) => ({ id: String(i + 1) })),
					next_cursor: 'cursor-123',
				};

				const mockResponsePage2 = {
					results: Array.from({ length: 50 }, (_, i) => ({ id: String(i + 201) })),
					next_cursor: null,
				};

				mockRequestWithAuth
					.mockResolvedValueOnce(mockResponsePage1)
					.mockResolvedValueOnce(mockResponsePage2);

				const result = await todoistApiGetAllRequest(ctx, resource, {}, limit);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(2);
				expect(result).toHaveLength(250);
			});

			it('should handle multiple pages with different result sizes', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';

				const mockResponsePage1 = {
					results: [{ id: '1' }, { id: '2' }],
					next_cursor: 'cursor-1',
				};

				const mockResponsePage2 = {
					results: [{ id: '3' }],
					next_cursor: 'cursor-2',
				};

				const mockResponsePage3 = {
					results: [{ id: '4' }, { id: '5' }, { id: '6' }],
					next_cursor: null,
				};

				mockRequestWithAuth
					.mockResolvedValueOnce(mockResponsePage1)
					.mockResolvedValueOnce(mockResponsePage2)
					.mockResolvedValueOnce(mockResponsePage3);

				const result = await todoistApiGetAllRequest(ctx, resource);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(3);
				expect(result).toEqual([
					{ id: '1' },
					{ id: '2' },
					{ id: '3' },
					{ id: '4' },
					{ id: '5' },
					{ id: '6' },
				]);
			});

			it('should stop pagination when limit is exactly reached', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';
				const limit = 2;

				const mockResponsePage1 = {
					results: [{ id: '1' }, { id: '2' }],
					next_cursor: 'cursor-123',
				};

				mockRequestWithAuth.mockResolvedValueOnce(mockResponsePage1);

				const result = await todoistApiGetAllRequest(ctx, resource, {}, limit);

				expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
				expect(result).toHaveLength(2);
			});

			it('should handle limit of 0', async () => {
				const { ctx, mockRequestWithAuth } = createMockContext(2.2);
				const resource = '/tasks';
				const limit = 0;

				const result = await todoistApiGetAllRequest(ctx, resource, {}, limit);

				expect(mockRequestWithAuth).not.toHaveBeenCalled();
				expect(result).toEqual([]);
			});
		});
	});
});
