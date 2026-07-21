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

describe('Microsoft Excel (SharePoint) — Workbook: Add Sheet', () => {
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
		resource: 'workbook',
		operation: 'addWorksheet',
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

	it('opens a session, adds the sheet with the session header, then closes the session', async () => {
		setParams(byIdParams);
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource === `${WORKBOOK_ROOT}/workbook/createSession`) return { id: 'session-abc' };
			if (resource === `${WORKBOOK_ROOT}/workbook/worksheets/add`)
				return { id: 'sheet-1', name: 'Sheet2' };
			if (resource === `${WORKBOOK_ROOT}/workbook/closeSession`) return {};
			throw new Error(`unexpected request: ${resource}`);
		});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			`${WORKBOOK_ROOT}/workbook/createSession`,
			{ persistChanges: true },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/add`,
			{},
			{},
			undefined,
			{ 'workbook-session-id': 'session-abc' },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			`${WORKBOOK_ROOT}/workbook/closeSession`,
			{},
			{},
			undefined,
			{ 'workbook-session-id': 'session-abc' },
		);
		expect(result[0][0].json).toEqual({ id: 'sheet-1', name: 'Sheet2' });
	});

	it('sends the chosen name in the request body', async () => {
		setParams({ ...byIdParams, options: { name: 'Q4' } });
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) return { id: 'session-abc' };
			return { id: 'sheet-1', name: 'Q4' };
		});

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${WORKBOOK_ROOT}/workbook/worksheets/add`,
			{ name: 'Q4' },
			{},
			undefined,
			{ 'workbook-session-id': 'session-abc' },
		);
	});

	it('still closes the session when adding the sheet fails', async () => {
		setParams(byIdParams);
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) return { id: 'session-abc' };
			if (resource.endsWith('/worksheets/add')) throw new Error('boom');
			return {};
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('boom');

		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(apiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			`${WORKBOOK_ROOT}/workbook/closeSession`,
			{},
			{},
			undefined,
			{ 'workbook-session-id': 'session-abc' },
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
		setParams(byIdParams);
		let createSessionCalls = 0;
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource.endsWith('/createSession')) {
				createSessionCalls++;
				if (createSessionCalls === 1) throw new Error('boom');
				return { id: 'session-abc' };
			}
			if (resource.endsWith('/worksheets/add')) return { id: 'sheet-1' };
			return {};
		});

		const result = await node.execute.call(ctx);

		expect(result[0].map((item) => item.json)).toEqual([{ error: 'boom' }, { id: 'sheet-1' }]);
	});
});
