import nock from 'nock';

import * as createFromText from '../../../../v2/actions/file/createFromText.operation';

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

describe('test GoogleDriveV2: file createFromText', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	it('should be called with', async () => {
		const nodeParameters = {
			operation: 'createFromText',
			content: 'hello drive!',
			name: 'helloDrive.txt',
			folderId: {
				__rl: true,
				value: 'folderIDxxxxxx',
				mode: 'list',
				cachedResultName: 'testFolder 3',
				cachedResultUrl: 'https://drive.google.com/drive/folders/folderIDxxxxxx',
			},
			options: {
				appPropertiesUi: {
					appPropertyValues: [
						{
							key: 'appKey1',
							value: 'appValue1',
						},
					],
				},
				propertiesUi: {
					propertyValues: [
						{
							key: 'prop1',
							value: 'value1',
						},
						{
							key: 'prop2',
							value: 'value2',
						},
					],
				},
				keepRevisionForever: true,
				ocrLanguage: 'en',
				useContentAsIndexableText: true,
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await createFromText.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/upload/drive/v3/files',
			'\n\t\t\n--XXXXXX\t\t\nContent-Type: application/json; charset=UTF-8\t\t\n\n{"name":"helloDrive.txt","parents":["folderIDxxxxxx"],"mimeType":"text/plain","properties":{"prop1":"value1","prop2":"value2"},"appProperties":{"appKey1":"appValue1"}}\t\t\n--XXXXXX\t\t\nContent-Type: text/plain\t\t\nContent-Transfer-Encoding: base64\t\t\n\nhello drive!\t\t\n--XXXXXX--',
			{
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				keepRevisionForever: true,
				ocrLanguage: 'en',
				spaces: 'appDataFolder, drive',
				supportsAllDrives: true,
				uploadType: 'multipart',
				useContentAsIndexableText: true,
			},
			undefined,
			{ headers: { 'Content-Length': 12, 'Content-Type': 'multipart/related; boundary=XXXXXX' } },
		);
	});
});
