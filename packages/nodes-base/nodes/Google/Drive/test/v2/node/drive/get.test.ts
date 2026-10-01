import * as get from '../../../../v2/actions/drive/get.operation';
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

describe('test GoogleDriveV2: drive get', () => {
	it('should be called with', async () => {
		const nodeParameters = {
			resource: 'drive',
			operation: 'get',
			driveId: {
				__rl: true,
				value: 'driveIDxxxxxx',
				mode: 'id',
			},
			options: {
				useDomainAdminAccess: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await get.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/drives/driveIDxxxxxx',
			{},
			{ useDomainAdminAccess: true },
		);
	});
});
