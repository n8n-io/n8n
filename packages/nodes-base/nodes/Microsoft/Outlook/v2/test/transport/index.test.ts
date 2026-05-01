import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { microsoftApiRequest } from '../../transport/index';

describe('Microsoft Outlook Transport', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestWithAuthentication: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestWithAuthentication = jest.fn();
		mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;

		mockNode = {
			id: 'test-node',
			name: 'Test Outlook Node',
			type: 'n8n-nodes-base.microsoftOutlook',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/v1.0/me/messages',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/messages',
						json: true,
					}),
				);
			});
		});
	});
});
