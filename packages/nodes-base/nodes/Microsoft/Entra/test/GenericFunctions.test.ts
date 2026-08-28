import { mockDeep } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiPaginateRequest,
	validateEntraGroupId,
	validateEntraUserId,
	validateGroupPreSend,
	validateUserPreSend,
} from '../GenericFunctions';
import type { Mock, Mocked } from 'vitest';

describe('Microsoft Entra GenericFunctions', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestWithAuthentication: Mock;
	let mockRequestWithAuthenticationPaginated: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestWithAuthentication = vi.fn();
		mockRequestWithAuthenticationPaginated = vi.fn();
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
		mockExecuteFunctions.getCredentials =
			vi.fn() as unknown as typeof mockExecuteFunctions.getCredentials;
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

	describe('same-origin URL override', () => {
		beforeEach(() => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: {
					access_token: 'test-access-token',
				},
				graphApiBaseUrl: 'https://graph.microsoft.com',
			});
		});

		it('microsoftApiRequest keeps a URL override on the credential host', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ value: [] });

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/groups',
				{},
				undefined,
				undefined,
				'https://graph.microsoft.com/v1.0/groups?$skiptoken=abc',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraOAuth2Api',
				expect.objectContaining({
					url: 'https://graph.microsoft.com/v1.0/groups?$skiptoken=abc',
				}),
			);
		});

		it('microsoftApiPaginateRequest keeps a URL override on the credential host', async () => {
			mockRequestWithAuthenticationPaginated.mockResolvedValue([{ body: { value: [] } }]);

			await microsoftApiPaginateRequest.call(
				mockExecuteFunctions,
				'GET',
				'/groups',
				{},
				undefined,
				undefined,
				'https://graph.microsoft.com/v1.0/groups?$skiptoken=abc',
			);

			expect(mockRequestWithAuthenticationPaginated).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/groups?$skiptoken=abc',
				}),
				0,
				expect.any(Object),
				'microsoftEntraOAuth2Api',
			);
		});

		it.each([
			['another host', 'https://not-graph.example.com/v1.0/groups'],
			['a userinfo prefix', 'https://graph.microsoft.com@not-graph.example.com/v1.0/groups'],
			['a plain-text scheme', 'http://graph.microsoft.com/v1.0/groups'],
			['a lookalike host', 'https://graph.microsoft.com.not-graph.example.com/v1.0/groups'],
			['a scheme-relative URL', '//not-graph.example.com/v1.0/groups'],
			['a URL that cannot be parsed', 'not a url'],
		])('microsoftApiRequest rejects a URL override with %s', async (_label, url) => {
			await expect(
				microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/groups',
					{},
					undefined,
					undefined,
					url,
				),
			).rejects.toThrow('Refusing to send credentials to an unexpected host');

			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('microsoftApiRequest keeps an explicit default port on the credential host', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ value: [] });

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/groups',
				{},
				undefined,
				undefined,
				'https://graph.microsoft.com:443/v1.0/groups',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalled();
		});

		it('microsoftApiRequest rejects a base URL that is not a full URL', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
				graphApiBaseUrl: 'graph.microsoft.com',
			});

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/groups'),
			).rejects.toThrow('The Graph API base URL is not a valid URL');

			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('microsoftApiPaginateRequest rejects a URL override on another host', async () => {
			await expect(
				microsoftApiPaginateRequest.call(
					mockExecuteFunctions,
					'GET',
					'/groups',
					{},
					undefined,
					undefined,
					'https://not-graph.example.com/v1.0/groups',
				),
			).rejects.toThrow('Refusing to send credentials to an unexpected host');

			expect(mockRequestWithAuthenticationPaginated).not.toHaveBeenCalled();
		});
	});

	// The shared `validateUserTargetId` table in nodes/Microsoft/test covers the accepted and
	// rejected UPN alphabet, so these only cover what Entra adds on top of it.
	describe('validateEntraUserId', () => {
		it.each([
			['a GUID', '02bd9fd6-8f93-4758-87c3-1fb73740a315'],
			['a UPN', 'jane@contoso.com'],
			['a guest UPN', 'user_contoso.com#EXT#@tenant.onmicrosoft.com'],
		])('accepts %s', (_label, id) => {
			expect(() => validateEntraUserId(id, mockNode)).not.toThrow();
		});

		it.each([
			['a GUID with surrounding spaces', ' 02bd9fd6-8f93-4758-87c3-1fb73740a315 '],
			['a UPN with a trailing space', 'jane@contoso.com '],
			['a UPN with a percent-encoded at sign', 'jane%40contoso.com'],
		])('rejects %s', (_label, id) => {
			expect(() => validateEntraUserId(id, mockNode)).toThrow(NodeOperationError);
		});

		it('reports an empty value as empty', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateEntraUserId('', mockNode);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The user is empty');
			expect(caught?.description).toBe(
				'Select a user from the list, or set the ID. The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315, or a user principal name e.g. jane@contoso.com.',
			);
		});

		it('reports a dots-only value without the UPN hint', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateEntraUserId('..', mockNode);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The user ID is invalid');
			expect(caught?.description).toBe(
				'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315.',
			);
		});

		it('reports an unrecognised value with the UPN hint', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateEntraUserId('jane', mockNode);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The user ID is invalid');
			expect(caught?.description).toBe(
				'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315, or a user principal name e.g. jane@contoso.com.',
			);
		});
	});

	describe('validateEntraGroupId', () => {
		it.each([
			['a lowercase GUID', 'a8eb60e3-0145-4d7e-85ef-c6259784761b'],
			['an uppercase GUID', 'A8EB60E3-0145-4D7E-85EF-C6259784761B'],
		])('accepts %s', (_label, id) => {
			expect(() => validateEntraGroupId(id, mockNode)).not.toThrow();
		});

		it.each([
			['a UPN', 'jane@contoso.com'],
			['a mail nickname', 'sales-team'],
			['a GUID with surrounding spaces', ' a8eb60e3-0145-4d7e-85ef-c6259784761b '],
			['an empty value', ''],
			['two dots', '..'],
			['a forward slash', 'a8eb60e3-0145-4d7e-85ef-c6259784761b/members'],
			['a question mark', 'a8eb60e3-0145-4d7e-85ef-c6259784761b?x=1'],
			['a hash', 'a8eb60e3-0145-4d7e-85ef-c6259784761b#x'],
			['a percent-encoded dot pair', '%2e%2e'],
		])('rejects %s', (_label, id) => {
			expect(() => validateEntraGroupId(id, mockNode)).toThrow(NodeOperationError);
		});

		it('reports an empty value as empty', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateEntraGroupId('', mockNode);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The group is empty');
			expect(caught?.description).toBe(
				'Select a group from the list, or set the ID. The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315.',
			);
		});

		it('tells the user that a group is addressed by object ID', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateEntraGroupId('sales-team', mockNode);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The group ID is invalid');
			expect(caught?.description).toBe(
				'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315. Groups are addressed by object ID, not by name or email address.',
			);
		});
	});

	describe.each([
		['validateUserPreSend', validateUserPreSend, 'user', '87d349ed-44d7-43e1-9a83-5f2406dee5bd'],
		['validateGroupPreSend', validateGroupPreSend, 'group', 'a8eb60e3-0145-4d7e-85ef-c6259784761b'],
	])('%s', (_label, preSend, parameterName, validId) => {
		const requestOptions = { url: 'https://graph.microsoft.com/v1.0/users' } as IHttpRequestOptions;

		const context = (stored: unknown, extracted: unknown) => {
			const single = mockDeep<IExecuteSingleFunctions>();
			single.getNode.mockReturnValue(mockNode);
			single.getNodeParameter.mockImplementation(((
				name: string,
				_fallbackValue: unknown,
				options?: { extractValue?: boolean },
			) => {
				if (name !== parameterName) return undefined;
				return options?.extractValue ? extracted : stored;
			}) as never);
			return single;
		};

		it('passes the request options through for a valid ID', async () => {
			const single = context({ __rl: true, mode: 'id', value: validId }, validId);

			await expect(preSend.call(single, requestOptions)).resolves.toBe(requestOptions);
		});

		it('throws for an ID containing a slash', async () => {
			const single = context(
				{ __rl: true, mode: 'id', value: `${validId}/members` },
				`${validId}/members`,
			);

			await expect(preSend.call(single, requestOptions)).rejects.toThrow(NodeOperationError);
		});

		it('throws when the stored value carries an extraction rule', async () => {
			const single = context({ __rl: true, mode: 'id', value: validId, __regex: '(.*)' }, validId);

			let caught: NodeOperationError | undefined;
			try {
				await preSend.call(single, requestOptions);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe(`The ${parameterName} ID is invalid`);
			expect(caught?.description).toBe(
				'Remove the ID extraction rule from this field and set the ID directly.',
			);
		});
	});
});
