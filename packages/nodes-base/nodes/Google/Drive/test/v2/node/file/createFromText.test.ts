import * as createFromText from '../../../../v2/actions/file/createFromText.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, driveNode } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async function () {
			return { id: 42 };
		}),
	};
});

describe('test GoogleDriveV2: file createFromText', () => {
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

		expect(transport.googleApiRequest).toBeCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/upload/drive/v3/files',
			expect.anything(), // Buffer of content goes here
			{ uploadType: 'multipart', supportsAllDrives: true },
			undefined,
			{
				headers: {
					'Content-Length': 503,
					'Content-Type': expect.stringMatching(/^multipart\/related; boundary=(\\S)*/),
				},
			},
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/v3/files/42',
			{
				appProperties: { appKey1: 'appValue1' },
				mimeType: 'text/plain',
				name: 'helloDrive.txt',
				properties: { prop1: 'value1', prop2: 'value2' },
			},
			{
				addParents: 'folderIDxxxxxx',
				corpora: 'allDrives',
				includeItemsFromAllDrives: true,
				keepRevisionForever: true,
				ocrLanguage: 'en',
				spaces: 'appDataFolder, drive',
				supportsAllDrives: true,
				useContentAsIndexableText: true,
			},
		);
	});
});
