import nock from 'nock';

import * as create from '../../../../v2/actions/drive/create.operation';

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

jest.mock('uuid', () => {
	const originalModule = jest.requireActual('uuid');
	return {
		...originalModule,
		v4: jest.fn(function () {
			return '430c0ca1-2498-472c-9d43-da0163839823';
		}),
	};
});

describe('test GoogleDriveV2: drive create', () => {
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
			name: 'newDrive',
			options: {
				capabilities: {
					canComment: true,
					canRename: true,
					canTrashChildren: true,
				},
				colorRgb: '#451AD3',
				hidden: false,
				restrictions: {
					driveMembersOnly: true,
				},
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await create.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/v3/drives',
			{
				capabilities: { canComment: true, canRename: true, canTrashChildren: true },
				colorRgb: '#451AD3',
				hidden: false,
				name: 'newDrive',
				restrictions: { driveMembersOnly: true },
			},
			{ requestId: '430c0ca1-2498-472c-9d43-da0163839823' },
		);
	});
});
