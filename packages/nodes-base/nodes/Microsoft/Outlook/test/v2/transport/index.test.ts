import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getSubfolders } from '../../../v2/transport';

describe('MicrosoftOutlookV2 - getSubfolders', () => {
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockLoadOptionsFunctions.getCredentials.mockResolvedValue({});
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should not request childFolders when childFolderCount is 0', async () => {
		const folders = [
			{ id: 'folder1', displayName: 'Inbox', childFolderCount: 0 },
			{ id: 'folder2', displayName: 'Sent Items', childFolderCount: 0 },
		];

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders);

		expect(
			mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock,
		).not.toHaveBeenCalled();
		expect(result).toEqual(folders);
	});

	it('should paginate child folder requests using nextLink', async () => {
		const folders = [{ id: 'inbox', displayName: 'Inbox', childFolderCount: 2 }];

		(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock)
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
			mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock,
		).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{ id: 'inbox', displayName: 'Inbox', childFolderCount: 2 },
			{ id: 'sub1', displayName: 'Work', childFolderCount: 0 },
			{ id: 'sub2', displayName: 'Projects', childFolderCount: 0 },
		]);
	});

	it('should prefix nested subfolder displayNames with full parent path', async () => {
		const folders = [{ id: 'inbox', displayName: 'Inbox', childFolderCount: 1 }];

		(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock)
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

		(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValueOnce(
			{
				value: [{ id: 'work', displayName: 'Work', childFolderCount: 0 }],
			},
		);

		const result = await getSubfolders.call(mockLoadOptionsFunctions, folders);

		expect(result).toEqual([
			{ id: 'inbox', displayName: 'Inbox', childFolderCount: 1 },
			{ id: 'work', displayName: 'Work', childFolderCount: 0 },
		]);
	});
});
