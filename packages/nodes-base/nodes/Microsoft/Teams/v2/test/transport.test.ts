import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, IHookFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

describe('Microsoft Teams V2 Transport', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockHookFunctions = mockDeep<IHookFunctions>();
		mockRequestOAuth2 = jest.fn();

		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockLoadOptionsFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockHookFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test Teams Node',
			type: 'n8n-nodes-base.microsoftTeams',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);
		mockHookFunctions.getNode.mockReturnValue(mockNode);

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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/teams',
					}),
				);
			});

			it('should fall back to default when graphApiBaseUrl is not set', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/teams',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/teams',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/teams',
					}),
				);
			});

			it('should handle ILoadOptionsFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// ILoadOptionsFunctions doesn't have getNodeParameter
				mockLoadOptionsFunctions.getNodeParameter = undefined as any;

				await microsoftApiRequest.call(mockLoadOptionsFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/teams', // falls back to default
					}),
				);
			});

			it('should handle IHookFunctions context gracefully', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				// IHookFunctions doesn't have getNodeParameter
				mockHookFunctions.getNodeParameter = undefined as any;

				await microsoftApiRequest.call(mockHookFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/teams', // falls back to default
					}),
				);
			});

			it('should handle getNodeParameter throwing an error', async () => {
				const mockResponse = { data: 'test data' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
					throw new Error('Parameter not available');
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/teams', // falls back to default
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://dod-graph.microsoft.us/teams',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						uri: 'https://microsoftgraph.chinacloudapi.cn/teams',
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

				const body = { name: 'Test Team' };
				const qs = { $select: 'id,displayName' };
				const headers = { 'Content-Type': 'application/json' };

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/teams',
					body,
					qs,
					undefined,
					headers,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						uri: 'https://graph.microsoft.us/teams',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams', {}, {});

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
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
					microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams/invalid-id'),
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
					microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams/invalid-id'),
				).rejects.toThrow('Teams not found');
			});
		});
	});
});
