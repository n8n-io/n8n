import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IHttpRequestMethods, IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual('../../GenericFunctions'),
	microsoftApiRequest: jest.fn(async function () {
		return JSON.stringify({
			id: 'uploadedFileId',
			name: 'uploadedFile.txt',
		});
	}),
}));

describe('Test MicrosoftOneDrive, file > upload', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let microsoftOneDrive: MicrosoftOneDrive;
	const getBinaryDataBuffer = jest.fn(async () => Buffer.from('test content'));

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		microsoftOneDrive = new MicrosoftOneDrive();

		mockExecuteFunctions.helpers = {
			assertBinaryData: jest.fn((itemIndex: number, propertyName: string) => {
				return {
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'binaryFileName.txt',
				} as IBinaryData;
			}),
			getBinaryDataBuffer,
			returnJsonArray: jest.fn((data) => [data]),
			constructExecutionMetaData: jest.fn((data) => data),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should use filename from node parameters even when binary has a filename', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string, index: number) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'customFileName.txt';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/customFileName.txt:/content',
			expect.any(Buffer),
			{},
			undefined,
			{ 'Content-Type': 'text/plain', 'Content-length': expect.any(Number) },
			{},
		);
	});

	it('should use binary filename when node parameter filename is empty', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string, index: number) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return '';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/binaryFileName.txt:/content',
			expect.any(Buffer),
			{},
			undefined,
			{ 'Content-Type': 'text/plain', 'Content-length': expect.any(Number) },
			{},
		);
	});

	it('should properly encode special characters in filename from node parameters', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string, index: number) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'file with spaces & special.txt';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/file%20with%20spaces%20%26%20special.txt:/content',
			expect.any(Buffer),
			{},
			undefined,
			{ 'Content-Type': 'text/plain', 'Content-length': expect.any(Number) },
			{},
		);
	});
});
