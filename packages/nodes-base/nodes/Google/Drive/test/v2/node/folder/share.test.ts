import nock from 'nock';

import * as share from '../../../../v2/actions/folder/share.operation';

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

describe('test GoogleDriveV2: folder share', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	it('should be called with', async () => {
		const nodeParameters = {
			resource: 'folder',
			operation: 'share',
			folderNoRootId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 2',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			permissionsUi: {
				permissionsValues: {
					role: 'reader',
					type: 'anyone',
					allowFileDiscovery: true,
				},
			},
			options: {
				moveToNewOwnersRoot: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await share.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/files/folderIDxxxxxx/permissions',
			{ allowFileDiscovery: true, role: 'reader', type: 'anyone' },
			{ moveToNewOwnersRoot: true, supportsAllDrives: true },
		);
	});
});
