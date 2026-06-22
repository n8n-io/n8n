import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { getToDoCredentialType, microsoftApiRequest } from '../GenericFunctions';
import { MicrosoftToDo } from '../MicrosoftToDo.node';

describe('Microsoft ToDo GenericFunctions', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test ToDo Node',
			type: 'n8n-nodes-base.microsoftToDo',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftToDoOAuth2Api');
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/v1.0/me/todo/lists',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftToDoOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/todo/lists',
						json: true,
					}),
				);
			});
		});
	});

	describe('authentication credential resolution', () => {
		beforeEach(() => {
			mockRequestOAuth2.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});
		});

		it('should use microsoftToDoOAuth2Api when authentication is not set (backward compatibility)', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftToDoOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftToDoOAuth2Api', expect.anything());
		});

		it('should use microsoftToDoOAuth2Api when explicitly selected', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftToDoOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftToDoOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftToDoOAuth2Api', expect.anything());
		});

		it('should use microsoftOAuth2Api when the generic credential is selected', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
		});

		it('should resolve the credential name from the authentication parameter at index 0', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
		});

		it('should honor graphApiBaseUrl from the generic credential (sovereign cloud)', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.us/v1.0/me/todo/lists',
				}),
			);
		});
	});

	describe('getToDoCredentialType', () => {
		it('should default to microsoftToDoOAuth2Api when authentication is undefined', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			expect(getToDoCredentialType.call(mockExecuteFunctions)).toBe('microsoftToDoOAuth2Api');
		});

		it('should return microsoftToDoOAuth2Api when explicitly selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftToDoOAuth2Api');

			expect(getToDoCredentialType.call(mockExecuteFunctions)).toBe('microsoftToDoOAuth2Api');
		});

		it('should return microsoftOAuth2Api when the generic credential is selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			expect(getToDoCredentialType.call(mockExecuteFunctions)).toBe('microsoftOAuth2Api');
		});
	});

	describe('loadOptions credential routing', () => {
		let mockLoadOptions: Mocked<ILoadOptionsFunctions>;
		let loadOptionsRequestOAuth2: Mock;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			loadOptionsRequestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
			mockLoadOptions.helpers.requestOAuth2 = loadOptionsRequestOAuth2;
			mockLoadOptions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		});

		it('should route getTaskLists through the selected generic credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await new MicrosoftToDo().methods.loadOptions.getTaskLists.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.anything(),
			);
		});

		it('should default getTaskLists to the To Do credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(undefined);

			await new MicrosoftToDo().methods.loadOptions.getTaskLists.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftToDoOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftToDoOAuth2Api',
				expect.anything(),
			);
		});
	});
});
