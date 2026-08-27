import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { MicrosoftExcelSharePoint } from '../../MicrosoftExcelSharePoint.node';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helper
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const WORKBOOK_ROOT = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123`;
const SHEET_PATH = `${WORKBOOK_ROOT}/workbook/worksheets/Sheet1`;

describe('Microsoft Excel (SharePoint) — Sheet: Append', () => {
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
		resource: 'worksheet',
		operation: 'append',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftExcelSharePoint();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>());
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
	});

	it('auto-maps input data below existing rows', async () => {
		ctx.getInputData.mockReturnValue([{ json: { name: 'bob', age: 25 } }]);
		setParams({ ...byIdParams, dataMode: 'autoMap' });
		apiRequest
			.mockResolvedValueOnce({
				address: 'Sheet1!A1:B2',
				values: [
					['name', 'age'],
					['alice', 30],
				],
			})
			.mockResolvedValueOnce({ values: [['bob', 25]] });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A3:B3')`, {
			values: [['bob', 25]],
		});
		expect(result[0].map((item) => item.json)).toEqual([{ name: 'bob', age: 25 }]);
	});

	it('writes the defined fields below existing rows, in header order', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		setParams({
			...byIdParams,
			dataMode: 'define',
			'fieldsUi.values': [
				{ column: 'age', fieldValue: '40' },
				{ column: 'name', fieldValue: 'carl' },
			],
		});
		apiRequest
			.mockResolvedValueOnce({
				address: 'Sheet1!A1:B2',
				values: [
					['name', 'age'],
					['alice', 30],
				],
			})
			.mockResolvedValueOnce({ values: [['carl', '40']] });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A3:B3')`, {
			values: [['carl', '40']],
		});
		expect(result[0].map((item) => item.json)).toEqual([{ name: 'carl', age: '40' }]);
	});

	it('sends RAW values as-is and returns the RAW response under the configured property', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		setParams({
			...byIdParams,
			dataMode: 'raw',
			data: [
				['x', 'y'],
				['z', 'w'],
			],
			options: { rawData: true, dataProperty: 'raw' },
		});
		apiRequest
			.mockResolvedValueOnce({
				address: 'Sheet1!A1:B2',
				values: [
					['name', 'age'],
					['alice', 30],
				],
			})
			.mockResolvedValueOnce({
				values: [
					['x', 'y'],
					['z', 'w'],
				],
			});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A3:B4')`, {
			values: [
				['x', 'y'],
				['z', 'w'],
			],
		});
		expect(result[0][0].json).toEqual({
			raw: {
				values: [
					['x', 'y'],
					['z', 'w'],
				],
			},
		});
	});

	it('rejects RAW data that is not an array of arrays of strings', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		setParams({ ...byIdParams, dataMode: 'raw', data: [['x', 1]] });
		apiRequest.mockResolvedValue({ address: 'Sheet1!A1:B2', values: [['name', 'age']] });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'Data must be an array of arrays of strings',
		);
	});

	it('writes the header row first when appending to an empty sheet (auto-map)', async () => {
		ctx.getInputData.mockReturnValue([{ json: { name: 'dee', age: 19 } }]);
		setParams({ ...byIdParams, dataMode: 'autoMap' });
		apiRequest
			.mockResolvedValueOnce({ address: 'Sheet1!A1', values: [['']] })
			.mockResolvedValueOnce({
				values: [
					['name', 'age'],
					['dee', 19],
				],
			});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A1:B2')`, {
			values: [
				['name', 'age'],
				['dee', 19],
			],
		});
		expect(result[0].map((item) => item.json)).toEqual([{ name: 'dee', age: 19 }]);
	});

	it('writes the header row first when appending to an empty sheet (define)', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		setParams({
			...byIdParams,
			dataMode: 'define',
			'fieldsUi.values': [
				{ column: 'city', fieldValue: 'Berlin' },
				{ column: 'name', fieldValue: 'Sara' },
			],
		});
		apiRequest
			.mockResolvedValueOnce({ address: 'Sheet1!A1', values: [['']] })
			.mockResolvedValueOnce({
				values: [
					['city', 'name'],
					['Berlin', 'Sara'],
				],
			});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A1:B2')`, {
			values: [
				['city', 'name'],
				['Berlin', 'Sara'],
			],
		});
		expect(result[0].map((item) => item.json)).toEqual([{ city: 'Berlin', name: 'Sara' }]);
	});

	it('appends below a one-column sheet that already has just its header, without overwriting it', async () => {
		ctx.getInputData.mockReturnValue([{ json: { Notes: 'hello' } }]);
		setParams({ ...byIdParams, dataMode: 'autoMap' });
		apiRequest
			.mockResolvedValueOnce({ address: 'Sheet1!A1', values: [['Notes']] })
			.mockResolvedValueOnce({ values: [['hello']] });

		const result = await node.execute.call(ctx);

		// Must land on row 2, not overwrite the existing header at A1
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A2:A2')`, {
			values: [['hello']],
		});
		expect(result[0].map((item) => item.json)).toEqual([{ Notes: 'hello' }]);
	});

	it('writes one header for a multi-item batch appended to an empty sheet', async () => {
		ctx.getInputData.mockReturnValue([
			{ json: { name: 'bob', age: 25 } },
			{ json: { name: 'carl', age: 40 } },
		]);
		setParams({ ...byIdParams, dataMode: 'autoMap' });
		apiRequest
			.mockResolvedValueOnce({ address: 'Sheet1!A1', values: [['']] })
			.mockResolvedValueOnce({
				values: [
					['name', 'age'],
					['bob', 25],
					['carl', 40],
				],
			});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A1:B3')`, {
			values: [
				['name', 'age'],
				['bob', 25],
				['carl', 40],
			],
		});
		expect(result[0].map((item) => item.json)).toEqual([
			{ name: 'bob', age: 25 },
			{ name: 'carl', age: 40 },
		]);
	});

	it('rejects an empty Sheet', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		setParams({ ...byIdParams, dataMode: 'autoMap', worksheet: '' });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Sheet' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('batches every item into a single write, like the OneDrive node', async () => {
		ctx.getInputData.mockReturnValue([
			{ json: { name: 'bob', age: 25 } },
			{ json: { name: 'carl', age: 40 } },
		]);
		setParams({ ...byIdParams, dataMode: 'autoMap' });
		apiRequest
			.mockResolvedValueOnce({
				address: 'Sheet1!A1:B2',
				values: [
					['name', 'age'],
					['alice', 30],
				],
			})
			.mockResolvedValueOnce({
				values: [
					['bob', 25],
					['carl', 40],
				],
			});

		const result = await node.execute.call(ctx);

		// One GET, one PATCH, regardless of item count
		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PATCH', `${SHEET_PATH}/range(address='A3:B4')`, {
			values: [
				['bob', 25],
				['carl', 40],
			],
		});
		expect(result[0].map((item) => item.json)).toEqual([
			{ name: 'bob', age: 25 },
			{ name: 'carl', age: 40 },
		]);
	});

	it('keeps later items running when continue-on-fail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		const params = { ...byIdParams, dataMode: 'define' };
		ctx.getNodeParameter.mockImplementation(
			(name: string, itemIndex?: number, fallback?: unknown) => {
				if (name === 'fieldsUi.values' && itemIndex === 0) throw new Error('boom');
				if (name === 'fieldsUi.values') return [{ column: 'name', fieldValue: 'x' }] as never;
				return (name in params ? params[name as keyof typeof params] : fallback) as never;
			},
		);
		apiRequest
			.mockResolvedValueOnce({ address: 'Sheet1!A1:A2', values: [['name'], ['old']] })
			.mockResolvedValueOnce({ values: [['x']] });

		const result = await node.execute.call(ctx);

		// One shared GET + one shared PATCH, even with a bad item in the batch
		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result[0].map((item) => item.json)).toEqual([{ error: 'boom' }, { name: 'x' }]);
	});
});
