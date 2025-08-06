import * as deleteFolder from '../../../../v2/actions/folder/deleteFolder.operation';
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

describe('test GoogleDriveV2: folder deleteFolder', () => {
	it('should be called with PATCH', async () => {
		const nodeParameters = {
			resource: 'folder',
			operation: 'deleteFolder',
			folderNoRootId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 2',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await deleteFolder.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/folderIDxxxxxx',
			{ trashed: true },
			{ supportsAllDrives: true },
		);
	});

	it('should be called with DELETE', async () => {
		const nodeParameters = {
			resource: 'folder',
			operation: 'deleteFolder',
			folderNoRootId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 2',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			options: { deletePermanently: true },
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await deleteFolder.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/drive/v3/files/folderIDxxxxxx',
			undefined,
			{ supportsAllDrives: true },
		);
	});
});
