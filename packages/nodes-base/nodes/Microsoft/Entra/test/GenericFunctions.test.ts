import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { microsoftApiRequest, microsoftApiPaginateRequest } from '../GenericFunctions';

describe('Microsoft Entra GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestWithAuthentication: jest.Mock;
	let mockRequestWithAuthenticationPaginated: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestWithAuthentication = jest.fn();
		mockRequestWithAuthenticationPaginated = jest.fn();
		mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;
		mockExecuteFunctions.helpers.requestWithAuthenticationPaginated =
			mockRequestWithAuthenticationPaginated;

		mockNode = {
			id: 'test-node',
			name: 'Test Entra Node',
			type: 'n8n-nodes-base.microsoftEntra',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getCredentials = jest.fn();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('microsoftApiRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.us/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should strip multiple trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com///',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should use US Government cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.us/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should use US Government DOD cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://dod-graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://dod-graph.microsoft.us/v1.0/groups',
						json: true,
					}),
				);
			});

			it('should use China cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftEntraOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://microsoftgraph.chinacloudapi.cn/v1.0/groups',
						json: true,
					}),
				);
			});
		});
	});

	describe('microsoftApiPaginateRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = [{ body: { value: [{ id: '1', name: 'Group 1' }] } }];
				mockRequestWithAuthenticationPaginated.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiPaginateRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthenticationPaginated).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/groups',
						json: true,
					}),
					0,
					expect.objectContaining({
						continue: expect.any(String),
						request: expect.any(Object),
						requestInterval: 0,
					}),
					'microsoftEntraOAuth2Api',
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = [{ body: { value: [{ id: '1', name: 'Group 1' }] } }];
				mockRequestWithAuthenticationPaginated.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await microsoftApiPaginateRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthenticationPaginated).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/groups',
						json: true,
					}),
					0,
					expect.objectContaining({
						continue: expect.any(String),
						request: expect.any(Object),
						requestInterval: 0,
					}),
					'microsoftEntraOAuth2Api',
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = [{ body: { value: [{ id: '1', name: 'Group 1' }] } }];
				mockRequestWithAuthenticationPaginated.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await microsoftApiPaginateRequest.call(mockExecuteFunctions, 'GET', '/groups');

				expect(mockRequestWithAuthenticationPaginated).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/groups',
						json: true,
					}),
					0,
					expect.objectContaining({
						continue: expect.any(String),
						request: expect.any(Object),
						requestInterval: 0,
					}),
					'microsoftEntraOAuth2Api',
				);
			});
		});
	});
});
