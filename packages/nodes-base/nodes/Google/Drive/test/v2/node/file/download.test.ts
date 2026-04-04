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
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should be called with', async () => {
		const nodeParameters = {
			operation: 'download',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
				cachedResultName: 'test.txt',
				cachedResultUrl: 'https://drive.google.com/file/d/fileIDxxxxxx/view?usp=drivesdk',
			},
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await download.execute.call(fakeExecuteFunction, 0, { json: {} });

		expect(transport.googleApiRequest).toBeCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			{},
			{ fields: 'mimeType,name', supportsTeamDrives: true, supportsAllDrives: true },
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/files/fileIDxxxxxx',
			{},
			{ alt: 'media', supportsAllDrives: true },
			undefined,
			{ encoding: 'arraybuffer', json: false, returnFullResponse: true, useStream: true },
		);
	});

	it('should export Google Docs as Markdown', async () => {
		const nodeParameters = {
			operation: 'download',
			fileId: {
				__rl: true,
				value: 'fileIDxxxxxx',
				mode: 'list',
			},
			options: {
				googleFileConversion: {
					conversion: {
						docsToFormat: 'text/markdown',
					},
				},
			},
		};

		(transport.googleApiRequest as jest.Mock)
			.mockResolvedValueOnce({ mimeType: 'application/vnd.google-apps.document', name: 'test' })
			.mockResolvedValueOnce({
				headers: { 'content-type': 'text/markdown' },
				body: Buffer.from(''),
			});

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);
		await download.execute.call(fakeExecuteFunction, 0, { json: {} });

		expect(transport.googleApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/drive/v3/files/fileIDxxxxxx/export',
			{},
			{ mimeType: 'text/markdown', supportsAllDrives: true },
			undefined,
			{ encoding: 'arraybuffer', json: false, returnFullResponse: true, useStream: true },
		);
	});
});
