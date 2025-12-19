import { mock } from 'jest-mock-extended';
import type { IBinaryData, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import { type WorkSheet, utils as xlsxUtils, write as xlsxWrite } from 'xlsx';

import {
	convertJsonToSpreadsheetBinary,
	extractDataFromPDF,
	prepareBinariesDataList,
} from '@utils/binary';

jest.mock('xlsx', () => ({
	utils: {
		json_to_sheet: jest.fn(),
	},
	write: jest.fn(),
}));

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
	getDocument: jest.fn(),
	version: '5.3.31',
}));

describe('convertJsonToSpreadsheetBinary', () => {
	const helpers = mock<IExecuteFunctions['helpers']>();
	const executeFunctions = mock<IExecuteFunctions>({ helpers });
	const items = [
		{ json: { key1: 'value1', key2: 'value2' } },
		{ json: { key1: 'value3', key2: 'value4' } },
	] as INodeExecutionData[];
	const mockSheet = mock<WorkSheet>();
	const workBook = {
		SheetNames: ['Sheet'],
		Sheets: {
			Sheet: mockSheet,
		},
	};
	const mockBuffer = mock<Buffer>();
	const mockBinaryData = mock<IBinaryData>({ id: 'binaryId' });

	beforeEach(() => {
		jest.clearAllMocks();
		(xlsxUtils.json_to_sheet as jest.Mock).mockReturnValue(mockSheet);
		(xlsxWrite as jest.Mock).mockReturnValue(mockBuffer);
		helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);
	});

	describe('for fileFormat xlsx', () => {
		it('should convert from JSON', async () => {
			const result = await convertJsonToSpreadsheetBinary.call(executeFunctions, items, 'xlsx', {});

			expect(result).toEqual(mockBinaryData);
			expect(xlsxUtils.json_to_sheet).toHaveBeenCalledWith(
				items.map((item) => item.json),
				undefined,
			);
			expect(xlsxWrite).toHaveBeenCalledWith(workBook, {
				bookType: 'xlsx',
				bookSST: false,
				type: 'buffer',
			});
			expect(helpers.prepareBinaryData).toHaveBeenCalledWith(mockBuffer, 'spreadsheet.xlsx');
		});
	});

	describe('for fileFormat csv', () => {
		it('should convert from JSON', async () => {
			const result = await convertJsonToSpreadsheetBinary.call(executeFunctions, items, 'csv', {});

			expect(result).toEqual(mockBinaryData);
			expect(xlsxUtils.json_to_sheet).toHaveBeenCalledWith(
				items.map((item) => item.json),
				undefined,
			);
			expect(xlsxWrite).toHaveBeenCalledWith(workBook, {
				bookType: 'csv',
				bookSST: false,
				type: 'buffer',
			});
			expect(helpers.prepareBinaryData).toHaveBeenCalledWith(mockBuffer, 'spreadsheet.csv');
		});

		it('should handle custom delimiter', async () => {
			const result = await convertJsonToSpreadsheetBinary.call(executeFunctions, items, 'csv', {
				delimiter: ';',
			});

			expect(result).toEqual(mockBinaryData);
			expect(xlsxUtils.json_to_sheet).toHaveBeenCalledWith(
				items.map((item) => item.json),
				undefined,
			);
			expect(xlsxWrite).toHaveBeenCalledWith(workBook, {
				bookType: 'csv',
				bookSST: false,
				type: 'buffer',
				FS: ';',
			});
			expect(helpers.prepareBinaryData).toHaveBeenCalledWith(mockBuffer, 'spreadsheet.csv');
		});
	});
});

describe('extractDataFromPDF', () => {
	const helpers = mock<IExecuteFunctions['helpers']>();
	const executeFunctions = mock<IExecuteFunctions>({ helpers });

	const originalDOMMatrix = globalThis.DOMMatrix;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (originalDOMMatrix) {
			globalThis.DOMMatrix = originalDOMMatrix;
		} else {
			// @ts-expect-error - Intentionally deleting for test cleanup
			delete globalThis.DOMMatrix;
		}
	});

	describe('DOMMatrix polyfill', () => {
		it('should polyfill DOMMatrix when it is undefined', async () => {
			// @ts-expect-error - Intentionally deleting for test
			delete globalThis.DOMMatrix;
			expect(globalThis.DOMMatrix).toBeUndefined();

			const mockPage = {
				getTextContent: jest.fn().mockResolvedValue({ items: [] }),
			};
			const mockDocument = {
				numPages: 1,
				getMetadata: jest.fn().mockResolvedValue({ info: {}, metadata: null }),
				getPage: jest.fn().mockResolvedValue(mockPage),
			};
			const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
			(getDocument as jest.Mock).mockReturnValue({
				promise: Promise.resolve(mockDocument),
			});

			const mockBinaryData = {
				data: Buffer.from('fake pdf content').toString(BINARY_ENCODING),
				mimeType: 'application/pdf',
			};
			helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			await extractDataFromPDF.call(executeFunctions, 'data', undefined, undefined, true, 0);

			expect(globalThis.DOMMatrix).toBeDefined();
		});

		it('should not re-polyfill DOMMatrix when it is already defined', async () => {
			const mockDOMMatrix = class MockDOMMatrix {};
			globalThis.DOMMatrix = mockDOMMatrix as unknown as typeof DOMMatrix;

			const mockPage = {
				getTextContent: jest.fn().mockResolvedValue({ items: [] }),
			};
			const mockDocument = {
				numPages: 1,
				getMetadata: jest.fn().mockResolvedValue({ info: {}, metadata: null }),
				getPage: jest.fn().mockResolvedValue(mockPage),
			};
			const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
			(getDocument as jest.Mock).mockReturnValue({
				promise: Promise.resolve(mockDocument),
			});

			const mockBinaryData = {
				data: Buffer.from('fake pdf content').toString(BINARY_ENCODING),
				mimeType: 'application/pdf',
			};
			helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			await extractDataFromPDF.call(executeFunctions, 'data', undefined, undefined, true, 0);

			expect(globalThis.DOMMatrix).toBe(mockDOMMatrix);
		});
	});
});

describe('Twist GenericFunctions', () => {
	describe('prepareBinariesDataList', () => {
		describe('Array inputs', () => {
			it('should return string array as is', () => {
				const input = ['file1', 'file2', 'file3'];
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should return IBinaryData array as is', () => {
				const input: IBinaryData[] = [
					{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
					{ data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' },
				];
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(input);
				expect(result).toBe(input); // Should be the same reference
			});

			it('should return empty array as is', () => {
				const input: string[] = [];
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([]);
			});
		});

		describe('Object inputs', () => {
			it('should wrap single IBinaryData object in array', () => {
				const input: IBinaryData = {
					data: 'base64data',
					mimeType: 'image/png',
					fileName: 'image.png',
				};
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([input]);
				expect(Array.isArray(result)).toBe(true);
				expect(result.length).toBe(1);
			});

			it('should wrap IBinaryData with minimal properties in array', () => {
				const input: IBinaryData = {
					data: 'data',
					mimeType: 'application/octet-stream',
				};
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([input]);
			});

			it('should wrap IBinaryData with all properties in array', () => {
				const input: IBinaryData = {
					data: 'data',
					mimeType: 'application/pdf',
					fileName: 'document.pdf',
					fileExtension: 'pdf',
					directory: '/tmp',
					fileSize: '1024',
				};
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([input]);
			});
		});

		describe('String inputs', () => {
			it('should split comma-separated string and trim values', () => {
				const input = 'file1, file2, file3';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should split comma-separated string without spaces', () => {
				const input = 'file1,file2,file3';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should handle string with multiple spaces around commas', () => {
				const input = 'file1  ,   file2   ,  file3';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should handle single string value', () => {
				const input = 'singlefile';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['singlefile']);
			});

			it('should handle empty string', () => {
				const input = '';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['']);
			});

			it('should handle string with trailing comma', () => {
				const input = 'file1,file2,';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', '']);
			});

			it('should handle string with leading comma', () => {
				const input = ',file1,file2';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['', 'file1', 'file2']);
			});

			it('should handle string with consecutive commas', () => {
				const input = 'file1,,file2';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', '', 'file2']);
			});

			it('should trim whitespace from individual items', () => {
				const input = '  file1  ,  file2  ,  file3  ';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should handle string with special characters', () => {
				const input = 'file-1.txt, file_2.png, file@3.pdf';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file-1.txt', 'file_2.png', 'file@3.pdf']);
			});

			it('should handle string with paths', () => {
				const input = '/path/to/file1, /another/path/file2';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['/path/to/file1', '/another/path/file2']);
			});
		});
	});
});
