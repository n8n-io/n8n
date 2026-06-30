import get from 'lodash/get';
import type {
	IExecuteFunctions,
	INode,
	IPollFunctions,
	IWorkflowMetadata,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	microsoftApiRequest,
	getPath,
	getOneDriveCredentialType,
	validateOneDriveFileName,
	validateResourceTargetId,
	getServicePrincipalResourceRoot,
	resolveDriveScopeRoot,
	driveEndpoint,
} from '../GenericFunctions';

describe('Microsoft OneDrive GenericFunctions', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;
	let mockRequestWithAuthentication: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn();
		mockRequestWithAuthentication = vi.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;

		mockNode = {
			id: 'test-node',
			name: 'Test OneDrive Node',
			type: 'n8n-nodes-base.microsoftOneDrive',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getWorkflow.mockReturnValue({
			id: 'test-workflow-id',
		} as IWorkflowMetadata);
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/v1.0/me/drive',
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

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/drive',
						json: true,
					}),
				);
			});
		});
	});

	describe('credential type selection', () => {
		beforeEach(() => {
			mockRequestOAuth2.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
			});
		});

		it('should use the generic microsoftOAuth2Api credential when selected', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			// dual-branch lock: the OAuth2 path must never reach requestWithAuthentication
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should use the microsoftOneDriveOAuth2Api credential when selected', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOneDriveOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
			);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
				expect.anything(),
			);
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should fall back to microsoftOneDriveOAuth2Api when authentication is not set', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
			);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
				expect.anything(),
			);
		});

		it('should fall back to microsoftOneDriveOAuth2Api when authentication is an empty string', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
			);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
				expect.anything(),
			);
		});
	});

	describe('getPath', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive/items/item-id-123',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/items/item-id-123',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/items/item-id-123',
						json: true,
					}),
				);
			});
		});

		describe('credential type selection', () => {
			it('should use the generic microsoftOAuth2Api credential when selected', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: { access_token: 'test-access-token' },
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			});
		});
	});

	describe('getOneDriveCredentialType context semantics', () => {
		const savedParameters = {}; // pre-existing node: no `authentication` persisted

		it('resolves the default credential in EXECUTE context (node)', () => {
			// signature: (name, itemIndex, fallbackValue, options) - see execute-context.ts
			const executeCtx = {
				getNodeParameter: (name: string, _itemIndex: number, fallbackValue?: unknown) =>
					get(savedParameters, name, fallbackValue),
			} as IExecuteFunctions;

			expect(getOneDriveCredentialType.call(executeCtx)).toBe('microsoftOneDriveOAuth2Api');
		});

		it('resolves the default credential in POLL context (trigger)', () => {
			// signature: (name, fallbackValue, options) - see node-execution-context.ts
			const pollCtx = {
				getNodeParameter: (name: string, fallbackValue?: unknown) =>
					get(savedParameters, name, fallbackValue),
			} as IPollFunctions;

			expect(getOneDriveCredentialType.call(pollCtx)).toBe('microsoftOneDriveOAuth2Api');
		});
	});

	describe('validateOneDriveFileName', () => {
		it('accepts a legal file name', () => {
			expect(() => validateOneDriveFileName(mockNode, 'report.txt', 0)).not.toThrow();
		});

		it.each([undefined, '', '   '])('rejects a missing or blank name (%p)', (name) => {
			expect(() => validateOneDriveFileName(mockNode, name, 0)).toThrow('File name must be set');
		});

		it('names the colon and suggests a colon-free timestamp format', () => {
			let caught: Error | undefined;
			try {
				validateOneDriveFileName(mockNode, 'report-2026-06-10T12:34:56.789Z.txt', 3);
			} catch (error) {
				caught = error as Error;
			}

			expect(caught?.message).toContain("contains characters that OneDrive doesn't allow");
			expect(caught?.message).toContain(':');
			expect((caught as { description?: string })?.description).toContain(
				"$now.toFormat('yyyy-MM-dd_HH-mm-ss')",
			);
		});

		it('names every disallowed character present', () => {
			let caught: Error | undefined;
			try {
				validateOneDriveFileName(mockNode, 'a:b/c?.txt', 0);
			} catch (error) {
				caught = error as Error;
			}

			expect(caught?.message).toContain(':');
			expect(caught?.message).toContain('/');
			expect(caught?.message).toContain('?');
		});

		it('omits the timestamp suggestion when the illegal name has no colon', () => {
			let caught: Error | undefined;
			try {
				validateOneDriveFileName(mockNode, 'bad*name?.txt', 0);
			} catch (error) {
				caught = error as Error;
			}

			expect(caught?.message).toContain("contains characters that OneDrive doesn't allow");
			expect((caught as { description?: string })?.description).not.toContain('$now.toFormat');
		});
	});

	describe('getServicePrincipalResourceRoot', () => {
		it('builds a pluralized /drives/{id} root (catches singular/plural mutation)', () => {
			expect(getServicePrincipalResourceRoot('drive', 'b!abc123', mockNode)).toBe(
				'/drives/b!abc123',
			);
		});

		it('encodes a user UPN exactly once (@ becomes %40, encoded a single time)', () => {
			// A space-bearing UPN is rejected by validation (see validateResourceTargetId),
			// so the encoding-once property is proven with the `@` separator instead.
			expect(getServicePrincipalResourceRoot('user', 'jane@contoso.com', mockNode)).toBe(
				'/users/jane%40contoso.com',
			);
		});

		it('trims surrounding whitespace before validating and encoding', () => {
			expect(getServicePrincipalResourceRoot('drive', '  b!abc123  ', mockNode)).toBe(
				'/drives/b!abc123',
			);
		});

		it('validates BEFORE encoding so `..` throws and is never encoded', () => {
			let caught: Error | undefined;
			try {
				getServicePrincipalResourceRoot('drive', '..', mockNode);
			} catch (error) {
				caught = error as Error;
			}
			expect(caught).toBeDefined();
			// the bad id is never reflected back, encoded or not
			expect(caught?.message).not.toContain('..');
			expect(caught?.message).not.toContain('%2E');
		});

		it('coerces a non-string id robustly via String(rawId ?? "") and stringifies it into the root', () => {
			// a number id (e.g. a poll fallback) must be coerced, validated, and used
			expect(getServicePrincipalResourceRoot('user', 12345 as unknown as string, mockNode)).toBe(
				'/users/12345',
			);
		});
	});

	describe('driveEndpoint', () => {
		it('returns a /drives/{id} root unchanged (already a drive)', () => {
			expect(driveEndpoint('/drives/b!abc')).toBe('/drives/b!abc');
		});

		it('appends /drive to a user root (default-drive navigation property)', () => {
			expect(driveEndpoint('/users/jane%40contoso.com')).toBe('/users/jane%40contoso.com/drive');
		});
	});

	describe('validateResourceTargetId', () => {
		it.each(['user', 'drive'])(
			'rejects empty / whitespace / dots-only for %s (common reject runs first)',
			(target) => {
				expect(() => validateResourceTargetId(target, '', mockNode)).toThrow();
				expect(() => validateResourceTargetId(target, '   ', mockNode)).toThrow();
				expect(() => validateResourceTargetId(target, '.', mockNode)).toThrow();
				expect(() => validateResourceTargetId(target, '..', mockNode)).toThrow();
				expect(() => validateResourceTargetId(target, '...', mockNode)).toThrow();
			},
		);

		it.each(['user', 'drive'])('rejects path separators / traversal for %s', (target) => {
			expect(() => validateResourceTargetId(target, 'a/b', mockNode)).toThrow();
			expect(() => validateResourceTargetId(target, 'a\\b', mockNode)).toThrow();
			expect(() => validateResourceTargetId(target, '../..', mockNode)).toThrow();
		});

		it('accepts a user GUID and a user UPN', () => {
			expect(() =>
				validateResourceTargetId('user', '11111111-1111-1111-1111-111111111111', mockNode),
			).not.toThrow();
			expect(() => validateResourceTargetId('user', 'jane@contoso.com', mockNode)).not.toThrow();
		});

		it('accepts a UPN containing "+" (sub-addressing)', () => {
			expect(() =>
				validateResourceTargetId('user', 'jane+test@contoso.com', mockNode),
			).not.toThrow();
		});

		it('rejects a drive-shaped id ("b!abc") as a user (the "!" is not a valid user id)', () => {
			expect(() => validateResourceTargetId('user', 'b!abc', mockNode)).toThrow();
		});

		it('accepts a drive id containing "!"', () => {
			expect(() => validateResourceTargetId('drive', 'b!abc-123_XYZ', mockNode)).not.toThrow();
		});

		it('throws a static message that never echoes the rejected id', () => {
			let caught: Error | undefined;
			try {
				validateResourceTargetId('user', 'evil/../value', mockNode);
			} catch (error) {
				caught = error as Error;
			}
			expect(caught).toBeDefined();
			expect(caught?.message).not.toContain('evil');
			expect(caught?.message).not.toContain('..');
		});
	});

	describe('microsoftApiRequest with Service Principal (driveScopeRoot)', () => {
		beforeEach(() => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			// driveScopeRoot is only ever threaded when SP is selected, so the
			// credential-type lookup must resolve to the SP credential too.
			mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) =>
				name === 'authentication' ? 'microsoftEntraServicePrincipalApi' : undefined,
			);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				accessToken: 'test-access-token',
				graphApiBaseUrl: '',
			});
		});

		it('routes a user-rooted request via requestWithAuthentication (NOT OAuth2)', async () => {
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/drive/items/x',
				{},
				{},
				undefined,
				{},
				{ json: true },
				'/users/jane%40contoso.com',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/items/x',
				}),
			);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('roots a drive request as /drives/{id}/items/x with no double /drive', async () => {
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'DELETE',
				'/drive/items/x',
				{},
				{},
				undefined,
				{},
				{ json: true },
				'/drives/b!abc',
			);

			// A /drives/{id} root IS already a drive — no extra `/drive` segment.
			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/drives/b!abc/items/x',
				}),
			);
			const calledUri = mockRequestWithAuthentication.mock.calls[0][1].uri as string;
			expect(calledUri).not.toContain('/drives/b!abc/drive');
		});

		it('preserves the :/path:/ upload shape under a user root (no double /drive)', async () => {
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'PUT',
				'/drive/items/parent:/file.txt:/content',
				Buffer.from('x'),
				{},
				undefined,
				{ 'Content-Type': 'text/plain' },
				{},
				'/users/jane',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/jane/drive/items/parent:/file.txt:/content',
				}),
			);
		});

		it('preserves the :/path:/ upload shape under a drive root (no double /drive)', async () => {
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'PUT',
				'/drive/items/parent:/file.txt:/content',
				Buffer.from('x'),
				{},
				undefined,
				{ 'Content-Type': 'text/plain' },
				{},
				'/drives/b!abc',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/drives/b!abc/items/parent:/file.txt:/content',
				}),
			);
		});

		it('uses an explicit absolute uri verbatim and never prefixes the scope root', async () => {
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'',
				{},
				{},
				'https://graph.microsoft.com/v1.0/some/absolute/deltaLink',
				{},
				{ json: true },
				'/users/jane',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/some/absolute/deltaLink',
				}),
			);
		});

		it('routes via requestWithAuthentication for an absolute uri with NO driveScopeRoot (trigger delta convention)', async () => {
			// This mirrors how the trigger calls transport (manual mode + the delta
			// paginator): an absolute, already-scoped `uri` and NO `driveScopeRoot`.
			// The helper must be chosen by credential type, not by `driveScopeRoot` —
			// otherwise the app-only credential wrongly falls into the OAuth2 helper.
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'',
				{},
				{},
				'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta',
				}),
			);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('honors a sovereign graphApiBaseUrl with a non-user (drive) root', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				accessToken: 'test-access-token',
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/drive/items/x',
				{},
				{},
				undefined,
				{},
				{ json: true },
				'/drives/b!abc',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.us/v1.0/drives/b!abc/items/x',
				}),
			);
		});

		it('throws an internal error when a scoped resource does not start with /drive', async () => {
			await expect(
				microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/users/x',
					{},
					{},
					undefined,
					{},
					{ json: true },
					'/users/jane',
				),
			).rejects.toThrow('must start with "/drive"');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('delegates to requestWithAuthentication once with no node-side retry, surfacing a rejection as NodeApiError', async () => {
			// This asserts only the node's delegation contract: it calls
			// requestWithAuthentication exactly once and adds no retry of its own. The
			// actual 401 token re-mint is core's job (it re-runs the credential's
			// preAuthentication) and is covered by the credential's own test in master —
			// not re-proven here.
			mockRequestWithAuthentication.mockRejectedValue(new Error('401'));

			const error = await microsoftApiRequest
				.call(
					mockExecuteFunctions,
					'GET',
					'/drive/items/x',
					{},
					{},
					undefined,
					{},
					{ json: true },
					'/users/jane',
				)
				.catch((e) => e);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(error.constructor.name).toBe('NodeApiError');
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});
	});

	describe('getPath under Service Principal', () => {
		it('routes via requestWithAuthentication with the scoped resource-form URL', async () => {
			mockRequestWithAuthentication.mockResolvedValue({
				name: 'folder',
				folder: {},
				parentReference: { path: '/drive/root:' },
			});
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				accessToken: 'test-access-token',
				graphApiBaseUrl: '',
			});
			// poll-shaped getNodeParameter: (name, fallback, options)
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name: string, fallback?: unknown) => {
					if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
					if (name === 'resourceTarget') return 'user';
					if (name === 'userTarget') return 'jane@contoso.com';
					return fallback as NodeParameterValueType;
				},
			);

			await getPath.call(mockExecuteFunctions, 'item-id-123');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/items/item-id-123',
				}),
			);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});
	});

	describe('resolveDriveScopeRoot', () => {
		it('returns undefined for OAuth2 credentials (no scope root)', () => {
			const ctx = {
				getNode: () => mockNode,
				getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) =>
					name === 'authentication' ? 'microsoftOneDriveOAuth2Api' : fallback,
			} as unknown as IExecuteFunctions;

			expect(resolveDriveScopeRoot.call(ctx, false)).toBeUndefined();
		});

		it('extracts the RLC id in EXECUTE context and returns the scoped root', () => {
			// execute-shaped: (name, itemIndex, fallback, options) — RLC returns extracted id
			const ctx = {
				getNode: () => mockNode,
				getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) => {
					if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
					if (name === 'resourceTarget') return 'user';
					if (name === 'userTarget') return 'jane@contoso.com';
					return fallback;
				},
			} as unknown as IExecuteFunctions;

			expect(resolveDriveScopeRoot.call(ctx, false)).toBe('/users/jane%40contoso.com');
		});

		it('extracts the RLC id in POLL context and returns the scoped root', () => {
			// poll-shaped: (name, fallback, options)
			const ctx = {
				getNode: () => mockNode,
				getNodeParameter: (name: string, fallback?: unknown) => {
					if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
					if (name === 'resourceTarget') return 'drive';
					if (name === 'driveTarget') return 'b!abc';
					return fallback;
				},
			} as unknown as IPollFunctions;

			expect(resolveDriveScopeRoot.call(ctx, true)).toBe('/drives/b!abc');
		});
	});
});
