import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import { Mailgun } from '../Mailgun.node';
import { prepareBinariesDataList } from '../../../utils/binary';

describe('Test Mailgun node', () => {
	let mailgunNode: Mailgun;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockRequestWithAuthentication: jest.Mock;
	let mockReturnJsonArray: jest.Mock;
	let mockConstructExecutionMetaData: jest.Mock;

	beforeEach(() => {
		mailgunNode = new Mailgun();
		mockRequestWithAuthentication = jest.fn();
		mockReturnJsonArray = jest.fn();
		mockConstructExecutionMetaData = jest.fn();

		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNode: jest.fn(),
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
				constructExecutionMetaData: mockConstructExecutionMetaData,
				returnJsonArray: mockReturnJsonArray,
				requestWithAuthentication: mockRequestWithAuthentication,
			},
		} as unknown as jest.Mocked<IExecuteFunctions>;

		jest.clearAllMocks();
	});

	describe('comma-separated attachment strings', () => {
		it('should process comma-separated attachment names with spaces', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
						file3: { data: 'data3', mimeType: 'text/plain', fileName: 'file3.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('file1, file2, file3');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.objectContaining({
						attachment: expect.arrayContaining([
							expect.objectContaining({ options: { filename: 'file1.txt' } }),
							expect.objectContaining({ options: { filename: 'file2.txt' } }),
							expect.objectContaining({ options: { filename: 'file3.txt' } }),
						]),
					}),
				}),
			);
		});

		it('should process comma-separated attachment names without spaces', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('file1,file2');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.objectContaining({
						attachment: expect.arrayContaining([
							expect.objectContaining({ options: { filename: 'file1.txt' } }),
							expect.objectContaining({ options: { filename: 'file2.txt' } }),
						]),
					}),
				}),
			);
		});

		it('should trim extra spaces from attachment names', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('  file1  ,  file2  ');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.objectContaining({
						attachment: expect.arrayContaining([
							expect.objectContaining({ options: { filename: 'file1.txt' } }),
							expect.objectContaining({ options: { filename: 'file2.txt' } }),
						]),
					}),
				}),
			);
		});

		it('should process single attachment name', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						singleFile: {
							data: 'data1',
							mimeType: 'text/plain',
							fileName: 'single.txt',
						} as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('singleFile');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.objectContaining({
						attachment: [expect.objectContaining({ options: { filename: 'single.txt' } })],
					}),
				}),
			);
		});
	});

	describe('prepareBinariesDataList helper function', () => {
		it('should process string attachment names correctly', () => {
			const result = prepareBinariesDataList('file1, file2');
			expect(result).toEqual(['file1', 'file2']);
		});

		it('should wrap IBinaryData object in array', () => {
			const input = { data: 'data1', mimeType: 'text/plain', fileName: 'file.txt' };
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
			expect(result).toHaveLength(1);
		});

		it('should return IBinaryData array unchanged', () => {
			const input = [
				{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
				{ data: 'data2', mimeType: 'image/png', fileName: 'file2.png' },
			];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
			expect(result).toHaveLength(2);
		});

		it('should return string array unchanged', () => {
			const input = ['file1', 'file2', 'file3'];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should process IBinaryData object as attachment', async () => {
			const binaryDataObject = { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' };
			const items = [
				{
					json: { data: 'test' },
					binary: {} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce(binaryDataObject);

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string | IBinaryData) => {
					if (typeof propertyName === 'object') {
						return propertyName;
					}
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string | IBinaryData) => {
					const binaryData =
						typeof propertyName === 'object'
							? propertyName
							: items[itemIndex].binary![propertyName];
					return Buffer.from(binaryData.data);
				},
			);

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			const result = prepareBinariesDataList(binaryDataObject);
			expect(result).toEqual([binaryDataObject]);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.objectContaining({
						attachment: [expect.objectContaining({ options: { filename: 'file1.txt' } })],
					}),
				}),
			);
		});

		it('should process IBinaryData array as attachments', async () => {
			const binaryDataArray = [
				{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
				{ data: 'data2', mimeType: 'image/png', fileName: 'file2.png' },
			];
			const items = [
				{
					json: { data: 'test' },
					binary: {} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce(binaryDataArray);

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string | IBinaryData) => {
					if (typeof propertyName === 'object') {
						return propertyName;
					}
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string | IBinaryData) => {
					const binaryData =
						typeof propertyName === 'object'
							? propertyName
							: items[itemIndex].binary![propertyName];
					return Buffer.from(binaryData.data);
				},
			);

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			const result = prepareBinariesDataList(binaryDataArray);
			expect(result).toEqual(binaryDataArray);
			expect(result).toHaveLength(2);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.objectContaining({
						attachment: expect.arrayContaining([
							expect.objectContaining({ options: { filename: 'file1.txt' } }),
							expect.objectContaining({ options: { filename: 'file2.png' } }),
						]),
					}),
				}),
			);
		});
	});

	describe('emails without attachments', () => {
		it('should send email when no attachments specified', async () => {
			const items = [{ json: { data: 'test' } }];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('');

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.not.objectContaining({
						attachment: expect.anything(),
					}),
				}),
			);
		});

		it('should send email when attachments is empty string', async () => {
			const items = [{ json: { data: 'test' }, binary: {} }];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.mailgun' } as any);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiDomain: 'api.mailgun.net',
				emailDomain: 'example.com',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('');

			mockRequestWithAuthentication.mockResolvedValue({ id: 'test-message-id' });
			mockReturnJsonArray.mockImplementation((data: any) => [{ json: data }]);
			mockConstructExecutionMetaData.mockImplementation((data: any) => data);

			await mailgunNode.execute.call(mockExecuteFunctions);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'mailgunApi',
				expect.objectContaining({
					formData: expect.not.objectContaining({
						attachment: expect.anything(),
					}),
				}),
			);
		});
	});
});
