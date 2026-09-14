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
const TABLE1 = { id: '{00000000-0000-0000-0000-000000000011}', name: 'Table1' };
const TABLE2 = { id: '{00000000-0000-0000-0000-000000000012}', name: 'Table2' };

describe('Microsoft Excel (SharePoint) — Table: Get Many', () => {
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
		resource: 'table',
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

	it('lists the tables in the workbook, up to the given limit', async () => {
		setParams({ ...byIdParams, returnAll: false, limit: 50 });
		apiRequest.mockResolvedValue({ value: [TABLE1, TABLE2] });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/tables`,
			{},
			{ $top: 50 },
		);
		expect(result[0].map((item) => item.json)).toEqual([TABLE1, TABLE2]);
	});

	it('returns every table when Return All is on', async () => {
		setParams({ ...byIdParams, returnAll: true });
		apiRequestAllItems.mockResolvedValue([TABLE1, TABLE2]);

		const result = await node.execute.call(ctx);

		expect(apiRequestAllItems).toHaveBeenCalledWith(`${WORKBOOK_ROOT}/workbook/tables`, {});
		expect(apiRequest).not.toHaveBeenCalled();
		expect(result[0].map((item) => item.json)).toEqual([TABLE1, TABLE2]);
	});

	it('requests only the chosen fields', async () => {
		setParams({ ...byIdParams, returnAll: false, limit: 100, options: { fields: 'id,name' } });
		apiRequest.mockResolvedValue({ value: [TABLE1] });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/tables`,
			{},
			{ $select: 'id,name', $top: 100 },
		);
	});

	it('rejects a dots-only Workbook ID', async () => {
		setParams({ ...byIdParams, workbook: { mode: 'id', value: '..' } });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Workbook' value is not valid");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('keeps later items running when continue-on-fail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		setParams({ ...byIdParams, returnAll: false, limit: 100 });
		apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ value: [TABLE1] });

		const result = await node.execute.call(ctx);

		expect(result[0].map((item) => item.json)).toEqual([{ error: 'boom' }, TABLE1]);
	});
});
