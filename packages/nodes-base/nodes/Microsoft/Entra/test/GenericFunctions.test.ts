import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { microsoftApiRequest, microsoftApiPaginateRequest } from '../GenericFunctions';

describe('Microsoft Entra GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockRequestOAuth2 = jest.fn();

		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockLoadOptionsFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test Entra Node',
			type: 'n8n-nodes-base.microsoftEntra',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);

		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('microsoftApiRequest', () => {
		describe('base URL handling', () => {
			it('should use graphApiBaseUrl parameter when provided', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.us/v1.0/users',
					}),
				);
			});

			it('should fall back to default when graphApiBaseUrl is not set', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.com/v1.0/users',
					}),
				);
			});

			it('should strip trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us//';
					return '';
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.us/v1.0/users',
					}),
				);
			});

			it('should handle multiple trailing slashes', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us///';
					return '';
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.us/v1.0/users',
					}),
				);
			});

			it('should handle ILoadOptionsFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// ILoadOptionsFunctions doesn't have getNodeParameter
				mockLoadOptionsFunctions.getNodeParameter = undefined as any;

				await microsoftApiRequest.call(mockLoadOptionsFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.com/v1.0/users', // falls back to default
					}),
				);
			});

			it('should handle getNodeParameter throwing an error', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
					throw new Error('Parameter not available');
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.com/v1.0/users', // falls back to default
					}),
				);
			});

			it('should handle different cloud environments', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// Test US Government DOD
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://dod-graph.microsoft.us';
					return '';
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://dod-graph.microsoft.us/v1.0/users',
					}),
				);
			});

			it('should handle China cloud environment', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://microsoftgraph.chinacloudapi.cn';
					return '';
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://microsoftgraph.chinacloudapi.cn/v1.0/users',
					}),
				);
			});

			it('should construct correct URI with different endpoints', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.us/v1.0/groups',
					}),
				);
			});
		});

		describe('request construction', () => {
			it('should construct correct request with all parameters', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				const body = { displayName: 'Test Group' };
				const qs = { $select: 'id,displayName' };
				const headers = { 'Content-Type': 'application/json' };

				await microsoftApiRequest.call(mockExecuteFunctions, 'POST', '/groups', body, qs, headers);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: 'https://graph.microsoft.us/v1.0/groups',
						body,
						qs,
						headers,
						json: true,
					}),
				);
			});

			it('should handle empty body and query parameters', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users', {}, {});

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/users',
						body: {},
						qs: {},
						json: true,
					}),
				);
			});
		});

		describe('error handling', () => {
			it('should handle API errors with proper error transformation', async () => {
				const apiError = {
					error: {
						error: {
							message: 'Resource not found',
							code: 'NotFound',
						},
					},
					statusCode: 404,
				};
				mockRequestOAuth2.mockRejectedValue(apiError);

				await expect(
					microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/users/invalid-id'),
				).rejects.toThrow(NodeApiError);
			});
		});
	});

	describe('microsoftApiPaginateRequest', () => {
		describe('base URL handling', () => {
			it('should use graphApiBaseUrl parameter when provided', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				const result = await microsoftApiPaginateRequest.call(
					mockExecuteFunctions,
					'GET',
					'/users',
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.us/v1.0/users',
					}),
				);
				expect(result).toEqual(['item1', 'item2']);
			});

			it('should fall back to default when graphApiBaseUrl is not set', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				const result = await microsoftApiPaginateRequest.call(
					mockExecuteFunctions,
					'GET',
					'/users',
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.com/v1.0/users',
					}),
				);
				expect(result).toEqual(['item1', 'item2']);
			});

			it('should strip trailing slashes from base URL', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us//';
					return '';
				});

				await microsoftApiPaginateRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.us/v1.0/users',
					}),
				);
			});

			it('should handle ILoadOptionsFunctions context gracefully', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// ILoadOptionsFunctions doesn't have getNodeParameter
				mockLoadOptionsFunctions.getNodeParameter = undefined as any;

				const result = await microsoftApiPaginateRequest.call(
					mockLoadOptionsFunctions,
					'GET',
					'/users',
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.com/v1.0/users', // falls back to default
					}),
				);
				expect(result).toEqual(['item1', 'item2']);
			});

			it('should handle getNodeParameter throwing an error', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
					throw new Error('Parameter not available');
				});

				const result = await microsoftApiPaginateRequest.call(
					mockExecuteFunctions,
					'GET',
					'/users',
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://graph.microsoft.com/v1.0/users', // falls back to default
					}),
				);
				expect(result).toEqual(['item1', 'item2']);
			});

			it('should handle different cloud environments', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// Test US Government DOD
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://dod-graph.microsoft.us';
					return '';
				});

				await microsoftApiPaginateRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://dod-graph.microsoft.us/v1.0/users',
					}),
				);
			});

			it('should handle China cloud environment', async () => {
				const mockResponse = { value: ['item1', 'item2'] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://microsoftgraph.chinacloudapi.cn';
					return '';
				});

				await microsoftApiPaginateRequest.call(mockExecuteFunctions, 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						url: 'https://microsoftgraph.chinacloudapi.cn/v1.0/users',
					}),
				);
			});
		});

		describe('pagination handling', () => {
			it('should handle pagination with nextLink', async () => {
				const firstResponse = {
					value: ['item1', 'item2'],
					'@odata.nextLink': 'https://graph.microsoft.com/v1.0/users?$skip=2',
				};
				const secondResponse = { value: ['item3', 'item4'] };

				mockRequestOAuth2
					.mockResolvedValueOnce(firstResponse)
					.mockResolvedValueOnce(secondResponse);

				const result = await microsoftApiPaginateRequest.call(
					mockExecuteFunctions,
					'GET',
					'/users',
				);

				expect(mockRequestOAuth2).toHaveBeenCalledTimes(2);
				expect(result).toEqual(['item1', 'item2', 'item3', 'item4']);
			});

			it('should handle pagination with custom base URL', async () => {
				const firstResponse = {
					value: ['item1', 'item2'],
					'@odata.nextLink': 'https://graph.microsoft.us/v1.0/users?$skip=2',
				};
				const secondResponse = { value: ['item3', 'item4'] };

				mockRequestOAuth2
					.mockResolvedValueOnce(firstResponse)
					.mockResolvedValueOnce(secondResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				const result = await microsoftApiPaginateRequest.call(
					mockExecuteFunctions,
					'GET',
					'/users',
				);

				expect(mockRequestOAuth2).toHaveBeenCalledTimes(2);
				expect(result).toEqual(['item1', 'item2', 'item3', 'item4']);
			});
		});
	});
});
