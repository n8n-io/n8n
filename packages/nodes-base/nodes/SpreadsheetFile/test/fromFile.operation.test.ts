import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData, IBinaryData, INode } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import { Readable } from 'stream';

jest.mock('xlsx', () => ({
	read: jest.fn(),
	utils: {
		sheet_to_json: jest.fn(),
	},
}));

import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

import { execute } from '../v2/fromFile.operation';

describe('fromFile.operation - xlsx parsing logic', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

	const mockBinaryDataInMemory: IBinaryData = {
		data: 'dGVzdCBkYXRh',
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		fileExtension: 'xlsx',
		fileName: 'test.xlsx',
	};

	const mockBinaryDataWithId: IBinaryData = {
		id: 'binary-data-id-123',
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		fileExtension: 'xlsx',
		fileName: 'test.xlsx',
		data: '',
	};

	const mockWorkbook = {
		SheetNames: ['Sheet1', 'Sheet2'],
		Sheets: {
			Sheet1: {
				A1: { t: 's', v: 'Name' },
				B1: { t: 's', v: 'Age' },
				C1: { t: 's', v: 'City' },
				A2: { t: 's', v: 'John' },
				B2: { t: 'n', v: 25 },
				C2: { t: 's', v: 'NYC' },
				A3: { t: 's', v: 'Jane' },
				B3: { t: 'n', v: 30 },
				C3: { t: 's', v: 'LA' },
			},
			Sheet2: {
				A1: { t: 's', v: 'Product' },
				B1: { t: 'n', v: 100 },
			},
		},
	};

	const mockParsedData = [
		{ Name: 'John', Age: 25, City: 'NYC' },
		{ Name: 'Jane', Age: 30, City: 'LA' },
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex: number, defaultValue?: any) => {
				switch (paramName) {
					case 'fileFormat':
						return 'xlsx';
					case 'binaryPropertyName':
						return 'data';
					case 'options':
						return {};
					default:
						return defaultValue;
				}
			},
		);

		mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(mockBinaryDataInMemory);
		mockExecuteFunctions.getNode.mockReturnValue({
			name: 'SpreadsheetFile',
			type: 'n8n-nodes-base.spreadsheetFile',
			id: 'test-node-id',
		} as INode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		(xlsxRead as jest.Mock).mockReturnValue(mockWorkbook);
		(xlsxUtils.sheet_to_json as jest.Mock).mockReturnValue(mockParsedData);
	});

	describe('Basic xlsx parsing', () => {
		it('should parse xlsx file from in-memory binary data', async () => {
			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual({ Name: 'John', Age: 25, City: 'NYC' });
			expect(result[1].json).toEqual({ Name: 'Jane', Age: 30, City: 'LA' });
			expect(result[0].pairedItem).toEqual({ item: 0 });
			expect(result[1].pairedItem).toEqual({ item: 0 });

			expect(xlsxRead).toHaveBeenCalledWith(
				Buffer.from(mockBinaryDataInMemory.data, BINARY_ENCODING),
				{ raw: undefined },
			);
			expect(xlsxUtils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, {});
		});

		it('should parse xlsx file from filesystem binary data', async () => {
			const mockStream = new Readable();
			mockStream.push(Buffer.from('test xlsx content'));
			mockStream.push(null);

			const mockBuffer = Buffer.from('test xlsx content');

			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(mockBinaryDataWithId);
			mockExecuteFunctions.helpers.getBinaryStream.mockResolvedValue(mockStream);
			mockExecuteFunctions.helpers.binaryToBuffer.mockResolvedValue(mockBuffer);

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(2);
			expect(mockExecuteFunctions.helpers.getBinaryStream).toHaveBeenCalledWith(
				'binary-data-id-123',
			);
			expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(mockStream);
			expect(xlsxRead).toHaveBeenCalledWith(mockBuffer, { raw: undefined });
		});
	});

	describe('Options handling', () => {
		it('should respect rawData option', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { rawData: true };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(xlsxRead).toHaveBeenCalledWith(expect.any(Buffer), { raw: true });
		});

		it('should respect readAsString option', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { readAsString: true };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(xlsxRead).toHaveBeenCalledWith(expect.any(String), { raw: undefined, type: 'string' });
		});

		it('should use specified sheet name', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { sheetName: 'Sheet2' };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(xlsxUtils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet2, {});
		});

		it('should handle range option as string', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { range: 'A1:B2' };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(xlsxUtils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, {
				range: 'A1:B2',
			});
		});

		it('should handle range option as number', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { range: '2' };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(xlsxUtils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, {
				range: 2,
			});
		});

		it('should include empty cells when option is set', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { includeEmptyCells: true };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(xlsxUtils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, {
				defval: '',
			});
		});

		it('should handle headerRow=false option', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { headerRow: false };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const mockArrayData = [
				['Name', 'Age'],
				['John', 25],
				['Jane', 30],
			];
			(xlsxUtils.sheet_to_json as jest.Mock).mockReturnValue(mockArrayData);

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(xlsxUtils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, {
				header: 1,
			});

			expect(result).toHaveLength(3);
			expect(result[0].json).toEqual({ row: ['Name', 'Age'] });
			expect(result[1].json).toEqual({ row: ['John', 25] });
			expect(result[2].json).toEqual({ row: ['Jane', 30] });
		});
	});

	describe('Error handling', () => {
		it('should throw error when workbook has no sheets', async () => {
			const emptyWorkbook = { SheetNames: [], Sheets: {} };
			(xlsxRead as jest.Mock).mockReturnValue(emptyWorkbook);

			const items: INodeExecutionData[] = [{ json: {} }];

			await expect(execute.call(mockExecuteFunctions, items)).rejects.toThrow(NodeOperationError);
		});

		it('should throw error when specified sheet does not exist', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return { sheetName: 'NonExistentSheet' };
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'binaryPropertyName') return 'data';
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await expect(execute.call(mockExecuteFunctions, items)).rejects.toThrow(NodeOperationError);
		});

		it('should handle continueOnFail gracefully', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			(xlsxRead as jest.Mock).mockImplementation(() => {
				throw new Error('Invalid file format');
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(1);
			expect(result[0].json.error).toContain('Invalid file format');
			expect(result[0].pairedItem).toEqual({ item: 0 });
		});

		it('should enhance error message when file extension does not match format', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue({
				...mockBinaryDataInMemory,
				fileExtension: 'pdf',
			});

			(xlsxRead as jest.Mock).mockImplementation(() => {
				throw new Error('Parse error');
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result[0].json.error).toContain('not in xlsx format');
		});
	});

	describe('Multiple items processing', () => {
		it('should process multiple items correctly', async () => {
			const items: INodeExecutionData[] = [{ json: { id: 1 } }, { json: { id: 2 } }];

			mockExecuteFunctions.helpers.assertBinaryData
				.mockReturnValueOnce(mockBinaryDataInMemory)
				.mockReturnValueOnce({
					...mockBinaryDataInMemory,
					fileName: 'test2.xlsx',
				});

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(4);
			expect(result[0].pairedItem).toEqual({ item: 0 });
			expect(result[1].pairedItem).toEqual({ item: 0 });
			expect(result[2].pairedItem).toEqual({ item: 1 });
			expect(result[3].pairedItem).toEqual({ item: 1 });
		});
	});

	describe('File format detection', () => {
		it('should handle autodetect for xlsx files', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'fileFormat') return 'autodetect';
				if (paramName === 'binaryPropertyName') return 'data';
				if (paramName === 'options') return {};
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(2);
			expect(xlsxRead).toHaveBeenCalled();
		});
	});

	describe('Additional edge cases', () => {
		it('should handle mixed file formats with autodetect', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'fileFormat') return 'autodetect';
				if (paramName === 'binaryPropertyName') return 'data';
				if (paramName === 'options') return {};
				return undefined;
			});

			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue({
				...mockBinaryDataInMemory,
				mimeType: 'application/octet-stream',
				fileExtension: 'xlsx',
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(2);
			expect(xlsxRead).toHaveBeenCalled();
		});

		it('should handle custom binary property name correctly', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'binaryPropertyName') return 'customBinaryField';
				if (paramName === 'fileFormat') return 'xlsx';
				if (paramName === 'options') return {};
				return undefined;
			});

			const items: INodeExecutionData[] = [{ json: {} }];

			await execute.call(mockExecuteFunctions, items);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(
				0,
				'customBinaryField',
			);
		});

		it('should handle binary data stream errors gracefully', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(mockBinaryDataWithId);
			mockExecuteFunctions.helpers.getBinaryStream.mockRejectedValue(new Error('Stream error'));

			const items: INodeExecutionData[] = [{ json: {} }];

			const result = await execute.call(mockExecuteFunctions, items);

			expect(result).toHaveLength(1);
			expect(result[0].json.error).toContain('Stream error');
		});
	});
});
