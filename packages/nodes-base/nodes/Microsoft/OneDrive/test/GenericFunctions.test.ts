import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, IPollFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { microsoftApiRequest, getPath } from '../GenericFunctions';

describe('Microsoft OneDrive GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockPollFunctions = mockDeep<IPollFunctions>();
		mockRequestOAuth2 = jest.fn();

		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockLoadOptionsFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockPollFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test OneDrive Node',
			type: 'n8n-nodes-base.microsoftOneDrive',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);
		mockPollFunctions.getNode.mockReturnValue(mockNode);

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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
					}),
				);
			});

			it('should fall back to default when graphApiBaseUrl is not set', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
					}),
				);
			});

			it('should handle ILoadOptionsFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// ILoadOptionsFunctions doesn't have getNodeParameter
				mockLoadOptionsFunctions.getNodeParameter = undefined as any;

				await microsoftApiRequest.call(mockLoadOptionsFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children', // falls back to default
					}),
				);
			});

			it('should handle IPollFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// IPollFunctions doesn't have getNodeParameter
				mockPollFunctions.getNodeParameter = undefined as any;

				await microsoftApiRequest.call(mockPollFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children', // falls back to default
					}),
				);
			});

			it('should handle getNodeParameter throwing an error', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
					throw new Error('Parameter not available');
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children', // falls back to default
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://dod-graph.microsoft.us/v1.0/me/drive/root/children',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/drive/root/children',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root',
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

				const body = { name: 'Test File.txt', content: 'Test content' };
				const qs = { $select: 'id,name' };
				const headers = { 'Content-Type': 'application/json' };

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/drive/root/children',
					body,
					qs,
					undefined,
					headers,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
						body,
						qs,
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
						}),
						json: true,
					}),
				);
			});

			it('should handle empty body and query parameters', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children', {}, {});

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children',
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
					microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive/root/children/invalid-id'),
				).rejects.toThrow(NodeApiError);
			});
		});
	});

	describe('getPath', () => {
		describe('base URL handling', () => {
			it('should use graphApiBaseUrl parameter when provided', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
					}),
				);
			});

			it('should fall back to default when graphApiBaseUrl is not set', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children',
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

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
					}),
				);
			});

			it('should handle ILoadOptionsFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// ILoadOptionsFunctions doesn't have getNodeParameter
				mockLoadOptionsFunctions.getNodeParameter = undefined as any;

				await getPath.call(mockLoadOptionsFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children', // falls back to default
					}),
				);
			});

			it('should handle IPollFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// IPollFunctions doesn't have getNodeParameter
				mockPollFunctions.getNodeParameter = undefined as any;

				await getPath.call(mockPollFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children', // falls back to default
					}),
				);
			});

			it('should handle getNodeParameter throwing an error', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
					throw new Error('Parameter not available');
				});

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children', // falls back to default
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

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://dod-graph.microsoft.us/v1.0/me/drive/root/children',
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

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/drive/root/children',
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

				await getPath.call(mockExecuteFunctions, '/drive/root');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root',
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

				// Test variables (not used in getPath call but kept for test context)
				const body = { name: 'Test File.txt' };
				const qs = { $select: 'id,name' };

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
						body,
						qs,
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
						}),
						json: true,
					}),
				);
			});

			it('should handle empty body and query parameters', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await getPath.call(mockExecuteFunctions, '/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children',
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
					getPath.call(mockExecuteFunctions, '/drive/root/children/invalid-id'),
				).rejects.toThrow(NodeApiError);
			});
		});
	});
});
