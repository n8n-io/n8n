import * as genericFunctions from '../../GenericFunctions';
import { GoogleDocs } from '../../GoogleDocs.node';
import { createLoadOptionsThis, docsNode } from '../helpers';

const googleApiRequestAllItemsMock =
	genericFunctions.googleApiRequestAllItems as jest.MockedFunction<
		typeof genericFunctions.googleApiRequestAllItems
	>;

jest.mock('../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequestAllItems: jest.fn(),
	};
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('GoogleDocs loadOptions.getFolders', () => {
	it('should list top level folders for My Drive', async () => {
		const node = new GoogleDocs();
		const driveId = 'myDrive';

		googleApiRequestAllItemsMock.mockResolvedValueOnce([
			{ id: 'folder-1', name: 'Folder A' },
			{ id: 'folder-2', name: 'Folder B' },
		]);

		const result = await node.methods.loadOptions.getFolders.call(
			createLoadOptionsThis({ driveId }, docsNode),
		);

		// First entry is root
		expect(result[0]).toEqual({ name: '/', value: 'default' });

		// Then mapped folders from API
		expect(result).toContainEqual({ name: 'Folder A', value: 'folder-1' });
		expect(result).toContainEqual({ name: 'Folder B', value: 'folder-2' });

		// Check googleApiRequestAllItems call and query
		expect(googleApiRequestAllItemsMock).toHaveBeenCalledTimes(1);

		const qsArg = googleApiRequestAllItemsMock.mock.calls[0][4] as Record<string, unknown>;

		expect(qsArg.q).toBe("mimeType = 'application/vnd.google-apps.folder' and 'root' in parents");
		expect(qsArg.includeItemsFromAllDrives).toBe(false);
		expect(qsArg.supportsAllDrives).toBe(false);
		expect(qsArg.spaces).toBe('drive');
		expect(qsArg.corpora).toBe('user');
	});

	it('should list folders with sharedWithMe filter when Shared with me drive is selected', async () => {
		const node = new GoogleDocs();
		const driveId = 'sharedWithMe';

		googleApiRequestAllItemsMock.mockResolvedValueOnce([]);

		await node.methods.loadOptions.getFolders.call(createLoadOptionsThis({ driveId }, docsNode));

		expect(googleApiRequestAllItemsMock).toHaveBeenCalledTimes(1);

		const qsArg = googleApiRequestAllItemsMock.mock.calls[0][4] as Record<string, unknown>;

		expect(qsArg.q).toBe("mimeType = 'application/vnd.google-apps.folder' and sharedWithMe = true");
		expect(qsArg.includeItemsFromAllDrives).toBe(false);
		expect(qsArg.supportsAllDrives).toBe(false);
		expect(qsArg.spaces).toBe('drive');
		expect(qsArg.corpora).toBe('user');
	});

	it('should list folders from shared drive', async () => {
		const node = new GoogleDocs();
		const driveId = '1A2B3C4D5E6F';

		googleApiRequestAllItemsMock.mockResolvedValueOnce([
			{ id: 'folder-1', name: 'Folder A' },
			{ id: 'folder-2', name: 'Folder B' },
		]);

		const result = await node.methods.loadOptions.getFolders.call(
			createLoadOptionsThis({ driveId }, docsNode),
		);

		// First entry is root
		expect(result[0]).toEqual({ name: '/', value: 'default' });

		// Then mapped folders from API
		expect(result).toContainEqual({ name: 'Folder A', value: 'folder-1' });
		expect(result).toContainEqual({ name: 'Folder B', value: 'folder-2' });

		expect(googleApiRequestAllItemsMock).toHaveBeenCalledTimes(1);

		const qsArg = googleApiRequestAllItemsMock.mock.calls[0][4] as Record<string, unknown>;

		expect(qsArg.q).toBe("mimeType = 'application/vnd.google-apps.folder'");
		expect(qsArg.includeItemsFromAllDrives).toBe(true);
		expect(qsArg.supportsAllDrives).toBe(true);
		expect(qsArg.spaces).toBe('drive');
		expect(qsArg.corpora).toBe('drive');
		expect(qsArg.driveId).toBe(driveId);
	});
});
