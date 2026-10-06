import { read, utils, write } from '@e965/xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import { execute as readSpreadsheet } from '../../../SpreadsheetFile/v2/fromFile.operation';
import { ExtractFromFile } from '../ExtractFromFile.node';

describe('Extract from spreadsheet date cells', () => {
	const sheet = utils.aoa_to_sheet([
		['Start Date', 'Count', 'Amount', 'Enabled', 'ID', 'Rate'],
		[new Date('2026-07-02T00:00:00.000Z'), 42, 1234.5, true, 123456789012345, 0.25],
		[new Date('2026-07-03T00:00:00.000Z'), 43, 9876.5, false, 987654321012345, 0.5],
	]);
	sheet.A2.z = 'yyyy/mm/dd';
	sheet.A3.z = 'yyyy/mm/dd';
	sheet.C2.z = '#,##0.00';
	sheet.C3.z = '#,##0.00';
	sheet.F2.z = '0%';
	sheet.F3.z = '0%';
	const workbook = utils.book_new();
	utils.book_append_sheet(workbook, sheet, 'Dates');
	const buffer: Buffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

	function createContext(
		rawData: boolean | undefined,
		version: number,
		fileFormat = 'xlsx',
		fileBuffer = buffer,
	) {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue({ typeVersion: version } as INode);
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'operation' || name === 'fileFormat') return fileFormat;
			if (name === 'binaryPropertyName') return 'data';
			if (name === 'options') return { rawData };
			return undefined;
		});
		context.helpers.assertBinaryData.mockReturnValue({
			data: fileBuffer.toString(BINARY_ENCODING),
			mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			fileExtension: fileFormat,
		});

		return context;
	}

	async function extractDates(rawData: boolean | undefined, version = 1.2) {
		const context = createContext(rawData, version);
		return await new ExtractFromFile().execute.call(context);
	}

	it('returns the displayed dates when RAW Data is disabled (NODE-5491)', async () => {
		// NODE-5491: Excel stores dates as numbers with a date format.
		const parsedSheet = read(buffer).Sheets.Dates;
		expect(parsedSheet.A2).toMatchObject({ t: 'n', w: '2026/07/02' });
		expect(parsedSheet.A3).toMatchObject({ t: 'n', w: '2026/07/03' });

		const result = await extractDates(false);

		expect(result).toEqual([
			[
				{
					json: {
						'Start Date': '2026/07/02',
						Count: 42,
						Amount: 1234.5,
						Enabled: true,
						ID: 123456789012345,
						Rate: 0.25,
					},
					pairedItem: { item: 0 },
				},
				{
					json: {
						'Start Date': '2026/07/03',
						Count: 43,
						Amount: 9876.5,
						Enabled: false,
						ID: 987654321012345,
						Rate: 0.5,
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('returns Excel date serials when RAW Data is enabled', async () => {
		const result = await extractDates(true);

		expect(result[0].map((item) => item.json['Start Date'])).toEqual([46205, 46206]);
	});

	it('returns displayed dates when RAW Data is not set', async () => {
		const result = await extractDates(undefined);

		expect(result[0].map((item) => item.json['Start Date'])).toEqual(['2026/07/02', '2026/07/03']);
	});

	it.each(['xls', 'ods'] as const)('returns displayed dates in %s files', async (fileFormat) => {
		const fileBuffer: Buffer = write(workbook, { bookType: fileFormat, type: 'buffer' });
		const displayedDate = read(fileBuffer).Sheets.Dates.A2.w;
		const context = createContext(false, 1.2, fileFormat, fileBuffer);
		const result = await new ExtractFromFile().execute.call(context);

		expect(result[0][0].json).toMatchObject({
			'Start Date': displayedDate,
			Count: 42,
			Amount: 1234.5,
			Enabled: true,
			ID: 123456789012345,
		});
	});

	it.each(['html', 'rtf'] as const)(
		'keeps numeric cells as numbers in %s files',
		async (fileFormat) => {
			const fileBuffer = readFileSync(
				resolve(__dirname, `../../../SpreadsheetFile/test/spreadsheet.${fileFormat}`),
			);
			const context = createContext(false, 1.2, fileFormat, fileBuffer);
			const result = await new ExtractFromFile().execute.call(context);

			expect(result[0].map((item) => item.json)).toEqual([
				{ A: 1, B: 2, C: 3 },
				{ A: 4, B: 5, C: 6 },
			]);
		},
	);

	it.each([1, 1.1])('preserves date serials in version %s', async (version) => {
		const result = await extractDates(false, version);

		expect(result[0].map((item) => item.json['Start Date'])).toEqual([46205, 46206]);
	});

	it('preserves date serials in Spreadsheet File v2', async () => {
		const context = createContext(false, 2);
		const result = await readSpreadsheet.call(context, context.getInputData());

		expect(result.map((item) => item.json['Start Date'])).toEqual([46205, 46206]);
	});
});
