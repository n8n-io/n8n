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
const USED_RANGE_REPLY = {
	address: 'Sheet1!A1:B2',
	values: [
		['name', 'age'],
		['alice', 30],
	],
};

describe('Microsoft Excel (SharePoint) — Sheet: Get Rows', () => {
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
		operation: 'readRows',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
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

	it('reads the used range for site, library, and workbook IDs, parsing rows into objects', async () => {
		setParams(byIdParams);
		apiRequest.mockResolvedValue({ ...USED_RANGE_REPLY });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/usedRange`,
			{},
			{},
		);
		expect(result[0].map((item) => item.json)).toEqual([{ name: 'alice', age: 30 }]);
	});

	it('reads a specific range when one is selected', async () => {
		setParams({ ...byIdParams, useRange: true, range: 'A1:B2' });
		apiRequest.mockResolvedValue({ ...USED_RANGE_REPLY });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/range(address='${encodeURIComponent('A1:B2')}')`,
			{},
			{},
		);
	});

	it('rejects a generic range', async () => {
		setParams({ ...byIdParams, useRange: true, range: 'A:B' });

		await expect(node.execute.call(ctx)).rejects.toThrow('Specify the range more precisely');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty Site when the workbook is chosen by ID', async () => {
		setParams({ ...byIdParams, site: { mode: 'id', value: '' } });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves a pasted workbook address once per execution across items', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		setParams({
			...byIdParams,
			workbook: {
				mode: 'url',
				value: 'https://contoso.sharepoint.com/sites/site1/Shared Documents/Q4 ~ report?.xlsx',
			},
		});
		apiRequest.mockImplementation(async (_method: string, resource: string) =>
			resource.startsWith('/v1.0/shares/')
				? { id: 'ITEM123', parentReference: { siteId: SITE_ID, driveId: 'b!drive1' } }
				: { ...USED_RANGE_REPLY },
		);

		const result = await node.execute.call(ctx);

		// 1 address resolution (cached) + 2 reads
		expect(apiRequest).toHaveBeenCalledTimes(3);
		// Pins Graph's sharing-URL scheme: unpadded URL-safe base64 ('/' becomes '_', '=' stripped)
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/v1.0/shares/u!aHR0cHM6Ly9jb250b3NvLnNoYXJlcG9pbnQuY29tL3NpdGVzL3NpdGUxL1NoYXJlZCBEb2N1bWVudHMvUTQgfiByZXBvcnQ_Lnhsc3g/driveItem',
			{},
			{ $select: 'id,parentReference' },
		);
		expect(result[0]).toHaveLength(2);
	});

	it('requests only the chosen fields for RAW output', async () => {
		setParams({ ...byIdParams, options: { rawData: true, fields: 'values,address' } });
		apiRequest.mockResolvedValue({ ...USED_RANGE_REPLY });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/usedRange`,
			{},
			{ $select: 'values,address' },
		);
		expect(result[0][0].json).toEqual({ data: USED_RANGE_REPLY });
	});

	it('keeps later items running when continue-on-fail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		setParams(byIdParams);
		apiRequest
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({ ...USED_RANGE_REPLY });

		const result = await node.execute.call(ctx);

		expect(result[0].map((item) => item.json)).toEqual([
			{ error: 'boom' },
			{ name: 'alice', age: 30 },
		]);
	});

	it('rejects a dots-only Workbook ID', async () => {
		setParams({ ...byIdParams, workbook: { mode: 'id', value: '..' } });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Workbook' value is not valid");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty Sheet', async () => {
		setParams({ ...byIdParams, worksheet: '' });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Sheet' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('validates the range before resolving a pasted address', async () => {
		setParams({
			...byIdParams,
			workbook: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1/book.xlsx' },
			useRange: true,
			range: 'A:B',
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('Specify the range more precisely');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('throws a clear error for an unknown operation', async () => {
		setParams({ resource: 'worksheet', operation: 'appendRows' });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'The operation "appendRows" is not supported!',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
