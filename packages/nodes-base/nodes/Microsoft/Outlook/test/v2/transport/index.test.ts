import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	downloadAttachments,
	getMimeContent,
	getOutlookCredentialType,
	getSubfolders,
	microsoftApiRequest,
} from '../../../v2/transport';

describe('MicrosoftOutlookV2 - microsoftApiRequest', () => {
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

	describe('graphApiBaseUrl from credentials (OAuth2 /me)', () => {
		it('should use base URL from credentials', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

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
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
				graphApiBaseUrl: '',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/me/messages',
				}),
			);
		});

		it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/me/messages',
				}),
			);
		});

		it('should strip a single trailing slash from base URL', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.com/',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/me/messages',
				}),
			);
		});

		it('should strip multiple trailing slashes from base URL', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.com///',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/me/messages',
				}),
			);
		});

		it('should use US Government cloud endpoint', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.us/v1.0/me/messages',
				}),
			);
		});

		it('should use US Government DOD cloud endpoint', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://dod-graph.microsoft.us',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://dod-graph.microsoft.us/v1.0/me/messages',
				}),
			);
		});

		it('should use China cloud endpoint', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/messages',
				}),
			);
		});
	});

	describe('credential type resolution', () => {
		it('should use microsoftOutlookOAuth2Api when authentication is not set (backward compatibility)', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);
			mockExecuteFunctions.getCredentials.mockResolvedValue({});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOutlookOAuth2Api');
			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({ uri: 'https://graph.microsoft.com/v1.0/me/messages' }),
			);
		});

		it('should route through microsoftOAuth2Api when the generic credential is selected', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
			mockExecuteFunctions.getCredentials.mockResolvedValue({});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: 'https://graph.microsoft.com/v1.0/me/messages' }),
			);
			// generic OAuth2 must never reach the Service Principal credential
			expect(mockRequestWithAuthentication).not.toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.anything(),
			);
		});
	});

	describe('OAuth2 shared mailbox', () => {
		it('should target /users/{userPrincipalName} when useShared is set', async () => {
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOutlookOAuth2Api');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				useShared: true,
				userPrincipalName: 'shared@example.com',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOutlookOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/shared@example.com/messages',
				}),
			);
			// shared-mailbox OAuth2 must never reach the Service Principal credential
			expect(mockRequestWithAuthentication).not.toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.anything(),
			);
		});
	});

	describe('Service Principal (app-only)', () => {
		const setupSP = (
			overrides: {
				mailbox?: string | { __rl: true; mode: string; value: string };
				graphApiBaseUrl?: string;
			} = {},
		) => {
			const { mailbox = 'user@example.com', graphApiBaseUrl = '' } = overrides;
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
				if (name === 'mailbox') return mailbox;
				return undefined;
			});
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				accessToken: 'test-access-token',
				graphApiBaseUrl,
			});
		};

		it('should target /users/{encoded-mailbox} and resolve the SP credential', async () => {
			setupSP({ mailbox: 'user@example.com' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
			);
			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					method: 'GET',
					// @ is encoded exactly once: user@example.com -> user%40example.com
					uri: 'https://graph.microsoft.com/v1.0/users/user%40example.com/messages',
				}),
			);
		});

		it('should extract the id from an id-mode resource locator object and encode it', async () => {
			// Production reads the raw RLC object (not a bare string) and takes .value;
			// this covers the isResourceLocatorValue(raw) ? raw.value branch directly.
			setupSP({ mailbox: { __rl: true, mode: 'id', value: 'user@example.com' } });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/user%40example.com/messages',
				}),
			);
		});

		it('should pass a GUID mailbox through verbatim (nothing to percent-encode)', async () => {
			setupSP({ mailbox: '11111111-1111-1111-1111-111111111111' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/11111111-1111-1111-1111-111111111111/messages',
				}),
			);
		});

		it('should carry a B2B guest (#EXT#) mailbox end-to-end into an encoded /users/{id} uri', async () => {
			setupSP({ mailbox: 'user_contoso.com#EXT#@tenant.onmicrosoft.com' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/user_contoso.com%23EXT%23%40tenant.onmicrosoft.com/messages',
				}),
			);
		});

		it('should carry a "^"/"!" mailbox end-to-end into an encoded /users/{id} uri', async () => {
			setupSP({ mailbox: 'joe^smith@contoso.com' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/joe%5Esmith%40contoso.com/messages',
				}),
			);
		});

		it('should target the sovereign cloud base for the SP mailbox', async () => {
			setupSP({ mailbox: 'user@example.com', graphApiBaseUrl: 'https://graph.microsoft.us' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.us/v1.0/users/user%40example.com/messages',
				}),
			);
		});

		it('should use an explicit nextLink uri verbatim, not re-prefixed with /users/{mailbox}', async () => {
			setupSP({ mailbox: 'user@example.com' });
			const nextLink =
				'https://graph.microsoft.com/v1.0/users/user%40example.com/messages?$skip=10&$top=10';

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0, {}, {}, nextLink);

			const callArgs = mockRequestWithAuthentication.mock.calls[0][1] as IDataObject;
			expect(callArgs.uri).toBe(nextLink);
			// the verbatim nextLink must not be double-prefixed
			expect(callArgs.uri).not.toContain('/users/user%40example.com/v1.0');
		});

		it('should throw a static error and make no request when the mailbox is empty', async () => {
			setupSP({ mailbox: '' });

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0),
			).rejects.toThrow(NodeOperationError);
			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0),
			).rejects.toThrow('A mailbox is required for the Service Principal');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should treat a whitespace-only mailbox as required and make no request', async () => {
			// resolveMailbox trims to '' before validateMailbox, so this hits the required path.
			setupSP({ mailbox: '   ' });

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0),
			).rejects.toThrow('A mailbox is required for the Service Principal');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should reject a malformed (non-empty) mailbox and make no request', async () => {
			// A bare host is a plausible-looking string but not a GUID/UPN, so it must be
			// rejected before any request is issued — symmetric with the empty-mailbox case.
			setupSP({ mailbox: 'contoso.com' });

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', 0),
			).rejects.toThrow('The mailbox is not valid');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		// The mailbox RLC accepts expressions, so execute call sites pass the loop index
		// and the transport must read the mailbox at exactly that index. Reuses setupSP
		// and only swaps in an index-aware mailbox read.
		const setupSPPerItem = () => {
			setupSP();
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name: string, itemIndex?: number) => {
					if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
					if (name === 'mailbox')
						return itemIndex === 1 ? 'user2@example.com' : 'user1@example.com';
					return undefined;
				},
			);
		};

		it('should resolve the mailbox at the passed itemIndex', async () => {
			setupSPPerItem();

			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/messages',
				0,
				{},
				{},
				undefined,
				{},
				{ json: true },
			);
			await microsoftApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/messages',
				1,
				{},
				{},
				undefined,
				{},
				{ json: true },
			);

			expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
				1,
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/user1%40example.com/messages',
				}),
			);
			expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/user2%40example.com/messages',
				}),
			);
		});

		it('should attribute a Graph error to the passed itemIndex (prepareApiError path)', async () => {
			setupSP();
			// "bad request" message + parseable description route the error through
			// prepareApiError, which must receive the forwarded index.
			mockRequestWithAuthentication.mockRejectedValue(
				Object.assign(new Error('bad request'), {
					description: '400 - {"error":{"code":"ErrorInvalidRequest","message":"broken"}} - broken',
				}),
			);

			let caught: unknown;
			try {
				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/messages',
					2,
					{},
					{},
					undefined,
					{},
					{ json: true },
				);
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(NodeApiError);
			expect((caught as NodeApiError).context.itemIndex).toBe(2);
		});

		it('should download attachments from the mailbox at the passed itemIndex', async () => {
			setupSPPerItem();
			mockRequestWithAuthentication
				.mockResolvedValueOnce({
					value: [{ id: 'att1', name: 'file.txt', contentType: 'text/plain' }],
				})
				.mockResolvedValueOnce({ body: 'DATA', headers: {} });

			await downloadAttachments.call(
				mockExecuteFunctions,
				{ id: 'MSG1', hasAttachments: true },
				'attachment_',
				1,
			);

			const uris = mockRequestWithAuthentication.mock.calls.map(
				(call) => (call[1] as IDataObject).uri,
			);
			expect(uris).toEqual([
				'https://graph.microsoft.com/v1.0/users/user2%40example.com/messages/MSG1/attachments',
				'https://graph.microsoft.com/v1.0/users/user2%40example.com/messages/MSG1/attachments/att1/$value',
			]);
		});

		it('should fetch MIME content from the mailbox at the passed itemIndex', async () => {
			setupSPPerItem();
			mockRequestWithAuthentication.mockResolvedValue({
				body: 'MIME',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { 'content-type': 'message/rfc822' },
			});

			await getMimeContent.call(mockExecuteFunctions, 'MSG1', 'data', 1);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/user2%40example.com/messages/MSG1/$value',
				}),
			);
		});
	});
});

describe('MicrosoftOutlookV2 - getSubfolders', () => {
	let mockLoadOptionsFunctions: Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockLoadOptionsFunctions.getCredentials.mockResolvedValue({});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should not request childFolders when childFolderCount is 0', async () => {
		const folders = [
			{ id: 'folder1', displayName: 'Inbox', childFolderCount: 0 },
			{ id: 'folder2', displayName: 'Sent Items', childFolderCount: 0 },
		];

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders, 0);

		expect(
			mockLoadOptionsFunctions.helpers.requestWithAuthentication as Mock,
		).not.toHaveBeenCalled();
		expect(result).toEqual(folders);
	});

	it('should paginate child folder requests using nextLink', async () => {
		const folders = [{ id: 'inbox', displayName: 'Inbox', childFolderCount: 2 }];

		(mockLoadOptionsFunctions.helpers.requestWithAuthentication as Mock)
			.mockResolvedValueOnce({
				value: [{ id: 'sub1', displayName: 'Work', childFolderCount: 0 }],
				'@odata.nextLink':
					'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/childFolders?$skip=1',
			})
			.mockResolvedValueOnce({
				value: [{ id: 'sub2', displayName: 'Projects', childFolderCount: 0 }],
			});

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders, 0);

		expect(
			mockLoadOptionsFunctions.helpers.requestWithAuthentication as Mock,
		).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{ id: 'inbox', displayName: 'Inbox', childFolderCount: 2 },
			{ id: 'sub1', displayName: 'Work', childFolderCount: 0 },
			{ id: 'sub2', displayName: 'Projects', childFolderCount: 0 },
		]);
	});

	it('should prefix nested subfolder displayNames with full parent path', async () => {
		const folders = [{ id: 'inbox', displayName: 'Inbox', childFolderCount: 1 }];

		(mockLoadOptionsFunctions.helpers.requestWithAuthentication as Mock)
			.mockResolvedValueOnce({
				value: [{ id: 'work', displayName: 'Work', childFolderCount: 1 }],
			})
			.mockResolvedValueOnce({
				value: [{ id: 'q2', displayName: 'Q2', childFolderCount: 0 }],
			});

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders, 0, true);

		expect(result).toEqual([
			{ id: 'inbox', displayName: 'Inbox', childFolderCount: 1 },
			{ id: 'work', displayName: 'Inbox/Work', childFolderCount: 1 },
			{ id: 'q2', displayName: 'Inbox/Work/Q2', childFolderCount: 0 },
		]);
	});

	it('should return bare subfolder displayNames when addPathToDisplayName is false', async () => {
		const folders = [{ id: 'inbox', displayName: 'Inbox', childFolderCount: 1 }];

		(mockLoadOptionsFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValueOnce({
			value: [{ id: 'work', displayName: 'Work', childFolderCount: 0 }],
		});

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders, 0);

		expect(result).toEqual([
			{ id: 'inbox', displayName: 'Inbox', childFolderCount: 1 },
			{ id: 'work', displayName: 'Work', childFolderCount: 0 },
		]);
	});
});

describe('MicrosoftOutlookV2 - getOutlookCredentialType', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	});

	it('should return the selected credential when authentication is set to the generic credential', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

		const result = getOutlookCredentialType.call(mockExecuteFunctions);

		expect(result).toBe('microsoftOAuth2Api');
	});

	it('should return the Service Principal credential when selected', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');

		const result = getOutlookCredentialType.call(mockExecuteFunctions);

		expect(result).toBe('microsoftEntraServicePrincipalApi');
	});

	it('should fall back to microsoftOutlookOAuth2Api when authentication is not set', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

		const result = getOutlookCredentialType.call(mockExecuteFunctions);

		expect(result).toBe('microsoftOutlookOAuth2Api');
	});

	it('should fall back to microsoftOutlookOAuth2Api when authentication is an empty string', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('');

		const result = getOutlookCredentialType.call(mockExecuteFunctions);

		expect(result).toBe('microsoftOutlookOAuth2Api');
	});
});
