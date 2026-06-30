import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
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
			mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
				graphApiBaseUrl: '',
			});

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/user%40example.com/messages',
				}),
			);
		});

		it('should pass a GUID mailbox through verbatim (nothing to percent-encode)', async () => {
			setupSP({ mailbox: '11111111-1111-1111-1111-111111111111' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/users/11111111-1111-1111-1111-111111111111/messages',
				}),
			);
		});

		it('should target the sovereign cloud base for the SP mailbox', async () => {
			setupSP({ mailbox: 'user@example.com', graphApiBaseUrl: 'https://graph.microsoft.us' });

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages');

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

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages', {}, {}, nextLink);

			const callArgs = mockRequestWithAuthentication.mock.calls[0][1] as IDataObject;
			expect(callArgs.uri).toBe(nextLink);
			// the verbatim nextLink must not be double-prefixed
			expect(callArgs.uri).not.toContain('/users/user%40example.com/v1.0');
		});

		it('should throw a static error and make no request when the mailbox is empty', async () => {
			setupSP({ mailbox: '' });

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages'),
			).rejects.toThrow(NodeOperationError);
			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages'),
			).rejects.toThrow('A mailbox is required for the Service Principal');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should treat a whitespace-only mailbox as required and make no request', async () => {
			// resolveMailbox trims to '' before validateMailbox, so this hits the required path.
			setupSP({ mailbox: '   ' });

			await expect(
				microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/messages'),
			).rejects.toThrow('A mailbox is required for the Service Principal');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
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

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders);

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

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders);

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

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders, true);

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

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders);

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
