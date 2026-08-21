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
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const SHEET_PATH = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1`;
const SHEET = {
	address: 'Sheet1!A1:B4',
	values: [
		['Name', 'Email'],
		['Frank', 'frank@example.com'],
		['Dana', 'dana@example.com'],
		['Frank Two', 'frank@example.com'],
	],
};

describe('Microsoft Excel (SharePoint) — Sheet: Update and Append-or-Update', () => {
	let node: MicrosoftExcelSharePoint;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const baseParams = {
		resource: 'worksheet',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
		dataMode: 'autoMap',
		columnToMatchOn: 'Email',
	};

	const mockSheetReads = () => {
		apiRequest.mockImplementation(async (method: string, resource: string) => {
			if (method === 'GET' && resource.endsWith('/usedRange')) return { ...SHEET };
			return {
				address: 'Sheet1!A1:B2',
				values: [
					['Name', 'Email'],
					['Franklin', 'frank@example.com'],
				],
			};
		});
	};

	const patchCall = () => apiRequest.mock.calls.find((call: unknown[]) => call[0] === 'PATCH');

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

	it('updates the first matching row in place, leaving later matches alone', async () => {
		setParams({ ...baseParams, operation: 'update' });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Franklin', Email: 'frank@example.com' } }]);
		mockSheetReads();

		const result = await node.execute.call(ctx);

		const [, resource, body] = patchCall()!;
		expect(resource).toBe(`${SHEET_PATH}/range(address='A1:B4')`);
		expect(body).toEqual({
			values: [
				['Name', 'Email'],
				['Franklin', 'frank@example.com'],
				['Dana', 'dana@example.com'],
				['Frank Two', 'frank@example.com'],
			],
		});
		// Only the updated row comes back as output — the updatedRows wiring
		expect(result[0].map((item) => item.json)).toEqual([
			{ Name: 'Franklin', Email: 'frank@example.com' },
		]);
	});

	it('writes trailing empty rows back unchanged in Update — no trim, dimensions preserved', async () => {
		setParams({ ...baseParams, operation: 'update' });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Franklin', Email: 'frank@example.com' } }]);
		apiRequest.mockImplementation(async (method: string, resource: string) => {
			if (method === 'GET' && resource.endsWith('/usedRange')) {
				return {
					address: 'Sheet1!A1:B5',
					values: [...SHEET.values, ['', '']],
				};
			}
			return { address: 'Sheet1!A1:B5', values: [] };
		});

		await node.execute.call(ctx);

		const [, resource, body] = patchCall()!;
		expect(resource).toBe(`${SHEET_PATH}/range(address='A1:B5')`);
		expect((body as { values: string[][] }).values).toHaveLength(5);
		expect((body as { values: string[][] }).values.at(-1)).toEqual(['', '']);
	});

	it('appends below the used range, not the selected range', async () => {
		setParams({ ...baseParams, operation: 'upsert', range: 'A1:B2' });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'New Person', Email: 'new@example.com' } }]);
		apiRequest.mockImplementation(async (method: string, resource: string) => {
			if (method === 'GET' && resource.includes('/usedRange')) {
				return { address: 'Sheet1!A1:B4' };
			}
			if (method === 'GET') {
				return {
					address: 'Sheet1!A1:B2',
					values: [
						['Name', 'Email'],
						['Frank', 'frank@example.com'],
					],
				};
			}
			return { address: 'Sheet1!A1:B5', values: [] };
		});

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('GET', `${SHEET_PATH}/range(address='A1:B2')`);
		const [, resource, body] = patchCall()!;
		expect(resource).toBe(`${SHEET_PATH}/range(address='A1:B5')`);
		expect((body as { values: string[][] }).values.at(-1)).toEqual([
			'New Person',
			'new@example.com',
		]);
	});

	it('appends directly below the selected range when Append After Selected Range is on', async () => {
		setParams({
			...baseParams,
			operation: 'upsert',
			range: 'A1:B2',
			options: { appendAfterSelectedRange: true },
		});
		ctx.getInputData.mockReturnValue([{ json: { Name: 'New Person', Email: 'new@example.com' } }]);
		apiRequest.mockImplementation(async (method: string) => {
			if (method === 'GET') {
				return {
					address: 'Sheet1!A1:B2',
					values: [
						['Name', 'Email'],
						['Frank', 'frank@example.com'],
					],
				};
			}
			return { address: 'Sheet1!A1:B3', values: [] };
		});

		await node.execute.call(ctx);

		const [, resource] = patchCall()!;
		expect(resource).toBe(`${SHEET_PATH}/range(address='A1:B3')`);
		expect(apiRequest).not.toHaveBeenCalledWith(
			'GET',
			`${SHEET_PATH}/usedRange`,
			{},
			{ $select: 'address' },
		);
	});

	it('updates every matching row when Update All Matches is on', async () => {
		setParams({ ...baseParams, operation: 'update', options: { updateAll: true } });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Franklin', Email: 'frank@example.com' } }]);
		mockSheetReads();

		await node.execute.call(ctx);

		expect(patchCall()![2]).toEqual({
			values: [
				['Name', 'Email'],
				['Franklin', 'frank@example.com'],
				['Dana', 'dana@example.com'],
				['Franklin', 'frank@example.com'],
			],
		});
	});

	it('appends unmatched input below the used range in append-or-update', async () => {
		setParams({ ...baseParams, operation: 'upsert' });
		ctx.getInputData.mockReturnValue([{ json: { Name: 'New Person', Email: 'new@example.com' } }]);
		mockSheetReads();

		await node.execute.call(ctx);

		const [, resource, body] = patchCall()!;
		expect(resource).toBe(`${SHEET_PATH}/range(address='A1:B5')`);
		expect((body as { values: string[][] }).values.at(-1)).toEqual([
			'New Person',
			'new@example.com',
		]);
	});

	it('matches and updates via defined values, appending when nothing matches', async () => {
		setParams({
			...baseParams,
			operation: 'upsert',
			dataMode: 'define',
			valueToMatchOn: 'missing@example.com',
			'fieldsUi.values': [{ column: 'Name', fieldValue: 'Added' }],
		});
		mockSheetReads();

		await node.execute.call(ctx);

		const [, , body] = patchCall()!;
		expect((body as { values: string[][] }).values.at(-1)).toEqual([
			'Added',
			'missing@example.com',
		]);
	});

	it('applies Fields to the write-back response when RAW Data output is on in autoMap mode', async () => {
		setParams({
			...baseParams,
			operation: 'update',
			options: { rawData: true, fields: 'values,address' },
		});
		ctx.getInputData.mockReturnValue([{ json: { Name: 'Franklin', Email: 'frank@example.com' } }]);
		mockSheetReads();

		await node.execute.call(ctx);

		expect(patchCall()![3]).toEqual({ $select: 'values,address' });
	});

	it('writes raw values over the used range in RAW mode', async () => {
		setParams({
			...baseParams,
			operation: 'update',
			dataMode: 'raw',
			data: '[["Name","Email"],["Franklin","frank@example.com"]]',
		});
		mockSheetReads();

		const result = await node.execute.call(ctx);

		const [, resource, body] = patchCall()!;
		expect(resource).toBe(`${SHEET_PATH}/range(address='A1:B4')`);
		expect(body).toEqual({
			values: [
				['Name', 'Email'],
				['Franklin', 'frank@example.com'],
			],
		});
		expect(result[0].length).toBeGreaterThan(0);
	});

	it('keeps the run alive under continue-on-fail when the sheet read fails', async () => {
		setParams({ ...baseParams, operation: 'update' });
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValue(new Error('boom'));

		const result = await node.execute.call(ctx);

		// One error entry paired to every input item — the OneDrive node's
		// whole-batch continue-on-fail shape
		expect(result[0].length).toBe(1);
		expect(result[0][0].json).toEqual({ error: 'boom' });
		expect(result[0][0].pairedItem).toEqual([{ item: 0 }, { item: 1 }]);
	});
});
