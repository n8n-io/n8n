import * as create from '../../../../v2/actions/folder/create.operation';
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

describe('test GoogleDriveV2: folder create', () => {
	it('should be called with', async () => {
		const nodeParameters = {
			resource: 'folder',
			name: 'testFolder 2',
			folderId: {
				__rl: true,
				value: 'root',
				mode: 'list',
				cachedResultName: 'root',
				cachedResultUrl: 'https://drive.google.com/drive',
			},
			options: {
				folderColorRgb: '#167D08',
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await create.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/files',
			{
				folderColorRgb: '#167D08',
				mimeType: 'application/vnd.google-apps.folder',
				name: 'testFolder 2',
				parents: ['root'],
			},
			{
				fields: undefined,
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
				spaces: 'appDataFolder, drive',
				corpora: 'allDrives',
			},
		);
	});
});
