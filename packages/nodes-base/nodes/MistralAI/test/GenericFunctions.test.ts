import { encodeBinaryData, processResponseData } from '../GenericFunctions';

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
});
