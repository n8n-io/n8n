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
const SEARCH_PATH = (q: string) =>
	`/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/root/search(q='${q}')`;
const BOOK = { id: 'wb1', name: 'Budget.xlsx', webUrl: 'https://c.sharepoint.com/b', file: {} };
const NOISE = [
	{ id: 'doc1', name: 'Notes.docx', file: {} },
	{ id: 'folder1', name: 'Archive.xlsx', folder: {} },
];

describe('Microsoft Excel (SharePoint) — Workbook: Get Many', () => {
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
		resource: 'workbook',
		operation: 'getAll',
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

	it("returns the library's workbooks and drops non-workbook results, up to the limit", async () => {
		setParams({ ...baseParams, returnAll: false, limit: 50 });
		apiRequest.mockResolvedValue({ value: [BOOK, ...NOISE] });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			SEARCH_PATH('.xlsx%20OR%20.xlsm'),
			{},
			{ $top: 50 },
		);
		expect(result[0].map((item) => item.json)).toEqual([BOOK]);
	});

	it('narrows the search with the typed filter', async () => {
		setParams({ ...baseParams, filter: 'budget', returnAll: false, limit: 50 });
		apiRequest.mockResolvedValue({ value: [BOOK] });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('GET', SEARCH_PATH('budget'), {}, { $top: 50 });
	});

	it('follows nextLink past filtered-out pages until the limit of workbooks is met', async () => {
		setParams({ ...baseParams, returnAll: false, limit: 2 });
		const BOOK2 = { ...BOOK, id: 'wb2' };
		apiRequest.mockImplementation(
			async (_method: string, _resource: string, _body: unknown, _qs: unknown, uri?: string) => {
				if (uri === 'https://graph.test/page2') {
					return { value: [BOOK, BOOK2], '@odata.nextLink': 'https://graph.test/page3' };
				}
				return { value: NOISE, '@odata.nextLink': 'https://graph.test/page2' };
			},
		);

		const result = await node.execute.call(ctx);

		// Page one is all noise; page two fills the limit, so page three is never fetched
		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'GET', '', {}, {}, 'https://graph.test/page2');
		expect(result[0].map((item) => item.json)).toEqual([BOOK, BOOK2]);
	});

	it('pages through everything when Return All is on', async () => {
		setParams({ ...baseParams, returnAll: true });
		apiRequestAllItems.mockResolvedValue([BOOK, ...NOISE, { ...BOOK, id: 'wb2' }]);

		const result = await node.execute.call(ctx);

		expect(apiRequestAllItems).toHaveBeenCalledWith(SEARCH_PATH('.xlsx%20OR%20.xlsm'), {});
		expect(result[0].map((item) => item.json)).toEqual([BOOK, { ...BOOK, id: 'wb2' }]);
	});

	it('keeps name and file in a narrowed $select so the workbook trim still works', async () => {
		setParams({ ...baseParams, returnAll: false, limit: 50, options: { fields: 'id,webUrl' } });
		apiRequest.mockResolvedValue({ value: [BOOK] });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			SEARCH_PATH('.xlsx%20OR%20.xlsm'),
			{},
			{ $select: 'id,webUrl,name,file', $top: 50 },
		);
	});

	it('rejects when no Library has been chosen yet', async () => {
		setParams({ ...baseParams, library: { mode: 'id', value: '' }, returnAll: false, limit: 50 });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Library' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
