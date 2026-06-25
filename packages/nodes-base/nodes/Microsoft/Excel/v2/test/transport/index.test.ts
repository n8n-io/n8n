import {
	NodeApiError,
	NodeOperationError,
	OperationalError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INode,
} from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { searchWorkbooks } from '../../methods/listSearch';
import {
	driveEndpoint,
	getExcelCredentialType,
	getServicePrincipalResourceRoot,
	microsoftApiRequest,
	resolveScopeRoot,
	validateResourceTargetId,
} from '../../transport/index';

describe('Microsoft Excel Transport', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test Excel Node',
			type: 'n8n-nodes-base.microsoftExcel',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftExcelOAuth2Api');
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/v1.0/me/workbooks',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/workbooks',
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

			it('should use microsoftExcelOAuth2Api when authentication is not set (backward compatibility)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftExcelOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.anything(),
				);
			});

			it('should use microsoftExcelOAuth2Api when explicitly selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftExcelOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftExcelOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.anything(),
				);
			});

			it('should use microsoftOAuth2Api when the generic credential is selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			});

			it('should resolve the credential name from the authentication parameter at index 0', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
			});

			it('should honor graphApiBaseUrl from the generic credential (sovereign cloud)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/me/workbooks',
					}),
				);
			});
		});
	});

	describe('getExcelCredentialType', () => {
		it('should default to microsoftExcelOAuth2Api when authentication is undefined', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			expect(getExcelCredentialType.call(mockExecuteFunctions)).toBe('microsoftExcelOAuth2Api');
		});

		it('should return microsoftExcelOAuth2Api when selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftExcelOAuth2Api');

			expect(getExcelCredentialType.call(mockExecuteFunctions)).toBe('microsoftExcelOAuth2Api');
		});

		it('should return microsoftOAuth2Api when the generic credential is selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			expect(getExcelCredentialType.call(mockExecuteFunctions)).toBe('microsoftOAuth2Api');
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

			await searchWorkbooks.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.anything(),
			);
		});

		it('should default list-search requests to the Excel credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(undefined);

			await searchWorkbooks.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftExcelOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftExcelOAuth2Api',
				expect.anything(),
			);
		});

		it('routes Service Principal list-search through requestWithAuthentication, scoped to the target drive', async () => {
			// "Find workbooks" runs in the load-options context. Under the SP credential it must
			// resolve the chosen drive root (here via the unpersisted-default resourceTarget → user)
			// and route through requestWithAuthentication, not requestOAuth2.
			const loadOptionsRequestWithAuth = vi.fn().mockResolvedValue({ value: [] });
			mockLoadOptions.helpers.requestWithAuthentication = loadOptionsRequestWithAuth;
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockLoadOptions.getNodeParameter.mockImplementation(
				(name, fallback) => (name in params ? params[name as string] : fallback) as never,
			);

			await searchWorkbooks.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
			);
			expect(loadOptionsRequestWithAuth).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: expect.stringContaining("/v1.0/users/jane%40contoso.com/drive/root/search(q='"),
				}),
			);
			expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
		});
	});

	describe('Service Principal (app-only) routing', () => {
		const baseUrl = 'https://graph.microsoft.com';
		const SCOPED_RESOURCE = '/drive/items/WB/workbook/worksheets/WS/usedRange';
		let mockRequestWithAuthentication: Mock;

		const setSpParams = (overrides: Record<string, unknown> = {}) => {
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				resourceTarget: 'user',
				userTarget: { value: 'jane@contoso.com' },
				...overrides,
			};
			// Honor the fallback (3rd arg in execute) so an absent param behaves like the real
			// getNodeParameter — returning the passed default rather than undefined.
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name, _itemIndex, fallback) =>
					(name in params ? params[name as string] : fallback) as never,
			);
		};

		beforeEach(() => {
			mockRequestWithAuthentication = vi.fn().mockResolvedValue({ ok: true });
			mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			setSpParams();
		});

		it('routes through requestWithAuthentication, never requestOAuth2', async () => {
			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
			);
			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.anything(),
			);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('rebases /me onto /users/{id}/drive for the user target', async () => {
			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: `${baseUrl}/v1.0/users/jane%40contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('defaults to the user target when resourceTarget is not persisted (unchanged default)', async () => {
			// n8n does not persist an option left at its default, so a UI-built SP node can
			// omit resourceTarget while still having a userTarget. resolveScopeRoot must
			// default to 'user' (via the getNodeParameter fallback) instead of throwing.
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name, _itemIndex, fallback) =>
					(name in params ? params[name as string] : fallback) as never,
			);

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: `${baseUrl}/v1.0/users/jane%40contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('rebases onto /drives/{id} for the drive target (no double /drive)', async () => {
			setSpParams({ resourceTarget: 'drive', driveTarget: { value: 'b!abc-123_XYZ' } });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: `${baseUrl}/v1.0/drives/b!abc-123_XYZ/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('rebases onto /sites/{composite}/drive with literal commas for the site target', async () => {
			const site =
				'contoso.sharepoint.com,11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222';
			setSpParams({ resourceTarget: 'site', siteTarget: { value: site } });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: `${baseUrl}/v1.0/sites/${site}/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('honors a sovereign graphApiBaseUrl', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.us/v1.0/users/jane%40contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange',
				}),
			);
		});

		it('uses an absolute @odata.nextLink uri verbatim (pagination bypasses scoping)', async () => {
			const nextLink =
				'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/children?$skiptoken=abc';

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/drive/root/children',
				{},
				{},
				nextLink,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ uri: nextLink }),
			);
		});

		it('throws OperationalError when a scoped resource does not start with /drive', async () => {
			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/workbooks'),
			).rejects.toThrow(OperationalError);
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('wraps a transport failure as NodeApiError', async () => {
			mockRequestWithAuthentication.mockRejectedValue(new Error('boom'));

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', SCOPED_RESOURCE),
			).rejects.toThrow(NodeApiError);
		});

		it('preserves method and body for a PATCH write, rebased onto the target drive', async () => {
			const body = { values: [['updated']] };

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'PATCH',
				"/drive/items/WB/workbook/worksheets/WS/range(address='A1:A1')",
				body,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					method: 'PATCH',
					body,
					uri: `${baseUrl}/v1.0/users/jane%40contoso.com/drive/items/WB/workbook/worksheets/WS/range(address='A1:A1')`,
				}),
			);
		});

		it('preserves method and body for a POST write (e.g. add worksheet / append row)', async () => {
			const body = { name: 'Sheet2' };

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'/drive/items/WB/workbook/worksheets/add',
				body,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					method: 'POST',
					body,
					uri: `${baseUrl}/v1.0/users/jane%40contoso.com/drive/items/WB/workbook/worksheets/add`,
				}),
			);
		});
	});

	describe('getServicePrincipalResourceRoot / validateResourceTargetId', () => {
		it('builds the user root with an encoded UPN', () => {
			expect(getServicePrincipalResourceRoot('user', 'jane@contoso.com', mockNode)).toBe(
				'/users/jane%40contoso.com',
			);
		});

		it('builds the drive root', () => {
			expect(getServicePrincipalResourceRoot('drive', 'b!abc-123_XYZ', mockNode)).toBe(
				'/drives/b!abc-123_XYZ',
			);
		});

		it('builds the site root with literal commas', () => {
			expect(
				getServicePrincipalResourceRoot('site', 'contoso.sharepoint.com,1111,2222', mockNode),
			).toBe('/sites/contoso.sharepoint.com,1111,2222');
		});

		it('rejects an empty id', () => {
			expect(() => validateResourceTargetId('user', '', mockNode)).toThrow(NodeOperationError);
		});

		it('rejects a dots-only id', () => {
			expect(() => validateResourceTargetId('user', '..', mockNode)).toThrow(
				'The target ID is not valid',
			);
		});

		it('rejects a user id with a slash (path injection)', () => {
			expect(() => validateResourceTargetId('user', 'jane/../bob', mockNode)).toThrow(
				NodeOperationError,
			);
		});

		it('rejects a malformed site composite', () => {
			expect(() => validateResourceTargetId('site', 'contoso.sharepoint.com', mockNode)).toThrow(
				NodeOperationError,
			);
		});

		it('never interpolates the id into the error message', () => {
			let message = '';
			try {
				validateResourceTargetId('user', 'super-secret-id/with/slashes', mockNode);
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).not.toContain('super-secret-id');
		});
	});

	describe('driveEndpoint', () => {
		it('appends /drive to a user or site root', () => {
			expect(driveEndpoint('/users/jane%40contoso.com')).toBe('/users/jane%40contoso.com/drive');
		});

		it('uses a /drives/{id} root as-is', () => {
			expect(driveEndpoint('/drives/b!abc')).toBe('/drives/b!abc');
		});
	});

	describe('resolveScopeRoot', () => {
		it('returns undefined for the OAuth2 credential', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftExcelOAuth2Api');

			expect(resolveScopeRoot.call(mockExecuteFunctions)).toBeUndefined();
		});

		it('resolves the user root for the Service Principal credential', () => {
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				resourceTarget: 'user',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name) => params[name as string] as never,
			);

			expect(resolveScopeRoot.call(mockExecuteFunctions)).toBe('/users/jane%40contoso.com');
		});

		it('falls back to the user target when resourceTarget is unpersisted', () => {
			// 3-arg-aware mock (mirrors the real getNodeParameter): an absent param returns the
			// passed fallback. This pins the fix's contract directly at the function level —
			// resolveScopeRoot must default to 'user' rather than throw when resourceTarget is
			// omitted (its default is not persisted).
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
});
