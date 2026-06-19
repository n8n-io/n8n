import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { MicrosoftTeamsTrigger } from '../../../MicrosoftTeamsTrigger.node';
import { getTeams } from '../../methods/listSearch';
import { getTeamsCredentialType, microsoftApiRequest } from '../../transport/index';

describe('Microsoft Teams Transport', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test Teams Node',
			type: 'n8n-nodes-base.microsoftTeams',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('microsoftApiRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/teams',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should strip multiple trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com///',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should use US Government cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/teams',
						json: true,
					}),
				);
			});

			it('should use US Government DOD cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://dod-graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/teams',
						json: true,
					}),
				);
			});

			it('should use China cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/teams',
						json: true,
					}),
				);
			});
		});

		describe('authentication credential resolution', () => {
			beforeEach(() => {
				mockRequestOAuth2.mockResolvedValue({ data: 'test' });
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});
			});

			it('should use microsoftTeamsOAuth2Api when authentication is not set (backward compatibility)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.anything(),
				);
			});

			it('should use microsoftTeamsOAuth2Api when explicitly selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.anything(),
				);
			});

			it('should use microsoftOAuth2Api when the generic credential is selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			});

			it('should resolve the credential name from the authentication parameter at index 0', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
			});

			it('should honor graphApiBaseUrl from the generic credential (sovereign cloud)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/teams',
					}),
				);
			});
		});
	});

	describe('getTeamsCredentialType', () => {
		it('should default to microsoftTeamsOAuth2Api when authentication is undefined', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should return microsoftTeamsOAuth2Api when selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should return microsoftOAuth2Api when the generic credential is selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftOAuth2Api');
		});
	});

	describe('listSearch credential routing', () => {
		let mockLoadOptions: Mocked<ILoadOptionsFunctions>;
		let loadOptionsRequestOAuth2: Mock;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			loadOptionsRequestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
			mockLoadOptions.helpers.requestOAuth2 = loadOptionsRequestOAuth2;
			mockLoadOptions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		});

		it('should route list-search requests through the selected generic credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await getTeams.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.anything(),
			);
		});

		it('should default list-search requests to the Teams credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(undefined);

			await getTeams.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftTeamsOAuth2Api',
				expect.anything(),
			);
		});
	});

	describe('microsoftApiRequest under a webhook hook (IHookFunctions) context', () => {
		let mockHookFunctions: Mocked<IHookFunctions>;
		let hookRequestOAuth2: Mock;

		beforeEach(() => {
			mockHookFunctions = mockDeep<IHookFunctions>();
			hookRequestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
			mockHookFunctions.helpers.requestOAuth2 = hookRequestOAuth2;
			mockHookFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockHookFunctions.getNode.mockReturnValue(mockNode);
		});

		it('should resolve the generic credential when selected', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockHookFunctions, 'GET', '/v1.0/subscriptions');

			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
		});

		it('should default to the Teams credential', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue(undefined);

			await microsoftApiRequest.call(mockHookFunctions, 'GET', '/v1.0/subscriptions');

			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith('microsoftTeamsOAuth2Api', expect.anything());
		});
	});

	// Drives the real Trigger hook through the real transport (no transport mock) to pin the
	// webhook hook -> microsoftApiRequest -> credential-resolution wiring end to end.
	describe('Trigger webhook hooks credential routing (end-to-end)', () => {
		let mockHookFunctions: Mocked<IHookFunctions>;
		let hookRequestOAuth2: Mock;

		beforeEach(() => {
			mockHookFunctions = mockDeep<IHookFunctions>();
			hookRequestOAuth2 = vi.fn().mockResolvedValue({});
			mockHookFunctions.helpers.requestOAuth2 = hookRequestOAuth2;
			mockHookFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockHookFunctions.getNode.mockReturnValue(mockNode);
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({ subscriptionIds: ['sub-1'] });
		});

		it('should delete subscriptions through the selected generic credential', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
				mockHookFunctions,
			);

			expect(result).toBe(true);
			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ method: 'DELETE' }),
			);
		});

		it('should default subscription deletes to the Teams credential (backward compatibility)', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue(undefined);

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
				mockHookFunctions,
			);

			expect(result).toBe(true);
			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith(
				'microsoftTeamsOAuth2Api',
				expect.objectContaining({ method: 'DELETE' }),
			);
		});
	});
});
