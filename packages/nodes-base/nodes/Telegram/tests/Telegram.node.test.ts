import { mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Telegram } from '../Telegram.node';

describe('Telegram node', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const apiRequestSpy = jest.spyOn(GenericFunctions, 'apiRequest');
	const node = new Telegram();

	beforeEach(() => {
		jest.resetAllMocks();
		executeFunctionsMock.getCredentials.mockResolvedValue({
			baseUrl: 'https://api.telegram.org',
			accessToken: 'test-token',
		});
		executeFunctionsMock.getNode.mockReturnValue({
			typeVersion: 1.2,
		} as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.helpers.returnJsonArray.mockImplementation(
			(input) => input as INodeExecutionData[],
		);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(input) => input as NodeExecutionWithMetadata[],
		);
	});

	describe('file:get', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((p) => {
				switch (p) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'get';
					case 'download':
						return true;
					case 'fileId':
						return 'file-id';
					default:
						return undefined;
				}
			});
		});

		it('should determine the mime type of the file', async () => {
			apiRequestSpy.mockResolvedValueOnce({
				result: {
					file_id: 'file-id',
					file_path: 'documents/file_1.pdf',
				},
			});
			apiRequestSpy.mockResolvedValueOnce({
				body: Buffer.from('test-file'),
			});
			executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
				data: 'test-file',
				mimeType: 'application/pdf',
			});

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{
						json: {
							result: {
								file_id: 'file-id',
								file_path: 'documents/file_1.pdf',
							},
						},
						binary: {
							data: {
								data: 'test-file',
								mimeType: 'application/pdf',
							},
						},
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(executeFunctionsMock.helpers.prepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('test-file'),
				'file_1.pdf',
				'application/pdf',
			);
		});

		it('should fallback to application/octet-stream if the mime type cannot be determined', async () => {
			apiRequestSpy.mockResolvedValueOnce({
				result: {
					file_id: 'file-id',
					file_path: 'documents/file_1.foo',
				},
			});
			apiRequestSpy.mockResolvedValueOnce({
				body: Buffer.from('test-file'),
			});
			executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
				data: 'test-file',
				mimeType: 'application/octet-stream',
			});

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{
						json: {
							result: {
								file_id: 'file-id',
								file_path: 'documents/file_1.foo',
							},
						},
						binary: {
							data: {
								data: 'test-file',
								mimeType: 'application/octet-stream',
							},
						},
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(executeFunctionsMock.helpers.prepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('test-file'),
				'file_1.foo',
				'application/octet-stream',
			);
		});

		it('should use the provided mime type if it is specified', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((p) => {
				switch (p) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'get';
					case 'download':
						return true;
					case 'fileId':
						return 'file-id';
					case 'additionalFields':
						return { mimeType: 'image/jpeg' };
					default:
						return undefined;
				}
			});
			apiRequestSpy.mockResolvedValueOnce({
				result: {
					file_id: 'file-id',
					file_path: 'documents/file_1.pdf',
				},
			});
			apiRequestSpy.mockResolvedValueOnce({
				body: Buffer.from('test-file'),
			});
			executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
				data: 'test-file',
				mimeType: 'image/jpeg',
			});

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{
						json: {
							result: {
								file_id: 'file-id',
								file_path: 'documents/file_1.pdf',
							},
						},
						binary: {
							data: {
								data: 'test-file',
								mimeType: 'image/jpeg',
							},
						},
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(executeFunctionsMock.helpers.prepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('test-file'),
				'file_1.pdf',
				'image/jpeg',
			);
		});
	});

	describe('message:sendPhoto with binary data', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName, index) => {
				switch (paramName) {
					case 'resource':
						return 'message';
					case 'operation':
						return 'sendPhoto';
					case 'binaryData':
						return true;
					case 'chatId':
						return index === 0 ? 'chat-id-0' : index === 1 ? 'chat-id-1' : 'chat-id-2';
					case 'binaryPropertyName':
						return index === 0 ? 'data0' : index === 1 ? 'data1' : 'data2';
					case 'additionalFields.fileName':
						return index === 0 ? 'photo0.jpg' : index === 1 ? 'photo1.png' : 'photo2.gif';
					case 'additionalFields':
						return {};
					default:
						return undefined;
				}
			});
		});

		it('should use correct index for binaryPropertyName parameter', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{
					json: {},
					binary: {
						data0: {
							data: 'binary-data-0',
							mimeType: 'image/jpeg',
							fileName: 'original0.jpg',
						},
					},
				},
				{
					json: {},
					binary: {
						data1: {
							data: 'binary-data-1',
							mimeType: 'image/png',
							fileName: 'original1.png',
						},
					},
				},
			]);

			apiRequestSpy.mockResolvedValue([{ result: { message_id: 123 } }]);

			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith('binaryPropertyName', 0);
			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith('binaryPropertyName', 1);
			expect(executeFunctionsMock.getNodeParameter).not.toHaveBeenCalledWith(
				'binaryPropertyName',
				0,
				expect.anything(),
			);
			expect(executeFunctionsMock.getNodeParameter).not.toHaveBeenCalledWith(
				'binaryPropertyName',
				1,
				expect.anything(),
			);
		});

		it('should use correct index for additionalFields.fileName parameter', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{
					json: {},
					binary: {
						data0: {
							data: 'binary-data-0',
							mimeType: 'image/jpeg',
						},
					},
				},
				{
					json: {},
					binary: {
						data1: {
							data: 'binary-data-1',
							mimeType: 'image/png',
						},
					},
				},
			]);

			apiRequestSpy.mockResolvedValue([{ result: { message_id: 123 } }]);

			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith(
				'additionalFields.fileName',
				0,
				'',
			);
			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith(
				'additionalFields.fileName',
				1,
				'',
			);
		});

		it('should use correct binary data for each item based on binaryPropertyName index', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{
					json: {},
					binary: {
						data0: {
							data: 'binary-data-0',
							mimeType: 'image/jpeg',
							fileName: 'original0.jpg',
						},
						wrongData: {
							data: 'wrong-binary-data',
							mimeType: 'image/gif',
						},
					},
				},
				{
					json: {},
					binary: {
						data1: {
							data: 'binary-data-1',
							mimeType: 'image/png',
							fileName: 'original1.png',
						},
						wrongData: {
							data: 'wrong-binary-data',
							mimeType: 'image/gif',
						},
					},
				},
			]);

			apiRequestSpy.mockResolvedValue([{ result: { message_id: 123 } }]);

			await node.execute.call(executeFunctionsMock);

			expect(apiRequestSpy).toHaveBeenCalledTimes(2);

			expect(apiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'POST',
				'sendPhoto',
				{},
				{},
				expect.objectContaining({
					formData: expect.objectContaining({
						chat_id: 'chat-id-0',
						photo: expect.objectContaining({
							value: expect.any(Buffer),
							options: expect.objectContaining({
								filename: 'photo0.jpg',
								contentType: 'image/jpeg',
							}),
						}),
					}),
				}),
			);

			expect(apiRequestSpy).toHaveBeenNthCalledWith(
				2,
				'POST',
				'sendPhoto',
				{},
				{},
				expect.objectContaining({
					formData: expect.objectContaining({
						chat_id: 'chat-id-1',
						photo: expect.objectContaining({
							value: expect.any(Buffer),
							options: expect.objectContaining({
								filename: 'photo1.png',
								contentType: 'image/png',
							}),
						}),
					}),
				}),
			);
		});

		it('should fallback to binary fileName when additionalFields.fileName is empty', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName, index) => {
				switch (paramName) {
					case 'resource':
						return 'message';
					case 'operation':
						return 'sendPhoto';
					case 'binaryData':
						return true;
					case 'chatId':
						return index === 0 ? 'chat-id-0' : 'chat-id-1';
					case 'binaryPropertyName':
						return index === 0 ? 'data0' : 'data1';
					case 'additionalFields.fileName':
						return index === 0 ? '' : 'custom-name.jpg';
					case 'additionalFields':
						return {};
					default:
						return undefined;
				}
			});

			executeFunctionsMock.getInputData.mockReturnValue([
				{
					json: {},
					binary: {
						data0: {
							data: 'binary-data-0',
							mimeType: 'image/jpeg',
							fileName: 'fallback-name.jpg',
						},
					},
				},
				{
					json: {},
					binary: {
						data1: {
							data: 'binary-data-1',
							mimeType: 'image/png',
							fileName: 'original-name.png',
						},
					},
				},
			]);

			apiRequestSpy.mockResolvedValue([{ result: { message_id: 123 } }]);

			await node.execute.call(executeFunctionsMock);

			const expectFileName = (index: number, filename: string) => {
				expect(apiRequestSpy).toHaveBeenNthCalledWith(
					index,
					'POST',
					'sendPhoto',
					{},
					{},
					{
						formData: expect.objectContaining({
							photo: expect.objectContaining({
								options: expect.objectContaining({
									filename,
								}),
							}),
						}),
					},
				);
			};

			expectFileName(1, 'fallback-name.jpg');
			expectFileName(2, 'custom-name.jpg');
		});

		it('should process different chat IDs for multiple items correctly', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{
					json: {},
					binary: {
						data0: {
							data: 'binary-data-0',
							mimeType: 'image/jpeg',
							fileName: 'photo0.jpg',
						},
					},
				},
				{
					json: {},
					binary: {
						data1: {
							data: 'binary-data-1',
							mimeType: 'image/png',
							fileName: 'photo1.png',
						},
					},
				},
				{
					json: {},
					binary: {
						data2: {
							data: 'binary-data-2',
							mimeType: 'image/gif',
							fileName: 'photo2.gif',
						},
					},
				},
			]);

			apiRequestSpy.mockResolvedValue([{ result: { message_id: 123 } }]);

			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith('chatId', 0);
			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith('chatId', 1);
			expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith('chatId', 2);

			expect(apiRequestSpy).toHaveBeenCalledTimes(3);

			const expectChatId = (n: number, chatId: string) => {
				expect(apiRequestSpy).toHaveBeenNthCalledWith(
					n,
					'POST',
					'sendPhoto',
					{},
					{},
					{
						formData: expect.objectContaining({
							chat_id: chatId,
						}),
					},
				);
			};

			expectChatId(1, 'chat-id-0');
			expectChatId(2, 'chat-id-1');
			expectChatId(3, 'chat-id-2');
		});
	});
});
