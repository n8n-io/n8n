import { mock } from 'jest-mock-extended';
import {
	BINARY_ENCODING,
	type IBinaryData,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { type WorkSheet, utils as xlsxUtils, write as xlsxWrite } from 'xlsx';

import { convertJsonToSpreadsheetBinary, extractDataFromPDF } from '@utils/binary';

jest.mock('xlsx', () => ({
	utils: {
		json_to_sheet: jest.fn(),
	},
	write: jest.fn(),
}));

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
	getDocument: jest.fn(),
	version: '6.4.299',
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

	beforeEach(() => {
		jest.clearAllMocks();
		helpers.assertBinaryData.mockReturnValue({
			data: Buffer.from('fake pdf content').toString(BINARY_ENCODING),
			mimeType: 'application/pdf',
		});
	});

	it('should return custom document info entries as a plain object', async () => {
		(getDocument as jest.Mock).mockReturnValue({
			promise: Promise.resolve({
				numPages: 0,
				getMetadata: jest.fn().mockResolvedValue({
					info: { Title: 'Report', Custom: new Map([['Department', 'Finance']]) },
					metadata: null,
				}),
				getPage: jest.fn(),
			}),
		});

		const result = await extractDataFromPDF.call(executeFunctions, 'data', undefined, 0);

		expect(result.info).toEqual({ Title: 'Report', Custom: { Department: 'Finance' } });
	});
});
