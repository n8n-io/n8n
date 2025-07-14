import * as update from '../../../../v2/actions/file/update.operation';
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

describe('test GoogleDriveV2: file update', () => {
	it('should be called with', async () => {
		const nodeParameters = {
			operation: 'update',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test.txt',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			newUpdatedFileName: 'test2.txt',
			options: {
				keepRevisionForever: true,
				ocrLanguage: 'en',
				useContentAsIndexableText: true,
				fields: ['hasThumbnail', 'starred'],
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await update.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/fileIDxxxxxx',
			{ name: 'test2.txt' },
			{
				fields: 'hasThumbnail, starred',
				keepRevisionForever: true,
				ocrLanguage: 'en',
				supportsAllDrives: true,
				useContentAsIndexableText: true,
			},
		);
	});
});
