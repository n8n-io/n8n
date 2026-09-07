import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getTables } from '../../methods/listSearch';
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
const WORKBOOK_ROOT = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123`;
const NEW_TABLE = { id: '{T9}', name: 'Table9' };

describe('Microsoft Excel (SharePoint) — Table: Create, Convert to Range, Delete', () => {
	let node: MicrosoftExcelSharePoint;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const byIdParams = {
		resource: 'table',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
		table: '{T1}',
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

	it('creates a table from a manually chosen range and returns it', async () => {
		setParams({
			...byIdParams,
			operation: 'create',
			selectRange: 'manual',
			range: 'A1:B2',
			hasHeaders: true,
		});
		apiRequest.mockResolvedValue({ ...NEW_TABLE });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/tables/add`,
			{ address: 'A1:B2', hasHeaders: true },
		);
		expect(result[0].map((item) => item.json)).toEqual([NEW_TABLE]);
	});

	it('reads the used range when the range is chosen automatically', async () => {
		setParams({ ...byIdParams, operation: 'create', selectRange: 'auto', hasHeaders: false });
		apiRequest
			.mockResolvedValueOnce({ address: 'Sheet1!A1:C7' })
			.mockResolvedValueOnce({ ...NEW_TABLE });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/usedRange`,
			{},
			{ $select: 'address' },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/tables/add`,
			{ address: 'A1:C7', hasHeaders: false },
		);
	});

	it('shows a created table in the table dropdown afterwards', async () => {
		const loadCtx = mockDeep<ILoadOptionsFunctions>();
		loadCtx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		loadCtx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown) =>
				(name in byIdParams ? byIdParams[name as keyof typeof byIdParams] : fallback) as never,
		);
		apiRequest.mockResolvedValue({ value: [NEW_TABLE] });

		const result = await getTables.call(loadCtx);

		expect(result.results).toEqual([{ name: 'Table9', value: '{T9}' }]);
	});

	it('converts a table to a plain range, matching the OneDrive node', async () => {
		setParams({ ...byIdParams, operation: 'convertToRange' });
		apiRequest.mockResolvedValue({ address: 'Sheet1!A1:B2' });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${WORKBOOK_ROOT}/workbook/tables/%7BT1%7D/convertToRange`,
		);
		expect(result[0].map((item) => item.json)).toEqual([{ address: 'Sheet1!A1:B2' }]);
	});

	it('deletes a table and reports success, matching the OneDrive node', async () => {
		setParams({ ...byIdParams, operation: 'deleteTable' });
		apiRequest.mockResolvedValue({});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('DELETE', `${WORKBOOK_ROOT}/workbook/tables/%7BT1%7D`);
		expect(result[0].map((item) => item.json)).toEqual([{ success: true }]);
	});
});
