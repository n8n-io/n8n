import { read, utils, write } from '@e965/xlsx';
import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import { execute as readSpreadsheet } from '../../../SpreadsheetFile/v2/fromFile.operation';
import { ExtractFromFile } from '../ExtractFromFile.node';

describe('Extract from XLSX date cells', () => {
	const sheet = utils.aoa_to_sheet([
		['Start Date'],
		[new Date('2026-07-02T00:00:00.000Z')],
		[new Date('2026-07-03T00:00:00.000Z')],
	]);
	sheet.A2.z = 'yyyy/mm/dd';
	sheet.A3.z = 'yyyy/mm/dd';
	const workbook = utils.book_new();
	utils.book_append_sheet(workbook, sheet, 'Dates');
	const buffer: Buffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

	function createContext(rawData: boolean | undefined, version: number) {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue({ typeVersion: version } as INode);
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'operation') return 'xlsx';
			if (name === 'fileFormat') return 'xlsx';
			if (name === 'binaryPropertyName') return 'data';
			if (name === 'options') return { rawData };
			return undefined;
		});
		context.helpers.assertBinaryData.mockReturnValue({
			data: buffer.toString(BINARY_ENCODING),
			mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			fileExtension: 'xlsx',
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
				{ json: { 'Start Date': '2026/07/02' }, pairedItem: { item: 0 } },
				{ json: { 'Start Date': '2026/07/03' }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('returns Excel date serials when RAW Data is enabled', async () => {
		const result = await extractDates(true);

		expect(result).toEqual([
			[
				{ json: { 'Start Date': 46205 }, pairedItem: { item: 0 } },
				{ json: { 'Start Date': 46206 }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('returns displayed dates when RAW Data is not set', async () => {
		const result = await extractDates(undefined);

		expect(result[0].map((item) => item.json['Start Date'])).toEqual(['2026/07/02', '2026/07/03']);
	});

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
