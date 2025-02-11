import type { IncomingMessage } from 'http';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type IHttpRequestMethods, type IExecuteFunctions, ApplicationError } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual('../../GenericFunctions'),
	microsoftApiRequest: jest.fn(async function (_: IHttpRequestMethods, resource: string) {
		if (resource === '/drive/items/fileID') {
			return {
				name: 'MyFile',
				'@microsoft.graph.downloadUrl': 'https://test.com/file',
				file: {
					mimeType: 'image/png',
				},
			};
		}
		if (resource === '/drive/items/fileID/content') {
			throw new ApplicationError('Error');
		}
	}),
}));

describe('Test MicrosoftOneDrive, file > download', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let microsoftOneDrive: MicrosoftOneDrive;
	const httpRequest = jest.fn(async () => ({ body: mock<IncomingMessage>() }));
	const prepareBinaryData = jest.fn(async () => ({ data: 'testBinary' }));

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		microsoftOneDrive = new MicrosoftOneDrive();

		mockExecuteFunctions.helpers = {
			httpRequest,
			prepareBinaryData,
			returnJsonArray: jest.fn((data) => [data]),
			constructExecutionMetaData: jest.fn((data) => data),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call helpers.httpRequest when request to /drive/items/{fileId}/content fails', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'download';
			if (key === 'fileId') return 'fileID';
			if (key === 'binaryPropertyName') return 'data';
		});

		const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(2);
		expect(httpRequest).toHaveBeenCalledTimes(1);
		expect(httpRequest).toHaveBeenCalledWith({
			encoding: 'arraybuffer',
			json: false,
			method: 'GET',
			returnFullResponse: true,
			url: 'https://test.com/file',
		});
		expect(prepareBinaryData).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			[{ binary: { data: { data: 'testBinary' } }, json: { data: 'test' } }],
		]);
	});
});
