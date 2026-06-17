import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { microsoftApiRequest } from '../../transport/index';
import type { Mock, Mocked } from 'vitest';

describe('Microsoft Outlook Transport', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn();
		mockExecuteFunctions.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		mockExecuteFunctions.getNodeParameter.mockReturnValue(false);

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

	it('should include immutable id header for load-options context when option is enabled', async () => {
		const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		const mockResponse = { data: 'test' };
		const mockLoadOptionsHttpRequestWithAuthentication =
			mockLoadOptionsFunctions.helpers.httpRequestWithAuthentication;

		mockLoadOptionsHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
		mockLoadOptionsFunctions.getCredentials.mockResolvedValue({
			oauthTokenData: {
				access_token: 'test-access-token',
			},
			graphApiBaseUrl: 'https://graph.microsoft.com',
		});
		mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue(true);

		await microsoftApiRequest.call(mockLoadOptionsFunctions, 'GET', '/messages');

		expect(mockLoadOptionsHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOutlookOAuth2Api',
			expect.objectContaining({
				headers: expect.objectContaining({
					Prefer: 'IdType="ImmutableId"',
				}),
				method: 'GET',
				url: 'https://graph.microsoft.com/v1.0/me/messages',
				json: true,
			}),
		);
	});

	describe('microsoftApiRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should include immutable id header when option is enabled', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});
				mockExecuteFunctions.getNodeParameter.mockReturnValue(true);

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						headers: expect.objectContaining({
							Prefer: 'IdType="ImmutableId"',
						}),
						method: 'GET',
						url: 'https://graph.microsoft.us/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should use base URL from credentials', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						headers: expect.not.objectContaining({
							Prefer: 'IdType="ImmutableId"',
						}),
						method: 'GET',
						url: 'https://graph.microsoft.us/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should strip multiple trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com///',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.com/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should use US Government cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.microsoft.us/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should use US Government DOD cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://dod-graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://dod-graph.microsoft.us/v1.0/me/messages',
						json: true,
					}),
				);
			});

			it('should use China cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftOutlookOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/messages',
						json: true,
					}),
				);
			});
		});
	});
});
