import type { IHttpRequestMethods } from 'n8n-workflow';

import * as upload from '../../../../v2/actions/file/upload.operation';
import * as utils from '../../../../v2/helpers/utils';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, createTestStream, driveNode } from '../helpers';

const fileContent = Buffer.from('Hello Drive!');
const originalFilename = 'original.txt';
const contentLength = 123;
const mimeType = 'text/plain';

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
				contentLength,
				fileContent,
				originalFilename,
				mimeType,
			};
		}),
	};
});

describe('test GoogleDriveV2: file upload', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should upload buffers', async () => {
		const name = 'newFile.txt';
		const parent = 'folderIDxxxxxx';
		const nodeParameters = {
			name,
			folderId: {
				__rl: true,
				value: parent,
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
			{ uploadType: 'multipart', supportsAllDrives: true },
			undefined,
			{
				headers: {
					'Content-Length': 498,
					'Content-Type': expect.stringMatching(/^multipart\/related; boundary=(\\S)*/),
				},
			},
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/undefined',
			{ mimeType, name, originalFilename },
			{
				addParents: parent,
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
		const name = 'newFile.jpg';
		const parent = 'folderIDxxxxxx';
		const originalFilename = 'test.jpg';
		const mimeType = 'image/jpg';
		const nodeParameters = {
			name,
			folderId: {
				__rl: true,
				value: parent,
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
			mimeType,
			originalFilename,
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
			{ name, parents: [parent] },
			{ uploadType: 'resumable', supportsAllDrives: true },
			undefined,
			{ returnFullResponse: true, headers: { 'X-Upload-Content-Type': 'image/jpg' } },
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/undefined',
			{ mimeType, name, originalFilename },
			{
				addParents: parent,
				supportsAllDrives: true,
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				spaces: 'appDataFolder, drive',
			},
		);
	});
});
