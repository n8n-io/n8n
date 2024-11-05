import nock from 'nock';
import type { IHttpRequestMethods } from 'n8n-workflow';

import * as upload from '../../../../v2/actions/file/upload.operation';

import * as transport from '../../../../v2/transport';
import * as utils from '../../../../v2/helpers/utils';

import { createMockExecuteFunction, driveNode } from '../helpers';

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
				fileContent: 'Hello Drive!',
				originalFilename: 'original.txt',
				mimeType: 'text/plain',
			};
		}),
	};
});

describe('test GoogleDriveV2: file upload', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
		jest.unmock('../../../../v2/helpers/utils');
	});

	it('should be called with', async () => {
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
			undefined,
			{ uploadType: 'resumable' },
			undefined,
			{ returnFullResponse: true },
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
});
