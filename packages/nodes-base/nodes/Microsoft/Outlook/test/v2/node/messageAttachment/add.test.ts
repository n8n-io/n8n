import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { execute } from '../../../../v2/actions/messageAttachment/add.operation';

import * as transport from '../../../../v2/transport';

describe('Microsoft Outlook V2 - MessageAttachment:add', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let microsoftApiRequestSpy: jest.SpyInstance;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Microsoft Outlook Test',
		type: 'n8n-nodes-base.microsoftOutlook',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: any, options: any) => {
				return data.map((item: any, index: number) => ({
					...item,
					pairedItem: { item: options?.itemData?.item ?? index },
				}));
			},
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: any) => {
			return [{ json: data }];
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Small file (under 3MB)', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					messageId: 'AAMkAGI2TG93AAA=',
					binaryPropertyName: 'data',
					options: {},
				};
				return params[paramName];
			});

			const mockBinaryData = {
				data: 'SGVsbG8gV29ybGQ=',
				mimeType: 'text/plain',
				fileName: 'test-file.txt',
				fileExtension: 'txt',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('Hello World'),
			);
		});

		it('should add small attachment successfully', async () => {
			const mockResponse = {
				'@odata.context':
					"https://graph.microsoft.com/v1.0/$metadata#users('user-id')/messages('AAMkAGI2TG93AAA%3D')/attachments/$entity",
				'@odata.type': '#microsoft.graph.fileAttachment',
				id: 'AAMkAGI2TG93AAA=attachment-id',
				lastModifiedDateTime: '2023-12-19T12:00:00Z',
				name: 'test-file.txt',
				contentType: 'text/plain',
				size: 11,
				isInline: false,
			};

			microsoftApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

			expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/messages/AAMkAGI2TG93AAA=/attachments',
				{
					'@odata.type': '#microsoft.graph.fileAttachment',
					name: 'test-file.txt',
					contentBytes: 'SGVsbG8gV29ybGQ=',
				},
				{},
			);

			expect(result).toEqual([
				{
					json: { success: true },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should use custom filename when provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					messageId: 'AAMkAGI2TG93AAA=',
					binaryPropertyName: 'data',
					options: {
						fileName: 'custom-name.pdf',
					},
				};
				return params[paramName];
			});

			const mockBinaryData = {
				data: 'JVBERi0xLjQK',
				mimeType: 'application/pdf',
				fileName: 'original-name.pdf',
				fileExtension: 'pdf',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('%PDF-1.4\n'),
			);

			microsoftApiRequestSpy.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

			expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/messages/AAMkAGI2TG93AAA=/attachments',
				{
					'@odata.type': '#microsoft.graph.fileAttachment',
					name: 'custom-name.pdf',
					contentBytes: 'JVBERi0xLjQK',
				},
				{},
			);
		});

		it('should throw error when fileName is not set', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					messageId: 'AAMkAGI2TG93AAA=',
					binaryPropertyName: 'data',
					options: {},
				};
				return params[paramName];
			});

			const mockBinaryData = {
				data: 'SGVsbG8gV29ybGQ=',
				mimeType: 'text/plain',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('Hello World'),
			);

			await expect(execute.call(mockExecuteFunctions, 0, [{ json: {} }])).rejects.toThrow(
				NodeOperationError,
			);
			await expect(execute.call(mockExecuteFunctions, 0, [{ json: {} }])).rejects.toThrow(
				'File name is not set',
			);
		});
	});

	describe('Large file (over 3MB) with chunked upload', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					messageId: 'AAMkAGI2TG93BBB=',
					binaryPropertyName: 'data',
					options: {},
				};
				return params[paramName];
			});

			const largeBinaryData = Buffer.alloc(4 * 1024 * 1024);
			const mockBinaryData = {
				data: largeBinaryData.toString('base64'),
				mimeType: 'application/octet-stream',
				fileName: 'large-file.bin',
				fileExtension: 'bin',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				largeBinaryData,
			);
		});

		it('should create upload session and upload large file in chunks', async () => {
			const uploadUrl =
				"https://outlook.office.com/api/v2.0/Users('user-id')/Messages('AAMkAGI2TG93BBB=')/AttachmentSessions('session-id')?authtoken=token";

			microsoftApiRequestSpy.mockResolvedValueOnce({
				'@odata.context':
					'https://graph.microsoft.com/v1.0/$metadata#microsoft.graph.uploadSession',
				expirationDateTime: '2023-12-19T13:00:00.0000000Z',
				nextExpectedRanges: ['0-'],
				uploadUrl,
			});

			(mockExecuteFunctions.helpers.request as jest.Mock).mockResolvedValue({
				'@odata.type': '#microsoft.graph.fileAttachment',
				id: 'attachment-id',
				name: 'large-file.bin',
				size: 4 * 1024 * 1024,
			});

			const result = await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

			expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/messages/AAMkAGI2TG93BBB=/attachments/createUploadSession',
				{
					AttachmentItem: {
						attachmentType: 'file',
						name: 'large-file.bin',
						size: 4 * 1024 * 1024,
					},
				},
			);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				uploadUrl,
				expect.objectContaining({
					method: 'PUT',
					headers: expect.objectContaining({
						'Content-Type': 'application/octet-stream',
					}),
				}),
			);

			expect(result).toEqual([
				{
					json: { success: true },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should throw error when upload session fails', async () => {
			microsoftApiRequestSpy.mockResolvedValueOnce({
				'@odata.context':
					'https://graph.microsoft.com/v1.0/$metadata#microsoft.graph.uploadSession',
			});

			await expect(execute.call(mockExecuteFunctions, 0, [{ json: {} }])).rejects.toThrow(
				'Failed to get upload session',
			);
		});
	});
});
