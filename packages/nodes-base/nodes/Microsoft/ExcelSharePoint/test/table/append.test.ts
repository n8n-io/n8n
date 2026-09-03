import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
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
const WORKBOOK_ROOT = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123`;
const TABLE_ENDPOINT = `${WORKBOOK_ROOT}/workbook/tables/Table1`;
const SESSION_HEADER = { 'workbook-session-id': 'session-1' };

describe('Microsoft Excel (SharePoint) — Table: Append', () => {
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

	const baseParams = {
		resource: 'table',
		operation: 'append',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
		table: 'Table1',
		dataMode: 'autoMap',
	};

	const mockColumnsAndSession = () => {
		apiRequestAllItems.mockResolvedValue([{ name: 'Name' }, { name: 'Email' }]);
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) return { id: 'session-1' };
			if (resource.endsWith('/rows/add')) {
				return { index: 3, values: [['Frank', 'frank@example.com']] };
			}
			return {};
		});
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

	it('auto-maps input onto the table columns and writes inside a session, in order', async () => {
		setParams(baseParams);
		ctx.getInputData.mockReturnValue([
			{ json: { Email: 'frank@example.com', Name: 'Frank', Ignored: 'x' } },
			{ json: { Name: 'Dana' } },
		]);
		mockColumnsAndSession();

		const result = await node.execute.call(ctx);

		expect(apiRequestAllItems).toHaveBeenCalledWith(`${TABLE_ENDPOINT}/columns`, {
			$select: 'name',
		});
		const calls = apiRequest.mock.calls.map((call: unknown[]) => String(call[1]));
		expect(calls).toEqual([
			`${WORKBOOK_ROOT}/workbook/createSession`,
			`${TABLE_ENDPOINT}/rows/add`,
			`${WORKBOOK_ROOT}/workbook/closeSession`,
		]);
		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${TABLE_ENDPOINT}/rows/add`,
			{
				values: [
					['Frank', 'frank@example.com'],
					['Dana', null],
				],
			},
			{},
			undefined,
			SESSION_HEADER,
		);
		expect(apiRequest).toHaveBeenCalledWith('POST', `${WORKBOOK_ROOT}/workbook/createSession`, {
			persistChanges: true,
		});
		expect(result[0].length).toBeGreaterThan(0);
	});

	it('maps defined fields per item onto the columns, matching the OneDrive node', async () => {
		const fieldsByItem = [
			[{ column: 'Email', fieldValue: 'new@example.com' }],
			[{ column: 'Name', fieldValue: 'Dana' }],
		];
		const params: Record<string, unknown> = { ...baseParams, dataMode: 'define' };
		ctx.getNodeParameter.mockImplementation(
			(name: string, itemIndex?: number, fallback?: unknown) =>
				(name === 'fieldsUi.values'
					? fieldsByItem[itemIndex ?? 0]
					: name in params
						? params[name]
						: fallback) as never,
		);
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockColumnsAndSession();

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${TABLE_ENDPOINT}/rows/add`,
			{
				values: [
					[null, 'new@example.com'],
					['Dana', null],
				],
			},
			{},
			undefined,
			SESSION_HEADER,
		);
	});

	it('sends the row-position index when set', async () => {
		setParams({ ...baseParams, options: { index: 2 } });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Frank' } }]);
		mockColumnsAndSession();

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${TABLE_ENDPOINT}/rows/add`,
			expect.objectContaining({ index: 2 }),
			{},
			undefined,
			SESSION_HEADER,
		);
	});

	it('sends index 0 so the row is inserted as the first row', async () => {
		setParams({ ...baseParams, options: { index: 0 } });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Frank' } }]);
		mockColumnsAndSession();

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${TABLE_ENDPOINT}/rows/add`,
			expect.objectContaining({ index: 0 }),
			{},
			undefined,
			SESSION_HEADER,
		);
	});

	it('names the Index option when Graph rejects an out-of-range insert position', async () => {
		setParams({ ...baseParams, options: { index: 50 } });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Frank' } }]);
		apiRequestAllItems.mockResolvedValue([{ name: 'Name' }]);
		const graphMessage = 'The argument is invalid or missing or has an incorrect format.';
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) return { id: 'session-1' };
			if (resource.endsWith('/rows/add')) {
				throw new NodeApiError(
					mock<INode>(),
					{ message: graphMessage },
					{ message: graphMessage, httpCode: '400' },
				);
			}
			return {};
		});

		await expect(node.execute.call(ctx)).rejects.toMatchObject({
			message: graphMessage,
			description: expect.stringContaining(
				"the 'Index' option (50) is higher than the table's current row count",
			),
		});
	});

	it('pairs each appended row with the input item that produced it', async () => {
		setParams(baseParams);
		ctx.getInputData.mockReturnValue([
			{ json: { Name: 'Frank', Email: 'frank@example.com' } },
			{ json: { Name: 'Dana' } },
		]);
		apiRequestAllItems.mockResolvedValue([{ name: 'Name' }, { name: 'Email' }]);
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) return { id: 'session-1' };
			if (resource.endsWith('/rows/add')) {
				return {
					index: 3,
					values: [
						['Frank', 'frank@example.com'],
						['Dana', null],
					],
				};
			}
			return {};
		});

		const result = await node.execute.call(ctx);

		expect(result[0].map((entry) => entry.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
		expect(result[0][0].json).toEqual({ Name: 'Frank', Email: 'frank@example.com' });
		expect(result[0][1].json).toEqual({ Name: 'Dana', Email: null });
	});

	it('closes the session and keeps the run alive when the write fails under continue-on-fail', async () => {
		setParams(baseParams);
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequestAllItems.mockResolvedValue([{ name: 'Name' }]);
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) return { id: 'session-1' };
			if (resource.endsWith('/rows/add')) throw new Error('boom');
			return {};
		});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${WORKBOOK_ROOT}/workbook/closeSession`,
			{},
			{},
			undefined,
			SESSION_HEADER,
		);
		expect(result[0].length).toBe(1);
		expect(result[0][0].json).toEqual({ error: 'boom' });
		expect(result[0][0].pairedItem).toEqual([{ item: 0 }, { item: 1 }]);
	});
});
