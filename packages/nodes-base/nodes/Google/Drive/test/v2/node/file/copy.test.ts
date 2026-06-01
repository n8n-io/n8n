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

const googleApiRequestMock = transport.googleApiRequest as jest.Mock;

const metadataQs = { fields: 'name', supportsAllDrives: true };

const copyQs = {
	supportsAllDrives: true,
	corpora: 'allDrives',
	includeItemsFromAllDrives: true,
	spaces: 'appDataFolder, drive',
};

describe('test GoogleDriveV2: file copy', () => {
	beforeEach(() => {
		googleApiRequestMock.mockReset();
		googleApiRequestMock.mockResolvedValue({});
	});

	it('uses the user-provided name in list mode', async () => {
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

		expect(googleApiRequestMock).toHaveBeenCalledTimes(1);
		expect(googleApiRequestMock).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: true,
				description: 'image copy',
				name: 'copyImage.png',
				parents: ['folderIDxxxxxx'],
			},
			copyQs,
		);
	});

	it('uses cachedResultName when name is empty in list mode (no metadata fetch)', async () => {
		const nodeParameters = {
			operation: 'copy',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test01.png',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			name: '',
			sameFolder: true,
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await copy.execute.call(fakeExecuteFunction, 0);

		expect(googleApiRequestMock).toHaveBeenCalledTimes(1);
		expect(googleApiRequestMock).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: false,
				name: 'Copy of test01.png',
				parents: [],
			},
			copyQs,
		);
	});

	it('fetches original name via metadata when name is empty in id mode', async () => {
		googleApiRequestMock.mockResolvedValueOnce({ name: 'original.png' }).mockResolvedValueOnce({});

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

		expect(googleApiRequestMock).toHaveBeenCalledTimes(2);
		expect(googleApiRequestMock).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			{},
			metadataQs,
		);
		expect(googleApiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: false,
				name: 'Copy of original.png',
				parents: [],
			},
			copyQs,
		);
	});

	it('fetches original name via metadata when name is empty in url mode', async () => {
		googleApiRequestMock.mockResolvedValueOnce({ name: 'from-url.pdf' }).mockResolvedValueOnce({});

		const nodeParameters = {
			operation: 'copy',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'url',
			},
			name: '',
			sameFolder: true,
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await copy.execute.call(fakeExecuteFunction, 0);

		expect(googleApiRequestMock).toHaveBeenCalledTimes(2);
		expect(googleApiRequestMock).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			{},
			metadataQs,
		);
		expect(googleApiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: false,
				name: 'Copy of from-url.pdf',
				parents: [],
			},
			copyQs,
		);
	});

	it('does not fetch metadata when name is provided in id mode', async () => {
		const nodeParameters = {
			operation: 'copy',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'id',
			},
			name: 'explicit.png',
			sameFolder: true,
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await copy.execute.call(fakeExecuteFunction, 0);

		expect(googleApiRequestMock).toHaveBeenCalledTimes(1);
		expect(googleApiRequestMock).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/files/fileIDxxxxxx/copy',
			{
				copyRequiresWriterPermission: false,
				name: 'explicit.png',
				parents: [],
			},
			copyQs,
		);
	});

	it('omits name when metadata returns no name', async () => {
		googleApiRequestMock.mockResolvedValueOnce({}).mockResolvedValueOnce({});

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

		expect(googleApiRequestMock).toHaveBeenCalledTimes(2);
		const copyCall = googleApiRequestMock.mock.calls[1] as [
			string,
			string,
			Record<string, unknown>,
			unknown,
		];
		expect(copyCall[0]).toBe('POST');
		expect(copyCall[1]).toBe('/drive/v3/files/fileIDxxxxxx/copy');
		const body = copyCall[2];
		expect(body).not.toHaveProperty('name');
		expect(JSON.stringify(body)).not.toContain('undefined');
	});
});
