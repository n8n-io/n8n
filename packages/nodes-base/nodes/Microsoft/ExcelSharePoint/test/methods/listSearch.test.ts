import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { libraryRLC, siteRLC } from '../../descriptions/common.descriptions';
import { SERVICE_PRINCIPAL_AUTH } from '../../helpers/constants';
import { searchLibraries, searchSites } from '../../methods/listSearch';
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

describe('Microsoft Excel (SharePoint) — listSearch', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
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
		});
	});
});
