import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

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
});
