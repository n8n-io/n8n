import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../v2/actions/versionDescription';
import { MicrosoftSharePointV2 } from '../../v2/MicrosoftSharePointV2.node';
import { getSites, resolveSiteId, siteRLC } from '../../v2/site';
import * as transport from '../../v2/transport';
import type * as _importType0 from '../../v2/transport';

vi.mock('../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft SharePoint v2 — site selection', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
	});

	it('searches sites by name using the literal `search` parameter', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'site-b', displayName: 'Marketing B', webUrl: 'https://c.sharepoint.com/sites/b' },
				{ id: 'site-a', displayName: 'Marketing A', webUrl: 'https://c.sharepoint.com/sites/a' },
			],
		});

		const result = await getSites.call(ctx, 'marketing');

		// Graph quirk: `search`, not `$search`
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/sites',
			{},
			{
				search: 'marketing',
				$select: 'id,displayName,webUrl',
			},
		);
		// The API's order is kept — the editor concatenates pages, so sorting
		// per page would reset at every page boundary
		expect(result.results).toEqual([
			{ name: 'Marketing B', value: 'site-b', url: 'https://c.sharepoint.com/sites/b' },
			{ name: 'Marketing A', value: 'site-a', url: 'https://c.sharepoint.com/sites/a' },
		]);
	});

	it('lists all sites when no search text is given', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		await getSites.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/sites',
			{},
			{
				search: '*',
				$select: 'id,displayName,webUrl',
			},
		);
	});

	it('labels a site without a display name by its ID, and drops entries without one', async () => {
		apiRequest.mockResolvedValue({ value: [{ id: 'bare-site' }, { displayName: 'No ID' }] });

		const result = await getSites.call(ctx);

		expect(result.results).toEqual([{ name: 'bare-site', value: 'bare-site', url: undefined }]);
	});

	it('hands back the next-page link and requests it exactly as returned', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites?search=*&$skiptoken=abc';
		apiRequest.mockResolvedValueOnce({
			value: [{ id: 's1', displayName: 'One' }],
			'@odata.nextLink': nextLink,
		});

		const firstPage = await getSites.call(ctx);
		expect(firstPage.paginationToken).toBe(nextLink);

		apiRequest.mockResolvedValueOnce({ value: [{ id: 's2', displayName: 'Two' }] });
		const secondPage = await getSites.call(ctx, undefined, nextLink);

		// The link is a complete address — passed through verbatim, never rebuilt
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		// The second page's rows must surface, not just its token bookkeeping
		expect(secondPage.results).toEqual([{ name: 'Two', value: 's2', url: undefined }]);
		expect(secondPage.paginationToken).toBeUndefined();
	});

	it('points app-only sign-ins without search rights at the URL mode', async () => {
		ctx.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');
		apiRequest.mockRejectedValue(
			new NodeApiError(mock<INode>(), { message: 'refused' }, { httpCode: '403' }),
		);

		let thrown: NodeOperationError | undefined;
		try {
			await getSites.call(ctx);
		} catch (error) {
			thrown = error as NodeOperationError;
		}

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect(thrown?.message).toBe('This app registration cannot search sites');
		// The steering hint only surfaces in the editor — pin both halves of it
		expect(thrown?.description).toContain('pasting its URL instead');
		expect(thrown?.description).toContain('Sites.Read.All application permission');
	});

	it('keeps the permission-naming message for delegated refusals', async () => {
		ctx.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
		// Mirrors the transport's delegated 403 shape: the permission-naming
		// message is set as the error option, as delegatedApiError does
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

		// URL paste would hit the same refusal — the accurate message must survive
		await expect(getSites.call(ctx)).rejects.toThrow(/Sites\.Read\.All/);
	});

	it('offers search first, with URL and ID modes alongside', () => {
		expect(siteRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'url', 'id']);
		expect(siteRLC.modes?.[0].typeOptions?.searchListMethod).toBe('getSites');
		expect(siteRLC.modes?.[0].typeOptions?.searchable).toBe(true);
		expect(siteRLC.default).toEqual({ mode: 'list', value: '' });
	});

	it('is wired into the node as a list-search method', () => {
		const node = new MicrosoftSharePointV2(versionDescription);

		expect(node.methods?.listSearch?.getSites).toBe(getSites);
	});
});

describe('Microsoft SharePoint v2 — resolveSiteId', () => {
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setSite = (site: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name === 'site' ? site : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		apiRequest.mockResolvedValue({ id: 'contoso.sharepoint.com,g1,g2' });
	});

	// Graph documents both shapes: a bare hostname addresses that host's root
	// site (works for non-default hostnames where /sites/root would not), and
	// {hostname}:{path} addresses a site by server-relative path.
	// https://learn.microsoft.com/en-us/graph/api/site-get
	it.each([
		['a root URL', 'https://contoso.sharepoint.com', '/v1.0/sites/contoso.sharepoint.com'],
		[
			'a root URL with a trailing slash',
			'https://contoso.sharepoint.com/',
			'/v1.0/sites/contoso.sharepoint.com',
		],
		[
			'a site URL with a trailing slash',
			'https://contoso.sharepoint.com/sites/a/',
			'/v1.0/sites/contoso.sharepoint.com:/sites/a',
		],
		[
			'a subsite URL',
			'https://contoso.sharepoint.com/sites/a/subsite',
			'/v1.0/sites/contoso.sharepoint.com:/sites/a/subsite',
		],
		[
			'a URL with a query string',
			'https://contoso.sharepoint.com/sites/a?web=1',
			'/v1.0/sites/contoso.sharepoint.com:/sites/a',
		],
	])('resolves %s via the documented Graph addressing', async (_name, url, endpoint) => {
		setSite({ mode: 'url', value: url });

		await expect(resolveSiteId.call(ctx, 0)).resolves.toBe('contoso.sharepoint.com,g1,g2');

		expect(apiRequest).toHaveBeenCalledWith('GET', endpoint, {}, { $select: 'id' });
	});

	it("re-encodes path segments so a raw ':' can't escape the {host}:{path} shape", async () => {
		setSite({ mode: 'url', value: 'https://contoso.sharepoint.com/sites/a:b' });

		await resolveSiteId.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/sites/contoso.sharepoint.com:/sites/a%3Ab',
			{},
			{ $select: 'id' },
		);
	});

	it('does not double-encode an already-encoded path segment', async () => {
		setSite({ mode: 'url', value: 'https://contoso.sharepoint.com/sites/My%20Site' });

		await resolveSiteId.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/sites/contoso.sharepoint.com:/sites/My%20Site',
			{},
			{ $select: 'id' },
		);
	});

	it('returns an ID as given, without a request', async () => {
		setSite({ mode: 'id', value: 'contoso.sharepoint.com,g1,g2' });

		await expect(resolveSiteId.call(ctx, 0)).resolves.toBe('contoso.sharepoint.com,g1,g2');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves a repeated site URL once when given a per-run cache', async () => {
		setSite({ mode: 'url', value: 'https://contoso.sharepoint.com/sites/a' });
		const siteIdCache = new Map<string, string>();

		await expect(resolveSiteId.call(ctx, 0, siteIdCache)).resolves.toBe(
			'contoso.sharepoint.com,g1,g2',
		);
		await expect(resolveSiteId.call(ctx, 1, siteIdCache)).resolves.toBe(
			'contoso.sharepoint.com,g1,g2',
		);

		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	// The empty-site guard lives here so every action inherits it
	it.each([
		['ID', { mode: 'id', value: '' }],
		['list', { mode: 'list', value: '' }],
		['URL', { mode: 'url', value: '  ' }],
	])('rejects an empty site in %s mode before any request', async (_name, site) => {
		setSite(site);

		await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
