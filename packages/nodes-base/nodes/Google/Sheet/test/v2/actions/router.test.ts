import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { router } from '../../../v2/actions/router';
import { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheets - router', () => {
	const node: INode = {
		id: 'a1b2c3',
		name: 'Google Sheets',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.5,
		position: [0, 0],
		parameters: {},
	};

	const rowsBySheet: { [range: string]: string[][] } = {
		Q1: [['name'], ['Ada']],
		Q2: [['name'], ['Grace']],
	};

	let spreadsheetGetSheet: ReturnType<typeof vi.spyOn>;
	let spreadsheetGetSheets: ReturnType<typeof vi.spyOn>;
	let getData: ReturnType<typeof vi.spyOn>;
	let clearData: ReturnType<typeof vi.spyOn>;

	const executeFunctions = (parameters: { [key: string]: unknown }) =>
		({
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue(node),
			getNodeParameter: vi.fn(
				(name: string, _i: number, fallback?: unknown, options?: { extractValue?: boolean }) => {
					const value = parameters[name] ?? fallback;
					// Mirror how the engine unwraps a resource locator
					if (options?.extractValue && value !== null && typeof value === 'object') {
						return (value as { value?: unknown }).value;
					}
					return value;
				},
			),
			continueOnFail: vi.fn().mockReturnValue(false),
		}) as unknown as IExecuteFunctions;

	const readParameters = {
		resource: 'sheet',
		operation: 'read',
		documentId: { mode: 'id', value: 'spreadsheet-id' },
		options: {},
		'filtersUI.values': [],
		combineFilters: 'AND',
	};

	beforeEach(() => {
		spreadsheetGetSheet = vi
			.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet')
			.mockResolvedValue({ sheetId: 0, title: 'Q1' });
		spreadsheetGetSheets = vi
			.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheets')
			.mockResolvedValue({
				sheets: [
					{ properties: { sheetId: 0, title: 'Q1', sheetType: 'GRID' } },
					{ properties: { sheetId: 1, title: 'Q2', sheetType: 'GRID' } },
				],
			});
		getData = vi
			.spyOn(GoogleSheet.prototype, 'getData')
			.mockImplementation(async (range: string) => rowsBySheet[range]);
		clearData = vi.spyOn(GoogleSheet.prototype, 'clearData').mockResolvedValue({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('should resolve the selected sheet for a single sheet read', async () => {
		const [result] = await router.call(
			executeFunctions({
				...readParameters,
				sheetSelectionMode: 'single',
				sheetName: { mode: 'name', value: 'Q1' },
			}),
		);

		expect(spreadsheetGetSheet).toHaveBeenCalledWith(node, 'name', 'Q1');
		expect(getData).toHaveBeenCalledTimes(1);
		expect(result.map((item) => item.json.name)).toEqual(['Ada']);
	});

	test('should skip the sheet lookup and read every sheet in all sheets mode', async () => {
		const [result] = await router.call(
			executeFunctions({ ...readParameters, sheetSelectionMode: 'all' }),
		);

		expect(spreadsheetGetSheet).not.toHaveBeenCalled();
		expect(spreadsheetGetSheets).toHaveBeenCalledTimes(1);
		expect(result.map((item) => item.json.sheet_name)).toEqual(['Q1', 'Q2']);
	});

	test('should not read all sheets when the sheet selector is missing', async () => {
		const [result] = await router.call(
			executeFunctions({ ...readParameters, sheetName: { mode: 'name', value: 'Q1' } }),
		);

		expect(spreadsheetGetSheet).toHaveBeenCalledTimes(1);
		expect(result.map((item) => item.json.sheet_name)).toEqual([undefined]);
	});

	test('should still resolve the sheet for other operations', async () => {
		// A leftover "all" from a previous read must not reach the other operations,
		// none of which know how to run without a resolved sheet
		await router.call(
			executeFunctions({
				resource: 'sheet',
				operation: 'clear',
				documentId: { mode: 'id', value: 'spreadsheet-id' },
				sheetName: { mode: 'name', value: 'Q1' },
				sheetSelectionMode: 'all',
				clear: 'wholeSheet',
			}),
		);

		expect(spreadsheetGetSheet).toHaveBeenCalledWith(node, 'name', 'Q1');
		expect(clearData).toHaveBeenCalledWith('Q1');
	});
});
