import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../v2/actions/versionDescription';
import { MicrosoftSharePointV2 } from '../../v2/MicrosoftSharePointV2.node';
import { getSites, siteRLC } from '../../v2/site';
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
		expect(secondPage.paginationToken).toBeUndefined();
	});

	it('points app-only sign-ins without search rights at the URL mode', async () => {
		ctx.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');
		apiRequest.mockRejectedValue(
			new NodeApiError(mock<INode>(), { message: 'refused' }, { httpCode: '403' }),
		);

		await expect(getSites.call(ctx)).rejects.toThrow('This app sign-in cannot search sites');
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
		expect(siteRLC.default).toEqual({ mode: 'list', value: '' });
	});

	it('is wired into the node as a list-search method', () => {
		const node = new MicrosoftSharePointV2(versionDescription);

		expect(node.methods?.listSearch?.getSites).toBe(getSites);
	});
});
