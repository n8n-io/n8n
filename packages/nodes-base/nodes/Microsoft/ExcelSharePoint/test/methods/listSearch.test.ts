import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { libraryRLC, siteRLC } from '../../descriptions/common.descriptions';
import { SERVICE_PRINCIPAL_AUTH } from '../../helpers/constants';
import { getSheets, getTables, searchLibraries, searchSites } from '../../methods/listSearch';
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
const SHEET1 = { id: '{00000000-0000-0000-0000-000000000001}', name: 'Sheet1' };
const SHEET2 = { id: '{00000000-0000-0000-0000-000000000002}', name: 'Costs' };
const TABLE1 = { id: '{00000000-0000-0000-0000-000000000011}', name: 'Table1' };
const TABLE2 = { id: '{00000000-0000-0000-0000-000000000012}', name: 'Expenses' };

describe('Microsoft Excel (SharePoint) — dropdown search methods', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const byIdParams = {
		workbook: { mode: 'id', value: 'ITEM123' },
		site: { mode: 'id', value: SITE_ID },
		library: { mode: 'id', value: 'b!drive1' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		setParams({ authentication: 'microsoftOAuth2Api' });
	});

	describe('searchSites', () => {
		it('searches sites by name using the literal `search` parameter', async () => {
			apiRequest.mockResolvedValue({
				value: [
					{ id: 'site-b', displayName: 'Marketing B', webUrl: 'https://c.sharepoint.com/sites/b' },
					{ id: 'site-a', displayName: 'Marketing A', webUrl: 'https://c.sharepoint.com/sites/a' },
				],
			});

			const result = await searchSites.call(ctx, 'marketing');

			// Graph quirk: `search`, not `$search`
			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites',
				{},
				{ search: 'marketing', $select: 'id,displayName,webUrl' },
			);
			// Kept in the API's order — no client-side sort
			expect(result.results).toEqual([
				{ name: 'Marketing B', value: 'site-b', url: 'https://c.sharepoint.com/sites/b' },
				{ name: 'Marketing A', value: 'site-a', url: 'https://c.sharepoint.com/sites/a' },
			]);
		});

		it('lists all sites when no search text is given', async () => {
			apiRequest.mockResolvedValue({ value: [] });

			await searchSites.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites',
				{},
				{ search: '*', $select: 'id,displayName,webUrl' },
			);
		});

		it('labels a site without a display name by its ID, and drops entries without one', async () => {
			apiRequest.mockResolvedValue({ value: [{ id: 'bare-site' }, { displayName: 'No ID' }] });

			const result = await searchSites.call(ctx);

			expect(result.results).toEqual([{ name: 'bare-site', value: 'bare-site', url: undefined }]);
		});

		it('hands back the next-page link and requests it exactly as returned', async () => {
			const nextLink = 'https://graph.microsoft.com/v1.0/sites?search=%2A&$skiptoken=abc';
			apiRequest.mockResolvedValueOnce({
				value: [{ id: 's1', displayName: 'One' }],
				'@odata.nextLink': nextLink,
			});

			const firstPage = await searchSites.call(ctx);
			expect(firstPage.paginationToken).toBe(nextLink);

			apiRequest.mockResolvedValueOnce({ value: [{ id: 's2', displayName: 'Two' }] });
			const secondPage = await searchSites.call(ctx, undefined, nextLink);

			// The link is a complete address — passed through verbatim, never rebuilt
			expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
			expect(secondPage.results).toEqual([{ name: 'Two', value: 's2', url: undefined }]);
			expect(secondPage.paginationToken).toBeUndefined();
		});

		it('points app-only sign-ins without search rights at the other modes', async () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH });
			apiRequest.mockRejectedValue(
				new NodeApiError(mock<INode>(), { message: 'refused' }, { httpCode: '403' }),
			);

			await expect(searchSites.call(ctx)).rejects.toThrow('This app sign-in cannot search sites');
		});

		it('keeps the permission-naming message for delegated refusals', async () => {
			setParams({ authentication: 'microsoftOAuth2Api' });
			// Mirrors the transport's delegated 403 shape: microsoftApiRequest has
			// already mapped the raw Graph error into a NodeApiError with the
			// permission-naming message baked into `error.message`
			apiRequest.mockRejectedValue(
				new NodeApiError(
					mock<INode>(),
					{ message: 'refused' },
					{
						httpCode: '403',
						message: 'the credential may be missing the Sites.Read.All permission',
					},
				),
			);

			await expect(searchSites.call(ctx)).rejects.toThrow(/Sites\.Read\.All/);
		});

		it('lets a non-403 failure bubble up unchanged', async () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH });
			apiRequest.mockRejectedValue(
				new NodeApiError(mock<INode>(), {}, { httpCode: '500', message: 'boom' }),
			);

			await expect(searchSites.call(ctx)).rejects.toThrow('boom');
		});
	});

	describe('searchLibraries', () => {
		it("lists the chosen site's document libraries", async () => {
			setParams({ site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' } });
			apiRequest.mockResolvedValue({
				value: [
					{ id: 'b!drive1', name: 'Documents', webUrl: 'https://c.sharepoint.com/Documents' },
					{ id: 'b!drive2', name: 'Reports' },
				],
			});

			const result = await searchLibraries.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives',
				{},
				{ $select: 'id,name,webUrl' },
			);
			expect(result.results).toEqual([
				{ name: 'Documents', value: 'b!drive1', url: 'https://c.sharepoint.com/Documents' },
				{ name: 'Reports', value: 'b!drive2', url: undefined },
			]);
		});

		it('resolves a pasted Site address before listing libraries', async () => {
			setParams({ site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' } });
			apiRequest.mockImplementation(async (_method: string, resource: string) =>
				resource.startsWith('/v1.0/sites/contoso.sharepoint.com:')
					? { id: 'contoso.sharepoint.com,g1,g2' }
					: { value: [{ id: 'b!drive1', name: 'Documents' }] },
			);

			const result = await searchLibraries.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites/contoso.sharepoint.com:/sites/mysite',
				{},
				{ $select: 'id' },
			);
			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives',
				{},
				{ $select: 'id,name,webUrl' },
			);
			expect(result.results).toEqual([{ name: 'Documents', value: 'b!drive1', url: undefined }]);
		});

		it('rejects when no Site has been chosen yet', async () => {
			setParams({ site: { mode: 'id', value: '' } });

			await expect(searchLibraries.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('hands back the next-page link and requests it exactly as returned', async () => {
			setParams({ site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' } });
			const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/drives?$skiptoken=abc';
			apiRequest.mockResolvedValueOnce({
				value: [{ id: 'b!drive1', name: 'Documents' }],
				'@odata.nextLink': nextLink,
			});

			const firstPage = await searchLibraries.call(ctx);
			expect(firstPage.paginationToken).toBe(nextLink);

			apiRequest.mockResolvedValueOnce({ value: [{ id: 'b!drive2', name: 'Reports' }] });
			const secondPage = await searchLibraries.call(ctx, undefined, nextLink);

			expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
			expect(secondPage.paginationToken).toBeUndefined();
		});
	});

	describe('getSheets', () => {
		it('lists the sheets in the workbook', async () => {
			setParams(byIdParams);
			apiRequest.mockResolvedValue({ value: [SHEET1, SHEET2] });

			const result = await getSheets.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				`${WORKBOOK_ROOT}/workbook/worksheets`,
				{},
				{ $top: 100 },
			);
			expect(result.results).toEqual([
				{ name: 'Sheet1', value: SHEET1.id },
				{ name: 'Costs', value: SHEET2.id },
			]);
		});

		it('filters the page by typed text, case-insensitively', async () => {
			setParams(byIdParams);
			apiRequest.mockResolvedValue({ value: [SHEET1, SHEET2] });

			const result = await getSheets.call(ctx, 'cost');

			expect(result.results).toEqual([{ name: 'Costs', value: SHEET2.id }]);
		});

		it('keeps paging on its own while filtering until a page has a match', async () => {
			// The editor disables "load more" while a filter is active, so a sheet
			// past the first page (e.g. #120 of 150) must still be reachable from
			// one search call, not just from the page it happens to land on.
			const nextLink =
				'https://graph.microsoft.com/v1.0/sites/s/drives/d/items/i/workbook/worksheets?$skiptoken=p2';
			setParams(byIdParams);
			apiRequest
				.mockResolvedValueOnce({ value: [SHEET1], '@odata.nextLink': nextLink })
				.mockResolvedValueOnce({ value: [SHEET2] });

			const result = await getSheets.call(ctx, 'cost');

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(apiRequest).toHaveBeenNthCalledWith(2, 'GET', '', {}, {}, nextLink);
			expect(result.results).toEqual([{ name: 'Costs', value: SHEET2.id }]);
			expect(result.paginationToken).toBeUndefined();
		});

		it('gives up once pages run out without a match, returning no results', async () => {
			setParams(byIdParams);
			apiRequest.mockResolvedValue({ value: [SHEET1] });

			const result = await getSheets.call(ctx, 'nonexistent');

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(result.results).toEqual([]);
			expect(result.paginationToken).toBeUndefined();
		});

		it('does not auto-page when there is no filter, even if the page has no items', async () => {
			setParams(byIdParams);
			apiRequest.mockResolvedValue({
				value: [],
				'@odata.nextLink': 'https://graph.microsoft.com/v1.0/...?$skiptoken=p2',
			});

			const result = await getSheets.call(ctx);

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(result.results).toEqual([]);
		});

		it('follows a pagination token verbatim, without rebuilding the request', async () => {
			const nextLink =
				'https://graph.microsoft.com/v1.0/sites/s/drives/d/items/i/workbook/worksheets?$skiptoken=abc';
			setParams(byIdParams);
			apiRequest.mockResolvedValue({ value: [SHEET2] });

			const result = await getSheets.call(ctx, undefined, nextLink);

			expect(apiRequest).toHaveBeenCalledWith('GET', '', {}, {}, nextLink);
			expect(result.results).toEqual([{ name: 'Costs', value: SHEET2.id }]);
		});

		it('surfaces the next @odata.nextLink as the pagination token', async () => {
			const nextLink =
				'https://graph.microsoft.com/v1.0/sites/s/drives/d/items/i/workbook/worksheets?$skiptoken=def';
			setParams(byIdParams);
			apiRequest.mockResolvedValue({ value: [SHEET1], '@odata.nextLink': nextLink });

			const result = await getSheets.call(ctx);

			expect(result.paginationToken).toBe(nextLink);
		});
	});

	describe('getTables', () => {
		const params = { ...byIdParams, worksheet: 'Sheet1' };

		it('lists the tables in the chosen sheet', async () => {
			setParams(params);
			apiRequest.mockResolvedValue({ value: [TABLE1, TABLE2] });

			const result = await getTables.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				`${WORKBOOK_ROOT}/workbook/worksheets/Sheet1/tables`,
				{},
				{ $top: 100 },
			);
			expect(result.results).toEqual([
				{ name: 'Table1', value: TABLE1.id },
				{ name: 'Expenses', value: TABLE2.id },
			]);
		});

		it('filters the page by typed text', async () => {
			setParams(params);
			apiRequest.mockResolvedValue({ value: [TABLE1, TABLE2] });

			const result = await getTables.call(ctx, 'expense');

			expect(result.results).toEqual([{ name: 'Expenses', value: TABLE2.id }]);
		});

		it('rejects an empty Sheet', async () => {
			setParams({ ...params, worksheet: '' });

			await expect(getTables.call(ctx)).rejects.toThrow("The 'Sheet' parameter is empty");
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('field shape', () => {
		it('offers search first, with URL and ID modes alongside, for Site', () => {
			expect(siteRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'url', 'id']);
			expect(siteRLC.modes?.[0].typeOptions?.searchListMethod).toBe('searchSites');
			expect(siteRLC.default).toEqual({ mode: 'list', value: '' });
		});

		it('offers search first, with ID mode alongside, for Document Library', () => {
			expect(libraryRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'id']);
			expect(libraryRLC.modes?.[0].typeOptions?.searchListMethod).toBe('searchLibraries');
			expect(libraryRLC.typeOptions?.loadOptionsDependsOn).toEqual(['site.value']);
			expect(libraryRLC.default).toEqual({ mode: 'list', value: '' });
		});

		it('is wired into the node as list-search methods', () => {
			const node = new MicrosoftExcelSharePoint();

			expect(node.methods?.listSearch?.searchSites).toBe(searchSites);
			expect(node.methods?.listSearch?.searchLibraries).toBe(searchLibraries);
			expect(node.methods?.listSearch?.getSheets).toBe(getSheets);
			expect(node.methods?.listSearch?.getTables).toBe(getTables);
		});
	});
});
