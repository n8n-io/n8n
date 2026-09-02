import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

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
const TABLE_ENDPOINT = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123/workbook/tables/%7BT1%7D`;
const ROWS = [
	{ index: 0, values: [['Frank', 'frank@example.com']] },
	{ index: 1, values: [['Dana', 'dana@example.com']] },
];
const COLUMNS = [{ name: 'Name' }, { name: 'Email' }];
const ROW_OBJECTS = [
	{ Name: 'Frank', Email: 'frank@example.com' },
	{ Name: 'Dana', Email: 'dana@example.com' },
];

describe('Microsoft Excel (SharePoint) — Table: Get Rows, Get Columns, Lookup', () => {
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
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: { mode: 'id', value: 'Sheet1' },
		table: '{T1}',
	};

	const mockRowsAndColumns = (rows: unknown[] = ROWS) => {
		apiRequest.mockResolvedValue({ value: rows });
		apiRequestAllItems.mockImplementation(async (endpoint: string) =>
			endpoint.endsWith('/columns') ? COLUMNS : rows,
		);
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

	describe('getRows', () => {
		it('maps each row to an object keyed by the column names, matching the OneDrive node', async () => {
			setParams({ ...byIdParams, operation: 'getRows', returnAll: false, limit: 50 });
			mockRowsAndColumns();

			const result = await node.execute.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith('GET', `${TABLE_ENDPOINT}/rows`, {}, { $top: 50 });
			expect(apiRequestAllItems).toHaveBeenCalledWith(`${TABLE_ENDPOINT}/columns`, {
				$select: 'name',
			});
			expect(result[0].map((item) => item.json)).toEqual(ROW_OBJECTS);
		});

		it('fetches every row page when Return All is on', async () => {
			setParams({ ...byIdParams, operation: 'getRows', returnAll: true });
			mockRowsAndColumns();

			const result = await node.execute.call(ctx);

			expect(apiRequest).not.toHaveBeenCalled();
			expect(apiRequestAllItems).toHaveBeenCalledWith(`${TABLE_ENDPOINT}/rows`, {});
			expect(result[0].map((item) => item.json)).toEqual(ROW_OBJECTS);
		});

		it('passes the reply through untouched under the data property in RAW mode', async () => {
			setParams({
				...byIdParams,
				operation: 'getRows',
				returnAll: false,
				limit: 100,
				rawData: true,
				dataProperty: 'raw',
				options: { fields: 'index,values' },
			});
			apiRequest.mockResolvedValue({ value: ROWS });

			const result = await node.execute.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				`${TABLE_ENDPOINT}/rows`,
				{},
				{ $select: 'index,values', $top: 100 },
			);
			expect(apiRequestAllItems).not.toHaveBeenCalled();
			expect(result[0]).toEqual([{ json: { raw: ROWS }, pairedItem: { item: 0 } }]);
		});

		it('keeps a column named like an object internal as a plain row key', async () => {
			setParams({ ...byIdParams, operation: 'getRows', returnAll: false, limit: 50 });
			apiRequest.mockResolvedValue({ value: [{ index: 0, values: [['x', 'y']] }] });
			apiRequestAllItems.mockResolvedValue([{ name: '__proto__' }, { name: 'ok' }]);

			const result = await node.execute.call(ctx);

			expect(Object.getPrototypeOf(result[0][0].json)).toBe(Object.prototype);
			expect(Object.keys(result[0][0].json)).toEqual(['__proto__', 'ok']);
		});
	});

	describe('getColumns', () => {
		it('returns the column names, matching the OneDrive node', async () => {
			setParams({ ...byIdParams, operation: 'getColumns', returnAll: false, limit: 50 });
			apiRequest.mockResolvedValue({ value: [...COLUMNS] });

			const result = await node.execute.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith('GET', `${TABLE_ENDPOINT}/columns`, {}, { $top: 50 });
			expect(result[0].map((item) => item.json)).toEqual([{ name: 'Name' }, { name: 'Email' }]);
		});

		it('passes the reply through untouched under the data property in RAW mode', async () => {
			setParams({
				...byIdParams,
				operation: 'getColumns',
				returnAll: true,
				rawData: true,
				dataProperty: 'data',
			});
			apiRequestAllItems.mockResolvedValue([...COLUMNS]);

			const result = await node.execute.call(ctx);

			expect(apiRequestAllItems).toHaveBeenCalledWith(`${TABLE_ENDPOINT}/columns`, {});
			expect(result[0]).toEqual([{ json: { data: COLUMNS }, pairedItem: { item: 0 } }]);
		});
	});

	describe('lookup', () => {
		const lookupParams = {
			...byIdParams,
			operation: 'lookup',
			lookupColumn: 'Email',
			lookupValue: 'frank@example.com',
		};
		const FRANK_TWICE = [...ROWS, { index: 2, values: [['Frank again', 'frank@example.com']] }];

		it('returns only the first match by default', async () => {
			setParams(lookupParams);
			mockRowsAndColumns(FRANK_TWICE);

			const result = await node.execute.call(ctx);

			expect(result[0].map((item) => item.json)).toEqual([ROW_OBJECTS[0]]);
		});

		it('returns every match when Return All Matches is on', async () => {
			setParams({ ...lookupParams, options: { returnAllMatches: true } });
			mockRowsAndColumns(FRANK_TWICE);

			const result = await node.execute.call(ctx);

			expect(result[0].map((item) => item.json)).toEqual([
				ROW_OBJECTS[0],
				{ Name: 'Frank again', Email: 'frank@example.com' },
			]);
		});

		it('returns no items when nothing matches', async () => {
			setParams({ ...lookupParams, lookupValue: 'nobody@example.com' });
			mockRowsAndColumns();

			const result = await node.execute.call(ctx);

			expect(result[0]).toEqual([]);
		});

		it('names the missing column when it does not exist on the table', async () => {
			setParams({ ...lookupParams, lookupColumn: 'Phone' });
			mockRowsAndColumns();

			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Column Phone does not exist on the table selected',
			);
		});
	});
});
