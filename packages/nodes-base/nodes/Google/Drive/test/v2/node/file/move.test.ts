import type { IHttpRequestMethods } from 'n8n-workflow';

import * as move from '../../../../v2/actions/file/move.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, driveNode } from '../helpers';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: vi.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return {
					parents: ['parentFolderIDxxxxxx'],
				};
			}
			return {};
		}),
	};
});

describe('test GoogleDriveV2: file move', () => {
	it('should be called with', async () => {
		const nodeParameters = {
			operation: 'move',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test.txt',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			folderId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder1',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await move.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			undefined,
			{
				corpora: 'allDrives',
				fields: 'parents',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
				supportsAllDrives: true,
			},
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/fileIDxxxxxx',
			undefined,
			{
				addParents: 'folderIDxxxxxx',
				removeParents: 'parentFolderIDxxxxxx',
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
				supportsAllDrives: true,
			},
		);
	});
});
