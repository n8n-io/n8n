import * as update from '../../../../v2/actions/drive/update.operation';
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

describe('test GoogleDriveV2: drive update', () => {
	it('should be called with', async () => {
		const nodeParameters = {
			resource: 'drive',
			operation: 'update',
			driveId: {
				__rl: true,
				value: 'sharedDriveIDxxxxx',
				mode: 'id',
			},
			options: {
				colorRgb: '#F4BEBE',
				name: 'newName',
				restrictions: {
					driveMembersOnly: true,
				},
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await update.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/drives/sharedDriveIDxxxxx',
			{ colorRgb: '#F4BEBE', name: 'newName', restrictions: { driveMembersOnly: true } },
		);
	});
});
