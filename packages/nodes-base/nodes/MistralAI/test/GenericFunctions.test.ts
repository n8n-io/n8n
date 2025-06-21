import { NodeApiError } from 'n8n-workflow';

import { encodeBinaryData, processResponseData, sendErrorPostReceive } from '../GenericFunctions';

describe('Mistral OCR Generic Functions', () => {
	describe('encodeBinaryData', () => {
		const binaryBuffer = Buffer.from('testdata');
		const base64 = binaryBuffer.toString('base64');

		const context = {
			getNodeParameter: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
			},
		} as any;

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should encode binary data to a data URL', async () => {
			context.getNodeParameter.mockReturnValue('binaryProp1');
			context.helpers.assertBinaryData.mockReturnValue({
				mimeType: 'image/png',
				fileName: 'file.png',
			});
			context.helpers.getBinaryDataBuffer.mockResolvedValue(binaryBuffer);

			const result = await encodeBinaryData.call(context, 0);

			expect(context.getNodeParameter).toHaveBeenCalledWith('binaryProperty', 0);
			expect(context.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'binaryProp1');
			expect(context.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'binaryProp1');

			expect(result).toEqual({
				dataUrl: `data:image/png;base64,${base64}`,
				fileName: 'file.png',
			});
		});
	});

	describe('processResponseData', () => {
		it('should extract text and page count from pages', () => {
			const input = {
				pages: [
					{ markdown: 'Page 1 markdown', text: 'Page 1 text' },
					{ markdown: 'Page 2 markdown', text: 'Page 2 text' },
				],
				otherProp: 'test',
			};

			const result = processResponseData(input);

			expect(result.extractedText).toBe('Page 1 markdown\n\nPage 2 markdown');
			expect(result.pageCount).toBe(2);
			expect(result.otherProp).toBe('test');
		});

		it('should handle empty pages array', () => {
			const input = { pages: [] };

			const result = processResponseData(input);

			expect(result.extractedText).toBe('');
			expect(result.pageCount).toBe(0);
		});
	});

	describe('sendErrorPostReceive', () => {
		const context = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
		} as any;

		const items = [{ json: {} }] as any;

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return items if statusCode < 400', async () => {
			const response = { statusCode: 200, body: {} };
			const result = await sendErrorPostReceive.call(context, items, response as any);
			expect(result).toBe(items);
		});

		it('should throw detailed error on 422 with details', async () => {
			const response = {
				statusCode: 422,
				body: {
					detail: [
						{ loc: ['field1'], msg: 'Invalid value' },
						{ loc: ['field2'], msg: 'Missing' },
					],
				},
			};

			context.getNodeParameter.mockReturnValue('url');
			context.getNode.mockReturnValue({});

			await expect(sendErrorPostReceive.call(context, items, response as any)).rejects.toThrow(
				NodeApiError,
			);
		});

		it('should throw invalid image URL error', async () => {
			const response = {
				statusCode: 400,
				body: { message: 'could not be loaded as a valid image' },
			};

			context.getNodeParameter.mockReturnValue('url');
			context.getNode.mockReturnValue({});

			await expect(sendErrorPostReceive.call(context, items, response as any)).rejects.toThrow(
				'Invalid image URL',
			);
		});

		it('should throw fetch file URL error', async () => {
			const response = {
				statusCode: 400,
				body: { message: 'Error fetching file from URL' },
			};

			context.getNodeParameter.mockImplementation((param: string) =>
				param === 'inputType'
					? 'url'
					: param === 'documentUrl'
						? 'http://example.com/file.pdf'
						: undefined,
			);
			context.getNode.mockReturnValue({});

			await expect(sendErrorPostReceive.call(context, items, response as any)).rejects.toThrow(
				'Unable to access the file at http://example.com/file.pdf',
			);
		});

		it('should throw generic error if no special cases matched', async () => {
			const response = {
				statusCode: 400,
				body: { message: 'Some other error' },
			};

			context.getNodeParameter.mockReturnValue('url');
			context.getNode.mockReturnValue({});

			await expect(sendErrorPostReceive.call(context, items, response as any)).rejects.toThrow(
				'Some other error',
			);
		});
	});
});
