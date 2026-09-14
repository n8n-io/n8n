import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { MicrosoftExcelSharePoint } from '../../MicrosoftExcelSharePoint.node';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helpers. `microsoftApiRequestAllItems`
// is mocked too (not just `microsoftApiRequest`): it calls `microsoftApiRequest`
// via this module's own internal binding, which a mock of the named export
// doesn't intercept — its own paging behaviour is covered in transport.test.ts.
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
const SHEET1 = { id: '{00000000-0000-0000-0000-000000000001}', name: 'Sheet1', position: 0 };
const SHEET2 = { id: '{00000000-0000-0000-0000-000000000002}', name: 'Sheet2', position: 1 };

describe('Microsoft Excel (SharePoint) — Sheet: Get Many', () => {
	let node: MicrosoftExcelSharePoint;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;
	const apiRequestAllItems = transport.microsoftApiRequestAllItems as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const byIdParams = {
		resource: 'worksheet',
		operation: 'getAll',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftExcelSharePoint();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
	});

	it('lists the sheets in the workbook, up to the given limit', async () => {
		setParams({ ...byIdParams, returnAll: false, limit: 50 });
		apiRequest.mockResolvedValue({ value: [SHEET1, SHEET2] });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/worksheets`,
			{},
			{ $top: 50 },
		);
		expect(result[0].map((item) => item.json)).toEqual([SHEET1, SHEET2]);
	});

	it('returns every sheet when Return All is on', async () => {
		setParams({ ...byIdParams, returnAll: true });
		apiRequestAllItems.mockResolvedValue([SHEET1, SHEET2]);

		const result = await node.execute.call(ctx);

		expect(apiRequestAllItems).toHaveBeenCalledWith(`${WORKBOOK_ROOT}/workbook/worksheets`, {});
		expect(apiRequest).not.toHaveBeenCalled();
		expect(result[0].map((item) => item.json)).toEqual([SHEET1, SHEET2]);
	});

	it('requests only the chosen fields', async () => {
		setParams({ ...byIdParams, returnAll: false, limit: 100, options: { fields: 'id,name' } });
		apiRequest.mockResolvedValue({ value: [SHEET1] });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/worksheets`,
			{},
			{ $select: 'id,name', $top: 100 },
		);
	});

	it('rejects an empty Site when the workbook is chosen by ID', async () => {
		setParams({ ...byIdParams, site: { mode: 'id', value: '' } });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('keeps later items running when continue-on-fail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		setParams({ ...byIdParams, returnAll: false, limit: 100 });
		apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ value: [SHEET1] });

		const result = await node.execute.call(ctx);

		expect(result[0].map((item) => item.json)).toEqual([{ error: 'boom' }, SHEET1]);
	});
});
