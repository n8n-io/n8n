import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import {
	getTableColumns,
	getWorksheetColumnRow,
	getWorksheetColumnRowSkipColumnToMatchOn,
} from '../../methods/loadOptions';
import { MicrosoftExcelSharePoint } from '../../MicrosoftExcelSharePoint.node';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
		microsoftApiRequestAllItems: vi.fn(),
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const WORKBOOK_ROOT = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123`;
const SHEET_PATH = `${WORKBOOK_ROOT}/workbook/worksheets/Sheet1`;

describe('Microsoft Excel (SharePoint) — column loadOptions', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	// Extraction-aware, load-options arity: (name, fallback, options) — an
	// execute-style 4-arg read leaves the locator object unextracted, as at runtime.
	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(((
			name: string,
			fallback?: unknown,
			options?: { extractValue?: boolean },
		) => {
			const value = name in params ? params[name] : fallback;
			if (options?.extractValue && typeof value === 'object' && value !== null) {
				return (value as { value?: unknown }).value;
			}
			return value;
		}) as never);
	};

	const baseParams = {
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: { mode: 'id', value: 'Sheet1' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		setParams(baseParams);
	});

	it("offers the used range's header row when no range is set", async () => {
		apiRequest.mockResolvedValue({
			values: [
				['Name', 'Email'],
				['Frank', 'f@e.com'],
			],
		});

		const result = await getWorksheetColumnRow.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${SHEET_PATH}/usedRange`,
			{},
			{
				$select: 'values',
			},
		);
		expect(result).toEqual([
			{ name: 'Name', value: 'Name' },
			{ name: 'Email', value: 'Email' },
		]);
	});

	it("reads only the given range's first row when a range is set", async () => {
		setParams({ ...baseParams, range: 'A1:C5' });
		apiRequest.mockResolvedValue({ values: [['Name', 'Email', 'City']] });

		await getWorksheetColumnRow.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${SHEET_PATH}/range(address='A1:C1')`,
			{},
			{
				$select: 'values',
			},
		);
	});

	it('leaves the match column out of the values-to-send options', async () => {
		setParams({ ...baseParams, columnToMatchOn: 'Email' });
		apiRequest.mockResolvedValue({ values: [['Name', 'Email', 'City']] });

		const result = await getWorksheetColumnRowSkipColumnToMatchOn.call(ctx);

		expect(result).toEqual([
			{ name: 'Name', value: 'Name' },
			{ name: 'City', value: 'City' },
		]);
	});

	it("offers the table's columns for the values-to-send dropdown, extracting the table locator", async () => {
		const apiRequestAllItems = transport.microsoftApiRequestAllItems as Mock;
		setParams({ ...baseParams, table: { mode: 'list', value: 'Table1' } });
		apiRequestAllItems.mockResolvedValue([{ name: 'Name' }, { name: 'Email' }]);

		const result = await getTableColumns.call(ctx);

		expect(apiRequestAllItems).toHaveBeenCalledWith(
			`${WORKBOOK_ROOT}/workbook/tables/Table1/columns`,
			{
				$select: 'name',
			},
		);
		expect(result).toEqual([
			{ name: 'Name', value: 'Name' },
			{ name: 'Email', value: 'Email' },
		]);
	});

	it('is wired into the node as load-options methods', () => {
		const node = new MicrosoftExcelSharePoint();

		expect(node.methods?.loadOptions?.getTableColumns).toBe(getTableColumns);
		expect(node.methods?.loadOptions?.getWorksheetColumnRow).toBe(getWorksheetColumnRow);
		expect(node.methods?.loadOptions?.getWorksheetColumnRowSkipColumnToMatchOn).toBe(
			getWorksheetColumnRowSkipColumnToMatchOn,
		);
	});
});
