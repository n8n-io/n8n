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

describe('Microsoft Excel (SharePoint) — Sheet: Clear', () => {
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
		operation: 'clear',
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
		worksheet: 'Sheet1',
		applyTo: 'All',
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

	it('clears the whole worksheet when no range is selected', async () => {
		setParams(byIdParams);
		apiRequest.mockResolvedValue({});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/range/clear`,
			{ applyTo: 'All' },
		);
		expect(result[0].map((item) => item.json)).toEqual([{ success: true }]);
	});

	it('clears a specific range when one is selected', async () => {
		setParams({ ...byIdParams, useRange: true, range: 'A1:B2' });
		apiRequest.mockResolvedValue({});

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/range(address='${encodeURIComponent('A1:B2')}')/clear`,
			{ applyTo: 'All' },
		);
	});

	it('does not use the Range field when Select a Range is off', async () => {
		setParams({ ...byIdParams, useRange: false, range: 'A1:B2' });
		apiRequest.mockResolvedValue({});

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/range/clear`,
			{ applyTo: 'All' },
		);
	});

	it.each(['All', 'Formats', 'Contents'])(
		'sends the %s Apply To choice to the API',
		async (applyTo) => {
			setParams({ ...byIdParams, applyTo });
			apiRequest.mockResolvedValue({});

			await node.execute.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'POST',
				`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/range/clear`,
				{ applyTo },
			);
		},
	);

	it('rejects an empty Sheet', async () => {
		setParams({ ...byIdParams, worksheet: '' });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Sheet' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty Site when the workbook is chosen by ID', async () => {
		setParams({ ...byIdParams, site: { mode: 'id', value: '' } });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('keeps later items running when continue-on-fail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		setParams(byIdParams);
		apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});

		const result = await node.execute.call(ctx);

		expect(result[0].map((item) => item.json)).toEqual([{ error: 'boom' }, { success: true }]);
	});
});
