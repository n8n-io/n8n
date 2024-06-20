import nock from 'nock';

import * as deleteDrive from '../../../../v2/actions/drive/deleteDrive.operation';

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

describe('test GoogleDriveV2: drive deleteDrive', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	it('should be called with', async () => {
		const nodeParameters = {
			resource: 'drive',
			operation: 'deleteDrive',
			driveId: {
				__rl: true,
				value: 'driveIDxxxxxx',
				mode: 'id',
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await deleteDrive.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/drive/v3/drives/driveIDxxxxxx',
		);
	});
});
