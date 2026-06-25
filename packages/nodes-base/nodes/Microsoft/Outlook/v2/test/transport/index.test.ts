import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { microsoftApiRequest } from '../../transport/index';
import type { Mock, Mocked } from 'vitest';

describe('Microsoft Outlook Transport', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestWithAuthentication: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestWithAuthentication = vi.fn();
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
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
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

		describe('credential type resolution', () => {
			it('should use microsoftOutlookOAuth2Api when authentication is not set (backward compatibility)', async () => {
				mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
				mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);
				mockExecuteFunctions.getCredentials.mockResolvedValue({});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
				);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.anything(),
				);
			});

			it('should route through microsoftOAuth2Api when the generic credential is selected', async () => {
				mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
				mockExecuteFunctions.getCredentials.mockResolvedValue({});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOAuth2Api',
					expect.anything(),
				);
			});
		});
	});
});
