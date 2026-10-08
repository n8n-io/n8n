import { type WorkSheet, utils as xlsxUtils, write as xlsxWrite } from '@e965/xlsx';
import {
	convertJsonToSpreadsheetBinary,
	createBinaryFromJson,
	extractDataFromPDF,
	prepareBinariesDataList,
	routeBinaryProperties,
} from '@utils/binary';
import type { IBinaryData, IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING, jsonParse, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('@e965/xlsx', () => ({
	utils: {
		json_to_sheet: vi.fn(),
	},
	write: vi.fn(),
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
	getDocument: vi.fn(),
	version: '5.4.296',
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
		vi.clearAllMocks();
		(xlsxUtils.json_to_sheet as Mock).mockReturnValue(mockSheet);
		(xlsxWrite as Mock).mockReturnValue(mockBuffer);
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
		vi.clearAllMocks();
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
				getTextContent: vi.fn().mockResolvedValue({ items: [] }),
			};
			const mockDocument = {
				numPages: 1,
				getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
				getPage: vi.fn().mockResolvedValue(mockPage),
			};
			const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
			(getDocument as Mock).mockReturnValue({
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
				getTextContent: vi.fn().mockResolvedValue({ items: [] }),
			};
			const mockDocument = {
				numPages: 1,
				getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
				getPage: vi.fn().mockResolvedValue(mockPage),
			};
			const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
			(getDocument as Mock).mockReturnValue({
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

describe('prepareBinariesDataList', () => {
	describe('string input', () => {
		it('should split comma-separated string with spaces', () => {
			const input = 'file1, file2, file3';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should split comma-separated string without spaces', () => {
			const input = 'file1,file2,file3';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should trim whitespace from property names', () => {
			const input = 'file1  ,  file2  ,  file3';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should return single item as array', () => {
			const input = 'singleFile';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['singleFile']);
		});

		it('should return array with empty string for empty input', () => {
			const input = '';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['']);
		});

		it('should handle trailing comma', () => {
			const input = 'file1, file2,';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', '']);
		});
	});

	describe('array input', () => {
		it('should return string array as-is', () => {
			const input = ['file1', 'file2', 'file3'];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should return empty array as-is', () => {
			const input: string[] = [];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([]);
		});

		it('should return IBinaryData array as-is', () => {
			const input = [
				{ data: 'data1', mimeType: 'text/plain' },
				{ data: 'data2', mimeType: 'text/plain' },
			];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
		});

		it('should return IBinaryData array with multiple items', () => {
			const input = [
				{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
				{ data: 'data2', mimeType: 'image/png', fileName: 'file2.png' },
				{ data: 'data3', mimeType: 'application/pdf', fileName: 'file3.pdf' },
			];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
			expect(result).toHaveLength(3);
		});

		it('should return single-item IBinaryData array as-is', () => {
			const input = [{ data: 'data1', mimeType: 'text/plain', fileName: 'single.txt' }];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
			expect(result).toHaveLength(1);
		});
	});

	describe('object input', () => {
		it('should wrap single IBinaryData object in array', () => {
			const input = { data: 'data1', mimeType: 'text/plain' };
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
		});

		it('should wrap IBinaryData object with fileName property in array', () => {
			const input = { data: 'data1', mimeType: 'text/plain', fileName: 'test.txt' };
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
			expect(result).toHaveLength(1);
		});

		it('should wrap IBinaryData object with all properties in array', () => {
			const input = {
				data: 'base64data',
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
				fileExtension: 'pdf',
			};
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
			expect(result[0]).toMatchObject(input);
		});
	});
});

describe('routeBinaryProperties', () => {
	const helpers = mock<IExecuteFunctions['helpers']>();
	const executeFunctions = mock<IExecuteFunctions>({ helpers });
	const binaryData = mock<IBinaryData>({ id: 'binaryId' });

	beforeEach(() => {
		vi.clearAllMocks();
		helpers.prepareBinaryData.mockResolvedValue(binaryData);
	});

	it('should deep-serialize non-binary fields so Dates become ISO strings', async () => {
		const { json, binary } = await routeBinaryProperties.call(executeFunctions, {
			id: 1,
			createdAt: new Date('2020-01-01T12:00:00.000Z'),
		});

		expect(json).toEqual({ id: 1, createdAt: '2020-01-01T12:00:00.000Z' });
		expect(binary).toEqual({});
	});

	it('should route Buffer fields to binary via prepareBinaryData', async () => {
		const buffer = Buffer.from('file-bytes');
		const { json, binary } = await routeBinaryProperties.call(executeFunctions, {
			name: 'doc',
			file: buffer,
		});

		expect(json).toEqual({ name: 'doc' });
		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(buffer, 'file');
		expect(binary.file).toBe(binaryData);
	});

	it('should keep unsafe field names as own properties without touching the prototype', async () => {
		const row = jsonParse<IDataObject>('{"id":1,"__proto__":{"polluted":true},"file":null}');
		row.file = Buffer.from('file-bytes');

		const { json, binary } = await routeBinaryProperties.call(executeFunctions, row);

		expect(Object.getPrototypeOf(json)).toBe(Object.prototype);
		expect(Object.getPrototypeOf(binary)).toBe(Object.prototype);
		expect(({} as IDataObject).polluted).toBeUndefined();
		expect(Object.getOwnPropertyDescriptor(json, '__proto__')?.value).toEqual({ polluted: true });
		expect(json.id).toBe(1);
		expect(binary.file).toBe(binaryData);
	});

	it('should recognize custom binary wrappers via toBuffer', async () => {
		const buffer = Buffer.from('wrapped');
		const wrapped = { buffer };
		const { json, binary } = await routeBinaryProperties.call(
			executeFunctions,
			{ id: 1, blob: wrapped },
			(value) => (value === wrapped ? buffer : undefined),
		);

		expect(json).toEqual({ id: 1 });
		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(buffer, 'blob');
		expect(binary.blob).toBe(binaryData);
	});
});

describe('createBinaryFromJson', () => {
	const helpers = mock<IExecuteFunctions['helpers']>();
	const executeFunctions = mock<IExecuteFunctions>({
		helpers,
		getNode: vi.fn().mockReturnValue({ name: 'Convert to File' }),
	});

	beforeEach(() => {
		vi.clearAllMocks();
		helpers.prepareBinaryData.mockImplementation(async (buffer, fileName, mimeType) => ({
			data: buffer.toString('base64'),
			fileName,
			mimeType,
		}));
	});

	it('should decode a valid base64 string', async () => {
		const base64 = Buffer.from('hello world').toString('base64');
		const result = await createBinaryFromJson.call(executeFunctions, base64, {
			fileName: 'test.txt',
			mimeType: 'text/plain',
		});

		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from('hello world'),
			'test.txt',
			'text/plain',
		);
		expect(result.fileName).toBe('test.txt');
	});

	it('should strip data: URI prefix and extract mimeType if not provided', async () => {
		const pngBase64 =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		const dataUri = `data:image/png;base64,${pngBase64}`;

		const result = await createBinaryFromJson.call(executeFunctions, dataUri);

		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from(pngBase64, 'base64'),
			undefined,
			'image/png',
		);
		const decodedBuffer = (helpers.prepareBinaryData as Mock).mock.calls[0][0] as Buffer;
		expect(decodedBuffer.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		expect(result.fileName).toBe('file');
	});

	it('should not override options.mimeType when data: URI is provided', async () => {
		const pngBase64 =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		const dataUri = `data:image/png;base64,${pngBase64}`;

		await createBinaryFromJson.call(executeFunctions, dataUri, {
			mimeType: 'application/octet-stream',
		});

		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from(pngBase64, 'base64'),
			undefined,
			'application/octet-stream',
		);
	});

	it('should handle base64 string with whitespace and newlines', async () => {
		const raw = 'valid base64 content';
		const base64 = Buffer.from(raw).toString('base64');
		const base64WithWhitespace = `\n  ${base64}  \r\n`;

		const result = await createBinaryFromJson.call(executeFunctions, base64WithWhitespace, {
			fileName: 'spaced.txt',
		});

		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from(raw),
			'spaced.txt',
			undefined,
		);
		expect(result.fileName).toBe('spaced.txt');
	});

	it('should throw NodeOperationError if input contains non-base64 characters', async () => {
		const invalidInput = 'this is plain text, not base64!';

		await expect(createBinaryFromJson.call(executeFunctions, invalidInput)).rejects.toThrow(
			NodeOperationError,
		);

		await expect(createBinaryFromJson.call(executeFunctions, invalidInput)).rejects.toThrow(
			'The provided string is not valid base64 data. If you are trying to write plain text to a file, use the "Convert to Text File" operation instead.',
		);
	});
});

