import * as share from '../../../../v2/actions/file/share.operation';
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

describe('test GoogleDriveV2: file share', () => {
	it('should be called with', async () => {
		const nodeParameters = {
			operation: 'share',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test.txt',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			permissionsUi: {
				permissionsValues: {
					role: 'owner',
					type: 'user',
					emailAddress: 'user@gmail.com',
				},
			},
			options: {
				emailMessage: 'some message',
				moveToNewOwnersRoot: true,
				sendNotificationEmail: true,
				transferOwnership: true,
				useDomainAdminAccess: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await share.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/files/fileIDxxxxxx/permissions',
			{ emailAddress: 'user@gmail.com', role: 'owner', type: 'user' },
			{
				emailMessage: 'some message',
				moveToNewOwnersRoot: true,
				sendNotificationEmail: true,
				supportsAllDrives: true,
				transferOwnership: true,
				useDomainAdminAccess: true,
			},
		);
	});
});
