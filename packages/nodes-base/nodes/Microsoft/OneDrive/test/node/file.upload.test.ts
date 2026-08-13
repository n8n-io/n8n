import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	microsoftApiRequest: vi.fn(async function () {
		return JSON.stringify({
			id: 'uploadedFileId',
			name: 'uploadedFile.txt',
		});
	}),
}));

describe('Test MicrosoftOneDrive, file > upload', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let microsoftOneDrive: MicrosoftOneDrive;
	const getBinaryDataBuffer = vi.fn(async () => Buffer.from('test content'));

	const mockNode = {
		id: 'test-node-id',
		name: 'Microsoft OneDrive Test',
		type: 'n8n-nodes-base.microsoftOneDrive',
		typeVersion: 1.1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		microsoftOneDrive = new MicrosoftOneDrive();

		mockExecuteFunctions.helpers = {
			assertBinaryData: vi.fn(() => {
				return {
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'binaryFileName.txt',
				} as IBinaryData;
			}),
			getBinaryDataBuffer,
			returnJsonArray: vi.fn((data) => [data]),
			constructExecutionMetaData: vi.fn((data) => data),
		} as any;

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should use filename from node parameters even when binary has a filename (version 1.1+)', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
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
			undefined,
		);
	});

	it('should use binary filename when node parameter filename is empty', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
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
			undefined,
		);
	});

	it('should properly encode special characters in filename from node parameters', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
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
			undefined,
		);
	});

	it('should always use binary filename even when node parameter has a filename (version 1 - legacy bug)', async () => {
		mockExecuteFunctions.getNode.mockReturnValue({
			...mockNode,
			typeVersion: 1,
		});

		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'customFileName.txt';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		// In version 1, binary filename always overwrites the parameter filename
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/binaryFileName.txt:/content',
			expect.any(Buffer),
			{},
			undefined,
			{ 'Content-Type': 'text/plain', 'Content-length': expect.any(Number) },
			{},
			undefined,
		);
	});

	it('should upload via the text path when the file name is valid', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'report.txt';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/report.txt:/content',
			'hello world',
			{},
			undefined,
			{ 'Content-Type': 'text/plain' },
			{ json: true },
			undefined,
		);
	});

	it('should reject a text-path file name containing a colon without issuing an upload request', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'report-2026-06-10T12:34:56.789Z.txt';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain("contains characters that OneDrive doesn't allow");
		expect(error.message).toContain(':');
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('should name every disallowed character when several are present', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'a:b/c?.txt';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain(':');
		expect(error.message).toContain('/');
		expect(error.message).toContain('?');
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('should reject an empty text-path file name without issuing an upload request', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return '';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain('File name must be set');
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('should reject a blank (whitespace-only) text-path file name', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return '   ';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain('File name must be set');
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('should reject a binary-path file name containing a colon without issuing an upload request', async () => {
		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'bad:name.txt';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain("contains characters that OneDrive doesn't allow");
		expect(error.message).toContain(':');
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
		expect(getBinaryDataBuffer).not.toHaveBeenCalled();
	});

	it('should reject a binary-path fallback file name that is illegal', async () => {
		mockExecuteFunctions.helpers.assertBinaryData = vi.fn(
			() =>
				({
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'illegal:fallback.txt',
				}) as IBinaryData,
		);

		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return '';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain("contains characters that OneDrive doesn't allow");
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('should reject a binary upload when no file name can be resolved', async () => {
		mockExecuteFunctions.helpers.assertBinaryData = vi.fn(
			() =>
				({
					data: 'base64data',
					mimeType: 'text/plain',
				}) as IBinaryData,
		);

		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return '';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain('File name must be set');
		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('should route the validation error to the node output when Continue On Fail is enabled', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'bad:name.txt';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
		});

		const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).not.toHaveBeenCalled();
		expect(result[0][0]).toEqual({ error: expect.stringContaining("OneDrive doesn't allow") });
	});

	it('should upload via the binary path with the resolved binary mime type and content length', async () => {
		mockExecuteFunctions.helpers.assertBinaryData = vi.fn(
			() =>
				({
					data: 'base64data',
					mimeType: 'application/pdf',
					fileName: 'report.pdf',
				}) as IBinaryData,
		);

		const items = [{ json: { data: 'test' }, binary: { data: {} as IBinaryData } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'fileName') return 'report.pdf';
			if (key === 'binaryData') return true;
			if (key === 'binaryPropertyName') return 'data';
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(getBinaryDataBuffer).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/report.pdf:/content',
			expect.any(Buffer),
			{},
			undefined,
			{ 'Content-Type': 'application/pdf', 'Content-length': expect.any(Number) },
			{},
			undefined,
		);
	});

	it('should upload valid items and route only the invalid one to output under Continue On Fail', async () => {
		const items = [{ json: { data: 'a' } }, { json: { data: 'b' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string, itemIndex?: number) => {
			if (key === 'resource') return 'file';
			if (key === 'operation') return 'upload';
			if (key === 'parentId') return 'parentFolderId';
			if (key === 'binaryData') return false;
			if (key === 'fileContent') return 'hello world';
			if (key === 'fileName') return itemIndex === 0 ? 'good.txt' : 'bad:name.txt';
		});

		const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parentFolderId:/good.txt:/content',
			'hello world',
			{},
			undefined,
			{ 'Content-Type': 'text/plain' },
			{ json: true },
			undefined,
		);
		expect(result[0][1]).toEqual({ error: expect.stringContaining("OneDrive doesn't allow") });
	});
});
