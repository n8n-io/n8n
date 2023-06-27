import nock from 'nock';

import * as download from '../../../../v2/actions/file/download.operation';

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

describe('test GoogleDriveV2: file download', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	it('shuold be called with', async () => {
		const nodeParameters = {
			operation: 'deleteFile',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test.txt',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			options: {
				deletePermanently: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await download.execute.call(fakeExecuteFunction, 0, { json: {} });

		expect(transport.googleApiRequest).toBeCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			{},
			{ fields: 'mimeType,name', supportsTeamDrives: true },
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			{},
			{ alt: 'media' },
			undefined,
			{ encoding: null, json: false, resolveWithFullResponse: true, useStream: true },
		);
	});
});
