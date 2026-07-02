import {
	NodeApiError,
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INode,
} from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	getServicePrincipalResourceRoot,
	getToDoCredentialType,
	microsoftApiRequest,
	resolveScopeRoot,
	validateUserTargetId,
} from '../GenericFunctions';
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

		it('should return microsoftEntraServicePrincipalApi when the Service Principal is selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');

			expect(getToDoCredentialType.call(mockExecuteFunctions)).toBe(
				'microsoftEntraServicePrincipalApi',
			);
		});
	});

	describe('Service Principal (app-only) routing', () => {
		const baseUrl = 'https://graph.microsoft.com';
		let mockRequestWithAuthentication: Mock;

		const setSpParams = (overrides: Record<string, unknown> = {}) => {
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
				...overrides,
			};
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name, _itemIndex, fallback) =>
					(name in params ? params[name as string] : fallback) as never,
			);
		};

		beforeEach(() => {
			mockRequestWithAuthentication = vi.fn().mockResolvedValue({ value: [] });
			mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			setSpParams();
		});

		it('routes through requestWithAuthentication, never requestOAuth2', async () => {
			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
			);
			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.anything(),
			);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('rebases /me onto /users/{id} for the user target', async () => {
			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ uri: `${baseUrl}/v1.0/users/jane%40contoso.com/todo/lists` }),
			);
		});

		it('honors a sovereign graphApiBaseUrl', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.us/v1.0/users/jane%40contoso.com/todo/lists',
				}),
			);
		});

		it('uses an absolute @odata.nextLink uri verbatim (pagination bypasses scoping)', async () => {
			const nextLink =
				'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/todo/lists?$skiptoken=abc';

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists', {}, {}, nextLink);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ uri: nextLink }),
			);
		});

		it('throws a clear error when the user target is missing', async () => {
			setSpParams({ userTarget: { value: '' } });

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists'),
			).rejects.toThrow('A target ID is required for the Service Principal');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('wraps a transport failure as NodeApiError', async () => {
			mockRequestWithAuthentication.mockRejectedValue(new Error('boom'));

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/todo/lists'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('getServicePrincipalResourceRoot / validateUserTargetId', () => {
		it('builds the user root with an encoded UPN', () => {
			expect(getServicePrincipalResourceRoot('jane@contoso.com', mockNode)).toBe(
				'/users/jane%40contoso.com',
			);
		});

		it('accepts a GUID object id', () => {
			expect(
				getServicePrincipalResourceRoot('00000000-0000-0000-0000-000000000000', mockNode),
			).toBe('/users/00000000-0000-0000-0000-000000000000');
		});

		it('rejects an empty id', () => {
			expect(() => validateUserTargetId('', mockNode)).toThrow(NodeOperationError);
		});

		it('rejects a dots-only id', () => {
			expect(() => validateUserTargetId('..', mockNode)).toThrow('The target ID is not valid');
		});

		it('rejects an id with a slash (path injection) and never echoes it', () => {
			let message = '';
			try {
				validateUserTargetId('jane/../secret', mockNode);
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).toBe('The target ID is not valid');
			expect(message).not.toContain('secret');
		});

		it("accepts a UPN containing an apostrophe (e.g. o'connor)", () => {
			expect(getServicePrincipalResourceRoot("o'connor@contoso.com", mockNode)).toBe(
				"/users/o'connor%40contoso.com",
			);
		});

		it('accepts a UPN with "+" sub-addressing', () => {
			expect(() => validateUserTargetId('jane+test@contoso.com', mockNode)).not.toThrow();
		});

		it('accepts a B2B guest UPN (#EXT#) and encodes it path-safely', () => {
			expect(
				getServicePrincipalResourceRoot('user_contoso.com#EXT#@tenant.onmicrosoft.com', mockNode),
			).toBe('/users/user_contoso.com%23EXT%23%40tenant.onmicrosoft.com');
		});

		it('accepts the documented Entra UPN special characters (! # ^ ~)', () => {
			expect(() => validateUserTargetId('joe^smith@contoso.com', mockNode)).not.toThrow();
			expect(() => validateUserTargetId('o!brien@contoso.com', mockNode)).not.toThrow();
		});

		it('rejects a bare host/domain (not a valid /users/{id})', () => {
			expect(() => validateUserTargetId('contoso.com', mockNode)).toThrow(
				'The target ID is not valid',
			);
			expect(() => validateUserTargetId('jane', mockNode)).toThrow('The target ID is not valid');
		});

		it('rejects backslash and encoded-traversal ids', () => {
			expect(() => validateUserTargetId('a\\b', mockNode)).toThrow('The target ID is not valid');
			expect(() => validateUserTargetId('%2e%2e', mockNode)).toThrow('The target ID is not valid');
		});
	});

	describe('resolveScopeRoot', () => {
		it('returns undefined for the OAuth2 credential', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftToDoOAuth2Api');

			expect(resolveScopeRoot.call(mockExecuteFunctions)).toBeUndefined();
		});

		it('resolves the user root for the Service Principal credential', () => {
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name, _itemIndex, fallback) =>
					(name in params ? params[name as string] : fallback) as never,
			);

			expect(resolveScopeRoot.call(mockExecuteFunctions)).toBe('/users/jane%40contoso.com');
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

		it('routes getTaskLists through requestWithAuthentication under the Service Principal', async () => {
			const loadOptionsRequestWithAuth = vi.fn().mockResolvedValue({ value: [] });
			mockLoadOptions.helpers.requestWithAuthentication = loadOptionsRequestWithAuth;
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockLoadOptions.getNodeParameter.mockImplementation(
				(name, fallback) => (name in params ? params[name as string] : fallback) as never,
			);

			await new MicrosoftToDo().methods.loadOptions.getTaskLists.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
			);
			expect(loadOptionsRequestWithAuth).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/todo/lists',
				}),
			);
			expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
		});
	});
});
