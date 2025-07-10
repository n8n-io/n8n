import type { IHttpRequestMethods } from 'n8n-workflow';

import * as upload from '../../../../v2/actions/file/upload.operation';
import * as utils from '../../../../v2/helpers/utils';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, createTestStream, driveNode } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'POST') {
				return {
					headers: { location: 'someLocation' },
				};
			}
			return {};
		}),
	};
});

jest.mock('../../../../v2/helpers/utils', () => {
	const originalModule = jest.requireActual('../../../../v2/helpers/utils');
	return {
		...originalModule,
		getItemBinaryData: jest.fn(async function () {
			return {
				contentLength: '123',
				fileContent: Buffer.from('Hello Drive!'),
				originalFilename: 'original.txt',
				mimeType: 'text/plain',
			};
		}),
	};
});

describe('test GoogleDriveV2: file upload', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should upload buffers', async () => {
		const nodeParameters = {
			name: 'newFile.txt',
			folderId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 3',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			options: {
				simplifyOutput: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await upload.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(2);

		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/upload/drive/v3/files',
			expect.any(Buffer),
			{ uploadType: 'media' },
			undefined,
			{ headers: { 'Content-Length': '123', 'Content-Type': 'text/plain' } },
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/undefined',
			{ mimeType: 'text/plain', name: 'newFile.txt', originalFilename: 'original.txt' },
			{
				addParents: 'folderIDxxxxxx',
				supportsAllDrives: true,
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
			},
		);

		expect(utils.getItemBinaryData).toBeCalledTimes(1);
		expect(utils.getItemBinaryData).toHaveBeenCalled();
	});

	it('should stream large files in 2MB chunks', async () => {
		const nodeParameters = {
			name: 'newFile.jpg',
			folderId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 3',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			options: {
				simplifyOutput: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);
		const httpRequestSpy = jest.spyOn(fakeExecuteFunction.helpers, 'httpRequest');

		const fileSize = 7 * 1024 * 1024; // 7MB
		jest.mocked(utils.getItemBinaryData).mockResolvedValue({
			mimeType: 'image/jpg',
			originalFilename: 'test.jpg',
			contentLength: fileSize,
			fileContent: createTestStream(fileSize),
		});

		await upload.execute.call(fakeExecuteFunction, 0);

		// 4 chunks: 7MB = 3x2MB + 1x1MB
		expect(httpRequestSpy).toHaveBeenCalledTimes(4);
		expect(httpRequestSpy).toHaveBeenCalledWith(
			expect.objectContaining({ body: expect.any(Buffer) }),
		);
		expect(transport.googleApiRequest).toBeCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/upload/drive/v3/files',
			undefined,
			{ uploadType: 'resumable' },
			undefined,
			{ returnFullResponse: true, headers: { 'X-Upload-Content-Type': 'image/jpg' } },
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/undefined',
			{ mimeType: 'image/jpg', name: 'newFile.jpg', originalFilename: 'test.jpg' },
			{
				addParents: 'folderIDxxxxxx',
				supportsAllDrives: true,
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
			},
		);
	});
});
