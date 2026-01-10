import type { IExecuteFunctions, IBinaryData, INodeExecutionData } from 'n8n-workflow';

import { Twist } from '../Twist.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions');

describe('Twist Node - prepareBinariesDataList usage', () => {
	let twist: Twist;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		twist = new Twist();
		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
				returnJsonArray: jest.fn(),
			},
		} as unknown as jest.Mocked<IExecuteFunctions>;
		jest.clearAllMocks();

		// Mock the twistApiRequest to return successful responses
		(GenericFunctions.twistApiRequest as jest.Mock).mockResolvedValue({
			id: 'test-id',
		});
	});

	describe('comment create with string binaryProperties', () => {
		it('should process comma-separated string binaryProperties', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						file1: {
							data: Buffer.from('data1').toString('base64'),
							mimeType: 'text/plain',
							fileName: 'file1.txt',
						},
						file2: {
							data: Buffer.from('data2').toString('base64'),
							mimeType: 'text/plain',
							fileName: 'file2.txt',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('comment')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('thread123')
				.mockReturnValueOnce('Test content')
				.mockReturnValueOnce({
					binaryProperties: 'file1, file2',
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(2);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'file1');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'file2');
		});

		it('should handle single string binaryProperty', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						singleFile: {
							data: Buffer.from('data').toString('base64'),
							mimeType: 'text/plain',
							fileName: 'single.txt',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('comment')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('thread123')
				.mockReturnValueOnce('Test content')
				.mockReturnValueOnce({
					binaryProperties: 'singleFile',
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'singleFile');
		});
	});

	describe('comment create with string[] binaryProperties', () => {
		it('should process string array binaryProperties', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						doc1: {
							data: Buffer.from('data1').toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'doc1.pdf',
						},
						doc2: {
							data: Buffer.from('data2').toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'doc2.pdf',
						},
						doc3: {
							data: Buffer.from('data3').toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'doc3.pdf',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('comment')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('thread123')
				.mockReturnValueOnce('Test content')
				.mockReturnValueOnce({
					binaryProperties: ['doc1', 'doc2', 'doc3'],
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(3);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'doc1');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'doc2');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'doc3');
		});
	});

	describe('comment create with IBinaryData binaryProperties', () => {
		it('should process single IBinaryData object', async () => {
			const binaryData: IBinaryData = {
				data: Buffer.from('data').toString('base64'),
				mimeType: 'image/png',
				fileName: 'image.png',
			};

			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('comment')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('thread123')
				.mockReturnValueOnce('Test content')
				.mockReturnValueOnce({
					binaryProperties: binaryData,
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});
	});

	describe('comment create with IBinaryData[] binaryProperties', () => {
		it('should process IBinaryData array', async () => {
			const binaryDataArray: IBinaryData[] = [
				{
					data: Buffer.from('data1').toString('base64'),
					mimeType: 'text/plain',
					fileName: 'file1.txt',
				},
				{
					data: Buffer.from('data2').toString('base64'),
					mimeType: 'image/jpeg',
					fileName: 'image.jpg',
				},
			];

			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('comment')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('thread123')
				.mockReturnValueOnce('Test content')
				.mockReturnValueOnce({
					binaryProperties: binaryDataArray,
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(_: number, data: any) => {
					if (typeof data === 'object') return data;
					return binaryDataArray[0];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(2);
		});
	});

	describe('messageConversation create with binaryProperties', () => {
		it('should process string binaryProperties in messageConversation', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						attachment: {
							data: Buffer.from('data').toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'report.pdf',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('messageConversation')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('workspace123')
				.mockReturnValueOnce('conversation123')
				.mockReturnValueOnce('Test message')
				.mockReturnValueOnce({
					binaryProperties: 'attachment',
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'attachment');
		});

		it('should process IBinaryData[] in messageConversation', async () => {
			const binaryDataArray: IBinaryData[] = [
				{
					data: Buffer.from('data1').toString('base64'),
					mimeType: 'text/csv',
					fileName: 'data.csv',
				},
				{
					data: Buffer.from('data2').toString('base64'),
					mimeType: 'application/zip',
					fileName: 'archive.zip',
				},
			];

			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('messageConversation')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('workspace123')
				.mockReturnValueOnce('conversation123')
				.mockReturnValueOnce('Test message')
				.mockReturnValueOnce({
					binaryProperties: binaryDataArray,
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(_: number, data: any) => {
					if (typeof data === 'object') return data;
					return binaryDataArray[0];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(2);
		});
	});

	describe('thread create with binaryProperties', () => {
		it('should process string binaryProperties in thread', async () => {
			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						doc1: {
							data: Buffer.from('data1').toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'spec.pdf',
						},
						doc2: {
							data: Buffer.from('data2').toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'design.pdf',
						},
					},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('channel123')
				.mockReturnValueOnce('Test Thread')
				.mockReturnValueOnce('Thread content')
				.mockReturnValueOnce({
					binaryProperties: 'doc1, doc2',
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(2);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'doc1');
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'doc2');
		});

		it('should process single IBinaryData in thread', async () => {
			const binaryData: IBinaryData = {
				data: Buffer.from('data').toString('base64'),
				mimeType: 'text/markdown',
				fileName: 'README.md',
			};

			const items: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('thread')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('channel123')
				.mockReturnValueOnce('Test Thread')
				.mockReturnValueOnce('Thread content')
				.mockReturnValueOnce({
					binaryProperties: binaryData,
				});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('test data'),
			);

			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }];
				},
			);

			const result = await twist.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, binaryData);
		});
	});
});
