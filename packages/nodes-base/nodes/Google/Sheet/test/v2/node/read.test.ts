import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/read.operation';
import { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Read', () => {
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockSheet: Partial<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue({ typeVersion: 4.5 }),
			getNodeParameter: vi.fn((param) => {
				const mockParams: { [key: string]: unknown } = {
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
				};
				return mockParams[param];
			}),
		} as Partial<IExecuteFunctions>;

		mockSheet = {
			getData: vi.fn().mockResolvedValue([
				['Header1', 'Header2'],
				['Value1', 'Value2'],
			]),
			lookupValues: vi.fn().mockResolvedValue([{ Header1: 'Value1', Header2: 'Value2' }]),
			structureArrayDataByColumn: vi
				.fn()
				.mockReturnValue([{ Header1: 'Value1', Header2: 'Value2' }]),
		};
	});

	test('should return structured sheet data when no filters are applied', async () => {
		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(mockSheet.getData).toHaveBeenCalled();
		expect(mockSheet.structureArrayDataByColumn).toHaveBeenCalled();
		expect(result).toEqual([
			{
				json: { Header1: 'Value1', Header2: 'Value2' },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should call lookupValues when filters are provided', async () => {
		mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
			if (param === 'filtersUI.values') return [{ lookupColumn: 'Header1', lookupValue: 'Value1' }];
			return '';
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(mockSheet.lookupValues).toHaveBeenCalled();
		expect(result).toEqual([
			{
				json: { Header1: 'Value1', Header2: 'Value2' },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should return an empty array when sheet data is empty', async () => {
		mockSheet.getData = vi.fn().mockResolvedValue([]);
		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(result).toEqual([]);
	});

	test('should not fetch the sheet list in single sheet mode', async () => {
		mockSheet.spreadsheetGetSheets = vi.fn();

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.spreadsheetGetSheets).not.toHaveBeenCalled();
	});
});

describe('Google Sheet - Read - All Sheets', () => {
	const node: INode = {
		id: 'a1b2c3',
		name: 'Google Sheets',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.5,
		position: [0, 0],
		parameters: {},
	};

	let nodeParameters: { [key: string]: unknown };
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let sheet: GoogleSheet;
	let rowsBySheet: { [range: string]: string[][] };

	/** Builds the `spreadsheets.get` payload the node reads sheet titles from */
	const sheetList = (...properties: Array<{ title: string; sheetType?: string }>) => ({
		sheets: properties.map((p, index) => ({
			properties: { sheetId: index, sheetType: 'GRID', ...p },
		})),
	});

	beforeEach(() => {
		nodeParameters = {
			sheetSelectionMode: 'all',
			options: {},
			'filtersUI.values': [],
			combineFilters: 'AND',
		};

		mockExecuteFunctions = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue(node),
			getNodeParameter: vi.fn(
				(param: string, _i: number, fallback?: unknown) => nodeParameters[param] ?? fallback,
			),
			continueOnFail: vi.fn().mockReturnValue(false),
		} as Partial<IExecuteFunctions>;

		rowsBySheet = {
			Q1: [
				['name', 'amount'],
				['Ada', '10'],
			],
			Q2: [
				['name', 'amount'],
				['Grace', '20'],
				['Alan', '30'],
			],
		};

		// A real GoogleSheet keeps the row-structuring logic under test; only the
		// two methods that reach the API are stubbed.
		sheet = new GoogleSheet('spreadsheet-id', mockExecuteFunctions as IExecuteFunctions);
		sheet.spreadsheetGetSheets = vi
			.fn()
			.mockResolvedValue(sheetList({ title: 'Q1' }, { title: 'Q2' }));
		sheet.getData = vi.fn(async (range: string) => rowsBySheet[range]);
	});

	test('should read every sheet and tag each row with its sheet name', async () => {
		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(result).toEqual([
			{
				json: { sheet_name: 'Q1', name: 'Ada', amount: '10', row_number: 2 },
				pairedItem: { item: 0 },
			},
			{
				json: { sheet_name: 'Q2', name: 'Grace', amount: '20', row_number: 2 },
				pairedItem: { item: 0 },
			},
			{
				json: { sheet_name: 'Q2', name: 'Alan', amount: '30', row_number: 3 },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should request one range per sheet', async () => {
		await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(sheet.getData).toHaveBeenCalledTimes(2);
		expect(sheet.getData).toHaveBeenNthCalledWith(1, 'Q1', 'UNFORMATTED_VALUE', 'FORMATTED_STRING');
		expect(sheet.getData).toHaveBeenNthCalledWith(2, 'Q2', 'UNFORMATTED_VALUE', 'FORMATTED_STRING');
	});

	test('should apply the configured range to each sheet individually', async () => {
		nodeParameters.options = {
			dataLocationOnSheet: { values: { rangeDefinition: 'specifyRangeA1', range: 'A:B' } },
		};
		rowsBySheet = { 'Q1!A:B': rowsBySheet.Q1, 'Q2!A:B': rowsBySheet.Q2 };

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(sheet.getData).toHaveBeenNthCalledWith(
			1,
			'Q1!A:B',
			'UNFORMATTED_VALUE',
			'FORMATTED_STRING',
		);
		expect(sheet.getData).toHaveBeenNthCalledWith(
			2,
			'Q2!A:B',
			'UNFORMATTED_VALUE',
			'FORMATTED_STRING',
		);
		expect(result).toHaveLength(3);
	});

	test('should skip chart-only sheets, which hold no readable cells', async () => {
		sheet.spreadsheetGetSheets = vi
			.fn()
			.mockResolvedValue(
				sheetList({ title: 'Q1' }, { title: 'Chart', sheetType: 'OBJECT' }, { title: 'Q2' }),
			);

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(sheet.getData).toHaveBeenCalledTimes(2);
		expect(sheet.getData).not.toHaveBeenCalledWith('Chart', expect.anything(), expect.anything());
		expect(result.map((item) => item.json.sheet_name)).toEqual(['Q1', 'Q2', 'Q2']);
	});

	test('should skip sheets that hold no rows', async () => {
		sheet.spreadsheetGetSheets = vi
			.fn()
			.mockResolvedValue(sheetList({ title: 'Q1' }, { title: 'Empty' }, { title: 'Q2' }));
		rowsBySheet.Empty = [];

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(sheet.getData).toHaveBeenCalledTimes(3);
		expect(result.map((item) => item.json.sheet_name)).toEqual(['Q1', 'Q2', 'Q2']);
	});

	test('should keep the value of a column that is itself named sheet_name', async () => {
		rowsBySheet.Q1 = [
			['name', 'sheet_name'],
			['Ada', 'from-the-spreadsheet'],
		];

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(result[0].json).toEqual({
			name: 'Ada',
			sheet_name: 'from-the-spreadsheet',
			row_number: 2,
		});
	});

	test('should key each sheet off its own header row when the headers differ', async () => {
		rowsBySheet.Q2 = [
			['amount', 'name', 'region'],
			['20', 'Grace', 'EU'],
		];

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		// Sheets are read independently, so a differing column order or an extra
		// column changes only that sheet's rows - it is not an error, and the
		// fields are not unioned across sheets
		expect(result).toEqual([
			{
				json: { sheet_name: 'Q1', name: 'Ada', amount: '10', row_number: 2 },
				pairedItem: { item: 0 },
			},
			{
				json: { sheet_name: 'Q2', amount: '20', name: 'Grace', region: 'EU', row_number: 2 },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should return an empty array when the spreadsheet has no readable sheets', async () => {
		sheet.spreadsheetGetSheets = vi
			.fn()
			.mockResolvedValue(sheetList({ title: 'Chart', sheetType: 'OBJECT' }));

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(result).toEqual([]);
		expect(sheet.getData).not.toHaveBeenCalled();
	});

	test('should not throw when the spreadsheet response carries no sheets', async () => {
		sheet.spreadsheetGetSheets = vi.fn().mockResolvedValue({});

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		expect(result).toEqual([]);
	});

	test('should name the failing sheet when a sheet cannot be read', async () => {
		sheet.getData = vi.fn(async (range: string) => {
			if (range === 'Q2') throw new Error('Unable to parse range: Q2');
			return rowsBySheet[range];
		});

		await expect(
			execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, ''),
		).rejects.toThrow('Failed to read rows from sheet "Q2": Unable to parse range: Q2');
	});

	test('should throw a NodeOperationError when a sheet cannot be read', async () => {
		sheet.getData = vi.fn().mockRejectedValue(new Error('boom'));

		await expect(
			execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, ''),
		).rejects.toBeInstanceOf(NodeOperationError);
	});

	test('should route a failing sheet to the error output and keep the other rows when continueOnFail is set', async () => {
		mockExecuteFunctions.continueOnFail = vi.fn().mockReturnValue(true);
		sheet.getData = vi.fn(async (range: string) => {
			if (range === 'Q1') throw new Error('Quota exceeded');
			return rowsBySheet[range];
		});

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		// The failing sheet becomes an error item, keeping its name under `details`
		expect(result[0].json).toEqual({
			error: 'Failed to read rows from sheet "Q1": Quota exceeded',
			details: { sheet_name: 'Q1' },
		});
		expect(result[0].pairedItem).toEqual({ item: 0 });

		// The readable sheet's rows still come through
		expect(result.slice(1)).toEqual([
			{
				json: { sheet_name: 'Q2', name: 'Grace', amount: '20', row_number: 2 },
				pairedItem: { item: 0 },
			},
			{
				json: { sheet_name: 'Q2', name: 'Alan', amount: '30', row_number: 3 },
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should read every sheet once per input item, like single sheet mode', async () => {
		mockExecuteFunctions.getInputData = vi
			.fn()
			.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		// The sheet list is fetched once, then each of the two sheets is read once
		// per input item (2 sheets x 3 items = 6 reads)
		expect(sheet.spreadsheetGetSheets).toHaveBeenCalledTimes(1);
		expect(sheet.getData).toHaveBeenCalledTimes(6);
		// 3 input items x (1 row in Q1 + 2 rows in Q2) = 9 rows
		expect(result).toHaveLength(9);
	});

	test('should filter rows per sheet, returning nothing from a sheet without the filtered column', async () => {
		nodeParameters['filtersUI.values'] = [{ lookupColumn: 'amount', lookupValue: '20' }];
		rowsBySheet = {
			Q1: [
				['name', 'city'],
				['Ada', 'London'],
			],
			Q2: [
				['name', 'amount'],
				['Grace', '20'],
				['Alan', '30'],
			],
		};

		const result = await execute.call(mockExecuteFunctions as IExecuteFunctions, sheet, '');

		// Q1 has no "amount" column, so it contributes no rows for this filter; Q2
		// returns only the row where amount is 20
		expect(result).toEqual([
			{
				json: { sheet_name: 'Q2', name: 'Grace', amount: '20', row_number: 2 },
				pairedItem: { item: 0 },
			},
		]);
	});
});
