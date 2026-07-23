import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { searchFolders } from '../../../v2/methods/listSearch';

// Drives the REAL searchFolders through the REAL transport (only
// requestWithAuthentication mocked) to prove the resource-locator pickers populate
// for the chosen mailbox under the Service Principal credential — the existing
// listSearch tests mock the transport and cannot see the /users/{mailbox} rewrite.
describe('MicrosoftOutlookV2 - listSearch Service Principal mailbox rewrite', () => {
	let mockLoadOptionsFunctions: Mocked<ILoadOptionsFunctions>;
	let mockRequestWithAuthentication: Mock;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockRequestWithAuthentication = vi.fn().mockResolvedValue({
			value: [{ id: 'folder-inbox', displayName: 'Inbox', childFolderCount: 0 }],
		});
		mockLoadOptionsFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;

		const mockNode: INode = {
			id: 'test-node',
			name: 'Microsoft Outlook',
			type: 'n8n-nodes-base.microsoftOutlook',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNodeParameter.mockImplementation(((name: string) => {
			if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
			if (name === 'mailbox') return 'user@example.com';
			return undefined;
		}) as unknown as ILoadOptionsFunctions['getNodeParameter']);
		mockLoadOptionsFunctions.getCredentials.mockResolvedValue({
			accessToken: 'test-access-token',
			graphApiBaseUrl: 'https://graph.microsoft.com',
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('lists folders for the chosen mailbox via /users/{encoded-mailbox}/mailFolders', async () => {
		const result = await searchFolders.call(mockLoadOptionsFunctions);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftEntraServicePrincipalApi',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://graph.microsoft.com/v1.0/users/user%40example.com/mailFolders',
			}),
		);
		expect(result.results).toEqual([
			expect.objectContaining({ name: 'Inbox', value: 'folder-inbox' }),
		]);
	});

	it('does not call the API and surfaces the static error when the mailbox is empty', async () => {
		mockLoadOptionsFunctions.getNodeParameter.mockImplementation(((name: string) => {
			if (name === 'authentication') return 'microsoftEntraServicePrincipalApi';
			if (name === 'mailbox') return '';
			return undefined;
		}) as unknown as ILoadOptionsFunctions['getNodeParameter']);

		await expect(searchFolders.call(mockLoadOptionsFunctions)).rejects.toThrow(
			'A mailbox is required for the Service Principal',
		);
		expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
