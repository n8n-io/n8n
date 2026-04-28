import * as copy from '../../../../v2/actions/file/copy.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, driveNode } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async function () {
			return {};
		}),
	};
});

describe('test GoogleDriveV2: file copy', () => {
	beforeEach(() => {
		jest.mocked(transport.googleApiRequest).mockReset();
	});

	it('should be called with', async () => {
		jest.mocked(transport.googleApiRequest).mockResolvedValue({});

		const nodeParameters = {
			operation: 'copy',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test01.png',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			name: 'copyImage.png',
			sameFolder: false,
			folderId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 3',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			options: {
				copyRequiresWriterPermission: true,
				description: 'image copy',
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await copy.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toBeCalledWith(
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: true,
				description: 'image copy',
				name: 'copyImage.png',
				parents: ['folderIDxxxxxx'],
			},
			{
				supportsAllDrives: true,
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
			},
		);
	});

	it('should fetch file name from Drive when defaulting copy name in id mode', async () => {
		jest
			.mocked(transport.googleApiRequest)
			.mockResolvedValueOnce({ name: 'MyDoc.gsheet' })
			.mockResolvedValueOnce({});

		const nodeParameters = {
			operation: 'copy',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'id',
			},
			name: '',
			sameFolder: true,
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await copy.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			undefined,
			{
				supportsAllDrives: true,
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
				fields: 'name',
			},
		);
		expect(transport.googleApiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: false,
				parents: [],
				name: 'Copy of MyDoc.gsheet',
			},
			{
				supportsAllDrives: true,
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
			},
		);
	});
});
