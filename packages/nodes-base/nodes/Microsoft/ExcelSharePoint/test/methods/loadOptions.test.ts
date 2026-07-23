import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import {
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
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const SHEET_PATH = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1`;

describe('Microsoft Excel (SharePoint) — column loadOptions', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown) => (name in params ? params[name] : fallback) as never,
		);
	};

	const baseParams = {
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
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

	it('is wired into the node as load-options methods', () => {
		const node = new MicrosoftExcelSharePoint();

		expect(node.methods?.loadOptions?.getWorksheetColumnRow).toBe(getWorksheetColumnRow);
		expect(node.methods?.loadOptions?.getWorksheetColumnRowSkipColumnToMatchOn).toBe(
			getWorksheetColumnRowSkipColumnToMatchOn,
		);
	});
});
