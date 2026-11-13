import {
	NodeApiError,
	NodeOperationError,
<<<<<<< HEAD
	OperationalError,
=======
	requestPath,
	requestUrl,
>>>>>>> 9d82d35c (chore: Bundle/2.x (#43761))
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INode,
} from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import * as deleteWorkbook from '../../actions/workbook/deleteWorkbook.operation';
import * as readRows from '../../actions/worksheet/readRows.operation';
import { searchWorkbooks } from '../../methods/listSearch';
import {
	driveEndpoint,
	getExcelCredentialType,
	getServicePrincipalResourceRoot,
	microsoftApiRequest,
	microsoftApiRequestAllItemsSkip,
	resolveScopeRoot,
	toWorkbookId,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://graph.microsoft.us/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://graph.microsoft.us/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://dod-graph.microsoft.us/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: requestUrl`https://microsoftgraph.chinacloudapi.cn/v1.0/me/drive/workbooks`,
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

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftExcelOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.anything(),
				);
			});

			it('should use microsoftExcelOAuth2Api when explicitly selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftExcelOAuth2Api');

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftExcelOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftExcelOAuth2Api',
					expect.anything(),
				);
			});

			it('should use microsoftOAuth2Api when the generic credential is selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			});

			it('should resolve the credential name from the authentication parameter at index 0', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
			});

			it('should honor graphApiBaseUrl from the generic credential (sovereign cloud)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					requestPath`/workbooks`,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				);

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOAuth2Api',
					expect.objectContaining({
						uri: requestUrl`https://graph.microsoft.us/v1.0/me/drive/workbooks`,
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

		it.each(['https://other.example/v1.0/me/drive/root/search', 'not a url'])(
			'should not send a request for the pagination token %s',
			async (token) => {
				mockLoadOptions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
				mockLoadOptions.getNode.mockReturnValue(mockNode);

				await expect(searchWorkbooks.call(mockLoadOptions, undefined, token)).rejects.toThrow(
					'Refusing to send credentials to an unexpected host',
				);
				expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
			},
		);

		it('should follow a pagination token on the credential base URL', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
			const token = 'https://graph.microsoft.com/v1.0/me/drive/root/search?$skiptoken=abc';

			await searchWorkbooks.call(mockLoadOptions, undefined, token);

			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: token }),
			);
		});

		it('blocks the Service Principal list-search (drive search is unsupported app-only)', async () => {
			// "From List" must throw under SP (app-only can't search a drive), not issue a request.
			const loadOptionsRequestWithAuth = vi.fn().mockResolvedValue({ value: [] });
			mockLoadOptions.helpers.requestWithAuthentication = loadOptionsRequestWithAuth;
			mockLoadOptions.getNode.mockReturnValue(mockNode);
			mockLoadOptions.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');

			await expect(searchWorkbooks.call(mockLoadOptions)).rejects.toThrow(
				'Search is not supported with the Service Principal credential',
			);
			expect(loadOptionsRequestWithAuth).not.toHaveBeenCalled();
			expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
		});
	});

	describe('Service Principal (app-only) routing', () => {
		const baseUrl = 'https://graph.microsoft.com';
		const SCOPED_RESOURCE = requestPath`/items/WB/workbook/worksheets/WS/usedRange`;
		let mockRequestWithAuthentication: Mock;

		const setSpParams = (overrides: Record<string, unknown> = {}) => {
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				resourceTarget: 'user',
				userTarget: { value: 'jane@contoso.com' },
				...overrides,
			};
			// Honor the 3rd-arg fallback like the real getNodeParameter (return the default, not undefined).
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
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
			);

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
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: requestUrl`${baseUrl}/v1.0/users/jane@contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('defaults to the user target when resourceTarget is not persisted (unchanged default)', async () => {
			// A default-valued option isn't persisted, so an SP node may omit resourceTarget;
			// resolveScopeRoot must default to 'user' rather than throw.
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name, _itemIndex, fallback) =>
					(name in params ? params[name as string] : fallback) as never,
			);

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: requestUrl`${baseUrl}/v1.0/users/jane@contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('rebases onto /drives/{id} for the drive target (no double /drive)', async () => {
			setSpParams({ resourceTarget: 'drive', driveTarget: { value: 'b!abc-123_XYZ' } });

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: requestUrl`${baseUrl}/v1.0/drives/b!abc-123_XYZ/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('honors a sovereign graphApiBaseUrl', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: requestUrl`https://graph.microsoft.us/v1.0/users/jane@contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('uses an absolute @odata.nextLink uri verbatim (pagination bypasses scoping)', async () => {
			const nextLink =
				'https://graph.microsoft.com/v1.0/users/jane@contoso.com/drive/root/children?$skiptoken=abc';

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				requestPath`/root/children`,
				{},
				{},
				nextLink,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ uri: nextLink }),
			);
		});

		// The target RLC accepts expressions, so execute call sites pass the loop index
		// and the transport must resolve the target at exactly that index.
		const setSpParamsPerItem = () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((name, itemIndex, fallback) => {
				if (name === 'authentication') return 'microsoftEntraServicePrincipalApi' as never;
				if (name === 'resourceTarget') return 'user' as never;
				if (name === 'userTarget')
					return { value: itemIndex === 1 ? 'john@contoso.com' : 'jane@contoso.com' } as never;
				return fallback as never;
			});
		};

		it('resolves the target at the passed itemIndex', async () => {
			setSpParamsPerItem();

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
			);
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				SCOPED_RESOURCE,
				undefined,
				undefined,
				undefined,
				undefined,
				1,
			);

			expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
				1,
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: requestUrl`${baseUrl}/v1.0/users/jane@contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
			expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: requestUrl`${baseUrl}/v1.0/users/john@contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`,
				}),
			);
		});

		it('keeps the passed itemIndex root on every $skip page (AllItemsSkip)', async () => {
			setSpParamsPerItem();
			mockRequestWithAuthentication
				.mockResolvedValueOnce({ value: [{ id: 'row-1' }] })
				.mockResolvedValueOnce({ value: [] });

			await microsoftApiRequestAllItemsSkip.call(
				mockExecuteFunctions,
				'value',
				'GET',
				SCOPED_RESOURCE,
				{},
				{},
				1,
			);

			const johnUri = requestUrl`${baseUrl}/v1.0/users/john@contoso.com/drive/items/WB/workbook/worksheets/WS/usedRange`;
			expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
				1,
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ uri: johnUri }),
			);
			expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ uri: johnUri }),
			);
		});

		it('wraps a transport failure as NodeApiError', async () => {
			mockRequestWithAuthentication.mockRejectedValue(new Error('boom'));

			await expect(
				microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					SCOPED_RESOURCE,
					undefined,
					undefined,
					undefined,
					undefined,
					0,
				),
			).rejects.toThrow(NodeApiError);
		});

		it('preserves method and body for a PATCH write, rebased onto the target drive', async () => {
			const body = { values: [['updated']] };

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'PATCH',
				requestPath`/items/WB/workbook/worksheets/WS/range(address='A1:A1')`,
				body,
				undefined,
				undefined,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					method: 'PATCH',
					body,
					uri: requestUrl`${baseUrl}/v1.0/users/jane@contoso.com/drive/items/WB/workbook/worksheets/WS/range(address='A1:A1')`,
				}),
			);
		});

		it('preserves method and body for a POST write (e.g. add worksheet / append row)', async () => {
			const body = { name: 'Sheet2' };

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'POST',
				requestPath`/items/WB/workbook/worksheets/add`,
				body,
				undefined,
				undefined,
				undefined,
				0,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					method: 'POST',
					body,
					uri: requestUrl`${baseUrl}/v1.0/users/jane@contoso.com/drive/items/WB/workbook/worksheets/add`,
				}),
			);
		});
	});

	describe('getServicePrincipalResourceRoot / validateResourceTargetId', () => {
		it('builds the user root with an encoded UPN', () => {
			expect(getServicePrincipalResourceRoot('user', 'jane@contoso.com', mockNode).value).toBe(
				'/users/jane@contoso.com',
			);
		});

		it('builds the drive root', () => {
			expect(getServicePrincipalResourceRoot('drive', 'b!abc-123_XYZ', mockNode).value).toBe(
				'/drives/b!abc-123_XYZ',
			);
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
		it('appends /drive to a user root', () => {
			expect(driveEndpoint(requestPath`/users/jane@contoso.com`).value).toBe(
				'/users/jane@contoso.com/drive',
			);
		});

		it('uses a /drives/{id} root as-is', () => {
			expect(driveEndpoint(requestPath`/drives/b!abc`).value).toBe('/drives/b!abc');
		});
	});

	describe('resolveScopeRoot', () => {
		it('returns undefined for the OAuth2 credential', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftExcelOAuth2Api');

			expect(resolveScopeRoot.call(mockExecuteFunctions, 0)).toBeUndefined();
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

			expect(resolveScopeRoot.call(mockExecuteFunctions, 0)?.value).toBe('/users/jane@contoso.com');
		});

		it('falls back to the user target when resourceTarget is unpersisted', () => {
			// 3-arg-aware mock: resolveScopeRoot must default to 'user' when resourceTarget is omitted.
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				userTarget: { value: 'jane@contoso.com' },
			};
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name, _itemIndex, fallback) =>
					(name in params ? params[name as string] : fallback) as never,
			);

			expect(resolveScopeRoot.call(mockExecuteFunctions, 0)?.value).toBe('/users/jane@contoso.com');
		});
	});

	describe('request URL encoding', () => {
		it('should encode a workbook ID with a slash as one path segment', async () => {
			mockRequestOAuth2.mockResolvedValue({});
			(mockExecuteFunctions.helpers.constructExecutionMetaData as Mock).mockReturnValue([]);
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockExecuteFunctions.getNodeParameter.mockImplementation((name) =>
				name === 'workbook' ? ('01ABC/children' as never) : ('microsoftExcelOAuth2Api' as never),
			);

			await deleteWorkbook.execute.call(mockExecuteFunctions, [{ json: {} }]);

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftExcelOAuth2Api',
				expect.objectContaining({
					method: 'DELETE',
					uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/items/01ABC%2Fchildren`,
				}),
			);
		});
	});

	describe('toWorkbookId', () => {
		it.each([
			[2.2, 'A1B2C3%21s0123', 'A1B2C3!s0123'],
			[2.3, 'A1B2C3%21s0123', 'A1B2C3!s0123'],
			[2.3, 'A1B2C3!s0123', 'A1B2C3!s0123'],
			[2.3, 'A%252Fb', 'A%252Fb'],
			[2.3, 'A%2Fb', 'A%2Fb'],
		])('should convert a workbook ID for version %s', (typeVersion, input, expected) => {
			mockExecuteFunctions.getNode.mockReturnValue({ ...mockNode, typeVersion });

			expect(toWorkbookId.call(mockExecuteFunctions, input)).toBe(expected);
		});

		it('should map the personal drive separator in a workbook ID from version 2.3', async () => {
			mockRequestOAuth2.mockResolvedValue({});
			(mockExecuteFunctions.helpers.constructExecutionMetaData as Mock).mockReturnValue([]);
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockExecuteFunctions.getNode.mockReturnValue({ ...mockNode, typeVersion: 2.3 });
			mockExecuteFunctions.getNodeParameter.mockImplementation((name) =>
				name === 'workbook' ? ('A1B2C3%21s0123' as never) : ('microsoftExcelOAuth2Api' as never),
			);

			await deleteWorkbook.execute.call(mockExecuteFunctions, [{ json: {} }]);

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftExcelOAuth2Api',
				expect.objectContaining({
					uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/items/A1B2C3!s0123`,
				}),
			);
		});
	});

	describe('execute error attribution', () => {
		it('stamps context.itemIndex on a NodeError from the failing item', async () => {
			const mockRequestWithAuthentication = vi
				.fn()
				.mockResolvedValue({ values: [['row'], ['jane-row']] });
			mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;
			(mockExecuteFunctions.helpers.constructExecutionMetaData as Mock).mockReturnValue([]);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockExecuteFunctions.getNodeParameter.mockImplementation((name, itemIndex, fallback) => {
				const params: Record<string, unknown> = {
					authentication: 'microsoftEntraServicePrincipalApi',
					resourceTarget: 'user',
					workbook: 'WB',
					worksheet: 'WS',
				};
				if (name === 'userTarget')
					return { value: itemIndex === 1 ? 'not a user' : 'jane@contoso.com' } as never;
				return (name in params ? params[name as string] : fallback) as never;
			});

			let caught: unknown;
			try {
				await readRows.execute.call(mockExecuteFunctions, [{ json: {} }, { json: {} }]);
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(NodeOperationError);
			expect((caught as NodeOperationError).message).toBe('The target ID is not valid');
			expect((caught as NodeOperationError).context.itemIndex).toBe(1);
			// Item 0 resolved and requested normally before item 1 failed validation.
			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});
	});
});
