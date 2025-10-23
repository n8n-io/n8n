import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

describe('Microsoft Excel V2 Transport', () => {
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
			name: 'Test Excel Node',
			type: 'n8n-nodes-base.microsoftExcel',
			typeVersion: 2,
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/drive/root/children',
					}),
				);
			});

			it('should fall back to default when graphApiBaseUrl is not set', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(mockLoadOptionsFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						uri: 'https://microsoftgraph.chinacloudapi.cn/me/drive/root/children',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				const body = { name: 'Test Workbook.xlsx' };
				const qs = { $select: 'id,name' };
				const headers = { 'Content-Type': 'application/json' };

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/me/drive/root/children',
					body,
					qs,
					undefined,
					headers,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/me/drive/root/children',
					{},
					{},
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/root/children',
						body: {},
						qs: {},
						json: true,
					}),
				);
			});

			it('should handle custom URI parameter', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'graphApiBaseUrl') return 'https://graph.microsoft.us';
					return '';
				});

				const customUri = 'https://graph.microsoft.us/me/drive/root/children/special';
				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/me/drive/root/children',
					{},
					{},
					customUri,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: customUri,
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
					microsoftApiRequest.call(
						mockExecuteFunctions,
						'GET',
						'/me/drive/root/children/invalid-id',
					),
				).rejects.toThrow(NodeApiError);
			});

			it('should handle NotFound errors with custom message', async () => {
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
					microsoftApiRequest.call(
						mockExecuteFunctions,
						'GET',
						'/me/drive/root/children/invalid-id',
					),
				).rejects.toThrow('Workbook not found');
			});

			it('should handle authentication errors', async () => {
				const authError = {
					error: {
						error: {
							message: 'Invalid authentication token',
							code: 'InvalidAuthenticationToken',
						},
					},
					statusCode: 401,
				};
				mockRequestOAuth2.mockRejectedValue(authError);

				await expect(
					microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/me/drive/root/children'),
				).rejects.toThrow(NodeApiError);
			});
		});
	});
});
