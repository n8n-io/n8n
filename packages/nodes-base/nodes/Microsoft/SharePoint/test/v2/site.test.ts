import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../v2/actions/versionDescription';
import { MicrosoftSharePointV2 } from '../../v2/MicrosoftSharePointV2.node';
import { getSites, resolveSiteId, SITE_ID_REGEX, siteRLC } from '../../v2/site';
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

	it('points delegated sign-ins without search rights at URL or ID mode', async () => {
		ctx.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
		// The old permission-naming message must be replaced, not merely unread —
		// mock it present so a leak would show up in the assertions below
		apiRequest.mockRejectedValue(
			new NodeApiError(
				mock<INode>(),
				{},
				{ httpCode: '403', message: 'the credential may be missing the Sites.Read.All permission' },
			),
		);

		let thrown: NodeApiError | undefined;
		try {
			await getSites.call(ctx);
		} catch (error) {
			thrown = error as NodeApiError;
		}

		expect(thrown).toBeInstanceOf(NodeApiError);
		expect(thrown?.httpCode).toBe('403');
		expect(thrown?.message).toBe('This credential cannot search sites');
		const description = thrown?.description ?? '';
		expect(description).toContain('URL or ID mode');
		expect(description).toContain('Sites.Selected');
		// Sites.Read.All is the optional, secondary path — not the primary instruction
		expect(description.indexOf('URL or ID mode')).toBeLessThan(
			description.indexOf('Sites.Read.All'),
		);
		// The transport's original wording must not survive into the new message
		expect(thrown?.message).not.toContain('missing');
		expect(description).not.toContain('missing');
	});

	it('passes through a non-403 delegated error unchanged', async () => {
		ctx.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
		const original = new NodeApiError(mock<INode>(), { message: 'boom' }, { httpCode: '500' });
		apiRequest.mockRejectedValue(original);

		await expect(getSites.call(ctx)).rejects.toBe(original);
	});

	it('passes through a non-NodeApiError delegated rejection unchanged', async () => {
		ctx.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
		apiRequest.mockRejectedValue(new Error('boom'));

		await expect(getSites.call(ctx)).rejects.toThrow('boom');
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
		apiRequest.mockResolvedValue({
			id: 'contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE',
		});
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

		await expect(resolveSiteId.call(ctx, 0)).resolves.toBe(
			'contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE',
		);

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

	const COMPOSITE_ID =
		'contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE';

	it.each([
		['a composite hostname,GUID,GUID ID', COMPOSITE_ID],
		['a bare site GUID', '2C712604-1370-44E7-A1F5-426573FDA80A'],
		['a bare hostname', 'contoso.sharepoint.com'],
		['the literal "root"', 'root'],
	])('returns %s as given, without a request', async (_name, value) => {
		setSite({ mode: 'id', value });

		await expect(resolveSiteId.call(ctx, 0)).resolves.toBe(value);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	// The live repro was a composite ID pasted with a trailing quote, forwarded
	// to Graph verbatim and answered with a raw 400 that never named the field
	it.each([
		['a trailing quote', `${COMPOSITE_ID}"`],
		['an embedded space', COMPOSITE_ID.replace(',2D', ', 2D')],
		['a site URL pasted into ID mode', 'https://contoso.sharepoint.com/sites/a'],
	])('rejects an ID with %s before any request', async (_name, value) => {
		setSite({ mode: 'id', value });

		await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow("The 'Site' ID is not valid");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it("does not regex-check list-mode values — they come from Graph's own search", async () => {
		setSite({ mode: 'list', value: 'not a valid typed id "at all"' });

		await expect(resolveSiteId.call(ctx, 0)).resolves.toBe('not a valid typed id "at all"');
	});

	it('validates typed IDs in the By ID mode with the same pattern the runtime guard uses', () => {
		const idMode = siteRLC.modes?.find((mode) => mode.name === 'id');

		expect(idMode?.validation).toEqual([
			{
				type: 'regex',
				properties: {
					regex: SITE_ID_REGEX,
					errorMessage: expect.stringContaining('hostname,GUID,GUID'),
				},
			},
		]);
	});

	it('resolves a repeated site URL once when given a per-run cache', async () => {
		setSite({ mode: 'url', value: 'https://contoso.sharepoint.com/sites/a' });
		const siteIdCache = new Map<string, string>();

		await expect(resolveSiteId.call(ctx, 0, siteIdCache)).resolves.toBe(
			'contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE',
		);
		await expect(resolveSiteId.call(ctx, 1, siteIdCache)).resolves.toBe(
			'contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE',
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
