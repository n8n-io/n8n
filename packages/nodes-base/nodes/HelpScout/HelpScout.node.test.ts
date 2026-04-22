import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Readable } from 'stream';

import { HelpScout } from './HelpScout.node';
import * as GenericFunctions from './GenericFunctions';

jest.mock('./GenericFunctions');

describe('HelpScout Node', () => {
	let helpScout: HelpScout;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	const mockHelpscoutApiRequest = GenericFunctions.helpscoutApiRequest as jest.MockedFunction<
		typeof GenericFunctions.helpscoutApiRequest
	>;

	beforeEach(() => {
		helpScout = new HelpScout();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryStream: jest.fn(),
				binaryToBuffer: jest.fn(),
				constructExecutionMetaData: jest.fn((data: any) => data),
				returnJsonArray: jest.fn((data: any) =>
					Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }],
				),
			},
		});
		jest.clearAllMocks();
	});

	describe('Thread create operation - binary attachments', () => {
		it('should stream large binary files using getBinaryStream when binary data has an id', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						file1: {
							data: '',
							mimeType: 'image/png',
							fileName: 'test-image.png',
							fileExtension: 'png',
							id: 'binary-data-id-123',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-123')
				.mockReturnValueOnce('Test message')
				.mockReturnValueOnce({ customerId: 'customer-123' })
				.mockReturnValueOnce({
					attachmentsBinary: [{ property: 'file1' }],
				})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const mockBuffer = Buffer.from('mock-binary-content');
			const assertBinaryData = mockExecuteFunctions.helpers.assertBinaryData as jest.Mock;
			const getBinaryStream = mockExecuteFunctions.helpers.getBinaryStream as jest.Mock;
			const binaryToBuffer = mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock;

			assertBinaryData.mockReturnValue({
				data: '',
				mimeType: 'image/png',
				fileName: 'test-image.png',
				fileExtension: 'png',
				id: 'binary-data-id-123',
			});

			getBinaryStream.mockResolvedValue(Readable.from(mockBuffer) as any);
			binaryToBuffer.mockResolvedValue(mockBuffer);

			mockHelpscoutApiRequest.mockResolvedValue({ success: true });

			await helpScout.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'file1');
			expect(mockExecuteFunctions.helpers.getBinaryStream).toHaveBeenCalledWith(
				'binary-data-id-123',
				256 * 1024,
			);
			expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalled();

			expect(mockHelpscoutApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v2/conversations/conv-123/notes',
				expect.objectContaining({
					text: 'Test message',
					customer: { id: 'customer-123' },
					attachments: expect.arrayContaining([
						expect.objectContaining({
							fileName: 'test-image.png',
							mimeType: 'image/png',
							data: mockBuffer.toString('base64'),
						}),
					]),
				}),
			);
		});

		it('should use direct base64 data when binary data does not have an id', async () => {
			const base64Data = Buffer.from('test-file-content').toString('base64');
			const inputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						file1: {
							data: base64Data,
							mimeType: 'application/pdf',
							fileName: 'document.pdf',
							fileExtension: 'pdf',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-456')
				.mockReturnValueOnce('Test message with PDF')
				.mockReturnValueOnce({ customerEmail: 'customer@example.com' })
				.mockReturnValueOnce({
					attachmentsBinary: [{ property: 'file1' }],
				})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const assertBinaryData = mockExecuteFunctions.helpers.assertBinaryData as jest.Mock;
			assertBinaryData.mockReturnValue({
				data: base64Data,
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
				fileExtension: 'pdf',
			});

			mockHelpscoutApiRequest.mockResolvedValue({ success: true });

			await helpScout.execute.call(mockExecuteFunctions);

			expect(assertBinaryData).toHaveBeenCalledWith(0, 'file1');
			expect(mockExecuteFunctions.helpers.getBinaryStream).not.toHaveBeenCalled();

			expect(mockHelpscoutApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v2/conversations/conv-456/notes',
				expect.objectContaining({
					text: 'Test message with PDF',
					customer: { email: 'customer@example.com' },
					attachments: expect.arrayContaining([
						expect.objectContaining({
							fileName: 'document.pdf',
							mimeType: 'application/pdf',
							data: base64Data,
						}),
					]),
				}),
			);
		});

		it('should process multiple binary attachments in a single request', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						file1: {
							data: Buffer.from('file1-content').toString('base64'),
							mimeType: 'image/png',
							fileName: 'image1.png',
							fileExtension: 'png',
						},
						file2: {
							data: Buffer.from('file2-content').toString('base64'),
							mimeType: 'image/jpeg',
							fileName: 'image2.jpg',
							fileExtension: 'jpg',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-789')
				.mockReturnValueOnce('Multiple attachments')
				.mockReturnValueOnce({ customerId: 'customer-789' })
				.mockReturnValueOnce({
					attachmentsBinary: [{ property: 'file1' }, { property: 'file2' }],
				})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const assertBinaryData = mockExecuteFunctions.helpers.assertBinaryData as jest.Mock;
			assertBinaryData
				.mockReturnValueOnce({
					data: Buffer.from('file1-content').toString('base64'),
					mimeType: 'image/png',
					fileName: 'image1.png',
					fileExtension: 'png',
				})
				.mockReturnValueOnce({
					data: Buffer.from('file2-content').toString('base64'),
					mimeType: 'image/jpeg',
					fileName: 'image2.jpg',
					fileExtension: 'jpg',
				});

			mockHelpscoutApiRequest.mockResolvedValue({ success: true });

			await helpScout.execute.call(mockExecuteFunctions);

			expect(assertBinaryData).toHaveBeenCalledTimes(2);
			expect(assertBinaryData).toHaveBeenNthCalledWith(1, 0, 'file1');
			expect(assertBinaryData).toHaveBeenNthCalledWith(2, 0, 'file2');

			const callArgs = mockHelpscoutApiRequest.mock.calls[0];
			expect(callArgs[2].attachments).toHaveLength(2);
			expect(callArgs[2].attachments).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						fileName: 'image1.png',
						mimeType: 'image/png',
					}),
					expect.objectContaining({
						fileName: 'image2.jpg',
						mimeType: 'image/jpeg',
					}),
				]),
			);
		});

		it('should throw error when specified binary property does not exist on input', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						existingFile: {
							data: 'base64data',
							mimeType: 'image/png',
							fileName: 'existing.png',
							fileExtension: 'png',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-error')
				.mockReturnValueOnce('Test error')
				.mockReturnValueOnce({ customerId: 'customer-error' })
				.mockReturnValueOnce({
					attachmentsBinary: [{ property: 'nonExistentFile' }],
				})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const assertBinaryData = mockExecuteFunctions.helpers.assertBinaryData as jest.Mock;
			assertBinaryData.mockImplementation(() => {
				throw new NodeOperationError(
					mockExecuteFunctions.getNode(),
					'Binary property nonExistentFile does not exist on input',
					{ itemIndex: 0 },
				);
			});

			await expect(helpScout.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Binary property nonExistentFile does not exist on input',
			);

			expect(assertBinaryData).toHaveBeenCalledWith(0, 'nonExistentFile');
		});

		it('should use default fileName "unknown" when binary data has no fileName', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						file1: {
							data: Buffer.from('content').toString('base64'),
							mimeType: 'application/octet-stream',
							fileExtension: 'bin',
						} as any,
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-default')
				.mockReturnValueOnce('Default filename test')
				.mockReturnValueOnce({ customerId: 'customer-default' })
				.mockReturnValueOnce({
					attachmentsBinary: [{ property: 'file1' }],
				})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const assertBinaryData = mockExecuteFunctions.helpers.assertBinaryData as jest.Mock;
			assertBinaryData.mockReturnValue({
				data: Buffer.from('content').toString('base64'),
				mimeType: 'application/octet-stream',
				fileExtension: 'bin',
			} as any);

			mockHelpscoutApiRequest.mockResolvedValue({ success: true });

			await helpScout.execute.call(mockExecuteFunctions);

			expect(mockHelpscoutApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v2/conversations/conv-default/notes',
				expect.objectContaining({
					attachments: expect.arrayContaining([
						expect.objectContaining({
							fileName: 'unknown',
							mimeType: 'application/octet-stream',
						}),
					]),
				}),
			);
		});

		it('should handle IBinaryData object passed directly as property value', async () => {
			const base64Data = Buffer.from('direct-binary-content').toString('base64');
			const inputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			const binaryDataObject = {
				data: base64Data,
				mimeType: 'image/gif',
				fileName: 'animation.gif',
				fileExtension: 'gif',
			};

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-obj')
				.mockReturnValueOnce('Test with IBinaryData object')
				.mockReturnValueOnce({ customerId: 'customer-obj' })
				.mockReturnValueOnce({
					attachmentsBinary: [{ property: binaryDataObject }],
				})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const assertBinaryData = mockExecuteFunctions.helpers.assertBinaryData as jest.Mock;
			assertBinaryData.mockReturnValue(binaryDataObject);

			mockHelpscoutApiRequest.mockResolvedValue({ success: true });

			await helpScout.execute.call(mockExecuteFunctions);

			expect(assertBinaryData).toHaveBeenCalledWith(0, binaryDataObject);

			expect(mockHelpscoutApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v2/conversations/conv-obj/notes',
				expect.objectContaining({
					attachments: expect.arrayContaining([
						expect.objectContaining({
							fileName: 'animation.gif',
							mimeType: 'image/gif',
							data: base64Data,
						}),
					]),
				}),
			);
		});

		it('should throw error when neither customer email nor customer ID is provided', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('conv-no-customer')
				.mockReturnValueOnce('Test without customer')
				.mockReturnValueOnce({})
				.mockReturnValueOnce({})
				.mockReturnValueOnce('note');

			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'HelpScout',
				type: 'n8n-nodes-base.helpScout',
				typeVersion: 1,
				id: 'test-node-id',
			} as any);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			await expect(helpScout.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Either customer email or customer ID must be set',
			);
		});
	});
});
