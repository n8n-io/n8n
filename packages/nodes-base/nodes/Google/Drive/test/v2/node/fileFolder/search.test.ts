import nock from 'nock';
import type { IHttpRequestMethods } from 'n8n-workflow';

import * as search from '../../../../v2/actions/fileFolder/search.operation';

import * as transport from '../../../../v2/transport';

import { createMockExecuteFunction, driveNode } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return {};
			}
		}),
		googleApiRequestAllItems: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return {};
			}
		}),
	};
});

describe('test GoogleDriveV2: fileFolder search', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	it('returnAll = false', async () => {
		const nodeParameters = {
			searchMethod: 'name',
			resource: 'fileFolder',
			queryString: 'test',
			returnAll: false,
			limit: 2,
			filter: {
				whatToSearch: 'files',
				fileTypes: ['application/vnd.google-apps.document'],
			},
			options: {
				fields: ['id', 'name', 'starred', 'version'],
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await search.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toBeCalledWith('GET', '/drive/v3/files', undefined, {
			corpora: 'allDrives',
			fields: 'nextPageToken, files(id, name, starred, version)',
			includeItemsFromAllDrives: true,
			pageSize: 2,
			q: "name contains 'test' and mimeType != 'application/vnd.google-apps.folder' and trashed = false and (mimeType = 'application/vnd.google-apps.document')",
			spaces: 'appDataFolder, drive',
			supportsAllDrives: true,
		});
	});

	it('returnAll = true', async () => {
		const nodeParameters = {
			resource: 'fileFolder',
			searchMethod: 'query',
			queryString: 'test',
			returnAll: true,
			filter: {
				driveId: {
					__rl: true,
					value: 'driveID000000123',
					mode: 'list',
					cachedResultName: 'sharedDrive',
					cachedResultUrl: 'https://drive.google.com/drive/folders/driveID000000123',
				},
				folderId: {
					__rl: true,
					value: 'folderID000000123',
					mode: 'list',
					cachedResultName: 'testFolder 3',
					cachedResultUrl: 'https://drive.google.com/drive/folders/folderID000000123',
				},
				whatToSearch: 'all',
				fileTypes: ['*'],
				includeTrashed: true,
			},
			options: {
				fields: ['permissions', 'mimeType'],
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await search.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequestAllItems).toBeCalledTimes(1);
		expect(transport.googleApiRequestAllItems).toBeCalledWith(
			'GET',
			'files',
			'/drive/v3/files',
			{},
			{
				corpora: 'drive',
				driveId: 'driveID000000123',
				fields: 'nextPageToken, files(permissions, mimeType)',
				includeItemsFromAllDrives: true,
				q: "test and 'folderID000000123' in parents",
				spaces: 'appDataFolder, drive',
				supportsAllDrives: true,
			},
		);
	});
});
