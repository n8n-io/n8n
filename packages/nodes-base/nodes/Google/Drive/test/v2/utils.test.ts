import type { IExecuteFunctions } from 'n8n-workflow';
import { Readable } from 'stream';

import {
	getItemBinaryData,
	prepareQueryString,
	setFileProperties,
	setUpdateCommonParams,
} from '../../v2/helpers/utils';

describe('test GoogleDriveV2, prepareQueryString', () => {
	it('should return id, name', () => {
		const fields = undefined;

		const result = prepareQueryString(fields);

		expect(result).toEqual('id, name');
	});

	it('should return *', () => {
		const fields = ['*'];

		const result = prepareQueryString(fields);

		expect(result).toEqual('*');
	});

	it('should return string joined by ,', () => {
		const fields = ['id', 'name', 'mimeType'];

		const result = prepareQueryString(fields);

		expect(result).toEqual('id, name, mimeType');
	});
});

describe('test GoogleDriveV2, setFileProperties', () => {
	it('should return empty object', () => {
		const body = {};
		const options = {};

		const result = setFileProperties(body, options);

		expect(result).toEqual({});
	});

	it('should return object with properties', () => {
		const body = {};
		const options = {
			propertiesUi: {
				propertyValues: [
					{
						key: 'propertyKey1',
						value: 'propertyValue1',
					},
					{
						key: 'propertyKey2',
						value: 'propertyValue2',
					},
				],
			},
		};

		const result = setFileProperties(body, options);

		expect(result).toEqual({
			properties: {
				propertyKey1: 'propertyValue1',
				propertyKey2: 'propertyValue2',
			},
		});
	});

	it('should return object with appProperties', () => {
		const body = {};
		const options = {
			appPropertiesUi: {
				appPropertyValues: [
					{
						key: 'appPropertyKey1',
						value: 'appPropertyValue1',
					},
					{
						key: 'appPropertyKey2',
						value: 'appPropertyValue2',
					},
				],
			},
		};

		const result = setFileProperties(body, options);

		expect(result).toEqual({
			appProperties: {
				appPropertyKey1: 'appPropertyValue1',
				appPropertyKey2: 'appPropertyValue2',
			},
		});
	});
});

describe('test GoogleDriveV2, setUpdateCommonParams', () => {
	it('should return empty object', () => {
		const qs = {};
		const options = {};

		const result = setUpdateCommonParams(qs, options);

		expect(result).toEqual({});
	});

	it('should return qs with params', () => {
		const options = {
			useContentAsIndexableText: true,
			keepRevisionForever: true,
			ocrLanguage: 'en',
			trashed: true,
			includePermissionsForView: 'published',
		};

		const qs = setUpdateCommonParams({}, options);

		expect(qs).toEqual({
			useContentAsIndexableText: true,
			keepRevisionForever: true,
			ocrLanguage: 'en',
		});
	});
});

describe('test GoogleDriveV2, getItemBinaryData', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'Google Drive' }),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryStream: jest.fn(),
				getBinaryMetadata: jest.fn(),
			},
		} as unknown as jest.Mocked<IExecuteFunctions>;
	});

	it('should use binaryData.mimeType when data is stored in-memory (no binaryData.id)', async () => {
		const binaryData = {
			data: Buffer.from('file content').toString('base64'),
			mimeType: 'application/pdf',
			fileName: 'document.pdf',
		};

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);

		const result = await getItemBinaryData.call(mockExecuteFunctions, 'data', 0);

		expect(result.mimeType).toBe('application/pdf');
		expect(result.originalFilename).toBe('document.pdf');
		// Should not call getBinaryStream or getBinaryMetadata for in-memory data
		expect(mockExecuteFunctions.helpers.getBinaryStream).not.toHaveBeenCalled();
		expect(mockExecuteFunctions.helpers.getBinaryMetadata).not.toHaveBeenCalled();
	});

	it('should use binaryData.mimeType when data is in filesystem mode (binaryData.id exists)', async () => {
		const mockStream = new Readable({ read() {} });
		const binaryData = {
			id: 'file-binary-id-123',
			mimeType: 'image/jpeg',
			fileName: 'photo.jpg',
		};
		const metadata = {
			fileSize: 102400,
			fileName: 'photo.jpg',
			mimeType: 'application/octet-stream', // filesystem-detected mimeType differs from user-set
		};

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
		(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(mockStream);
		(mockExecuteFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue(metadata);

		const result = await getItemBinaryData.call(mockExecuteFunctions, 'data', 0);

		// Should use binaryData.mimeType (user-set), NOT metadata.mimeType (filesystem-detected)
		expect(result.mimeType).toBe('image/jpeg');
		expect(result.contentLength).toBe(102400);
		expect(result.originalFilename).toBe('photo.jpg');
	});

	it('should use binaryData.mimeType over filesystem metadata mimeType in filesystem mode', async () => {
		const mockStream = new Readable({ read() {} });
		const binaryData = {
			id: 'file-binary-id-456',
			mimeType: 'text/csv',
			fileName: 'data.csv',
		};
		const metadata = {
			fileSize: 2048,
			fileName: 'data.csv',
			// filesystem auto-detected a different type
			mimeType: 'text/plain',
		};

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
		(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(mockStream);
		(mockExecuteFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue(metadata);

		const result = await getItemBinaryData.call(mockExecuteFunctions, 'data', 0);

		// binaryData.mimeType wins — this is the fix for the bug
		expect(result.mimeType).toBe('text/csv');
	});

	it('should throw NodeOperationError when inputDataFieldName is empty', async () => {
		await expect(getItemBinaryData.call(mockExecuteFunctions, '', 0)).rejects.toThrow(
			'The name of the input field containing the binary file data must be set',
		);
	});

	it('should return fileContent as Buffer for in-memory binary data', async () => {
		const rawContent = 'hello world';
		const binaryData = {
			data: Buffer.from(rawContent).toString('base64'),
			mimeType: 'text/plain',
			fileName: 'hello.txt',
		};

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);

		const result = await getItemBinaryData.call(mockExecuteFunctions, 'data', 0);

		expect(Buffer.isBuffer(result.fileContent)).toBe(true);
		expect((result.fileContent as Buffer).toString()).toBe(rawContent);
		expect(result.contentLength).toBe(Buffer.from(rawContent).length);
	});

	it('should return fileContent as stream for filesystem binary data', async () => {
		const mockStream = new Readable({ read() {} });
		const binaryData = {
			id: 'file-binary-id-789',
			mimeType: 'application/zip',
			fileName: 'archive.zip',
		};
		const metadata = {
			fileSize: 1048576,
			fileName: 'archive.zip',
			mimeType: 'application/zip',
		};

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
		(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(mockStream);
		(mockExecuteFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue(metadata);

		const result = await getItemBinaryData.call(mockExecuteFunctions, 'data', 0);

		expect(result.fileContent).toBe(mockStream);
		expect(result.contentLength).toBe(1048576);
	});
});
