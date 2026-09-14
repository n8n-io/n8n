import * as deleteFolder from '../../../../v2/actions/folder/deleteFolder.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, driveNode } from '../helpers';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: vi.fn(async function () {
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
