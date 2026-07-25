import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { getLists, listRLC } from '../../../v2/list';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);

describe('Microsoft SharePoint v2 — list search', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown) => (name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams({ site: { mode: 'id', value: SITE_ID } });
	});

	it('requests a site’s lists without a server-side filter', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		await getLists.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists`,
			{},
			{ $select: 'id,displayName' },
		);
	});

	it('filters the fetched lists by name client-side, case-insensitively', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'l1', displayName: 'Quarterly Reports' },
				{ id: 'l2', displayName: 'Archive' },
			],
		});

		const result = await getLists.call(ctx, 'reports');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists`,
			{},
			{ $select: 'id,displayName' },
		);
		expect(result.results).toEqual([{ name: 'Quarterly Reports', value: 'l1' }]);
	});

	it('hands back the next-page link and requests it exactly as returned', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/lists?$skiptoken=abc';
		apiRequest.mockResolvedValueOnce({
			value: [{ id: 'l1', displayName: 'One' }],
			'@odata.nextLink': nextLink,
		});

		const firstPage = await getLists.call(ctx);
		expect(firstPage.paginationToken).toBe(nextLink);

		apiRequest.mockResolvedValueOnce({ value: [{ id: 'l2', displayName: 'Two' }] });
		const secondPage = await getLists.call(ctx, undefined, nextLink);

		// The link is a complete address — passed through verbatim, never rebuilt
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(secondPage.paginationToken).toBeUndefined();
	});

	it('resolves a URL-mode site the same way the action does', async () => {
		setParams({ site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' } });
		apiRequest
			.mockResolvedValueOnce({ id: SITE_ID })
			.mockResolvedValueOnce({ value: [{ id: 'l1', displayName: 'One' }] });

		await getLists.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/v1.0/sites/contoso.sharepoint.com:/sites/site1',
			{},
			{ $select: 'id' },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists`,
			{},
			{ $select: 'id,displayName' },
		);
	});

	it('labels a list without a display name by its ID, and drops entries without one', async () => {
		apiRequest.mockResolvedValue({ value: [{ id: 'bare-list' }, { displayName: 'No ID' }] });

		const result = await getLists.call(ctx);

		expect(result.results).toEqual([{ name: 'bare-list', value: 'bare-list' }]);
	});

	it('rejects an empty Site value', async () => {
		setParams({ site: { mode: 'list', value: '' } });

		await expect(getLists.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('offers search first, with the ID/Title mode alongside', () => {
		expect(listRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'id']);
		expect(listRLC.modes?.[0].typeOptions?.searchListMethod).toBe('getLists');
		expect(listRLC.default).toEqual({ mode: 'list', value: '' });
	});

	it('is wired into the node as a list-search method', () => {
		const node = new MicrosoftSharePointV2(versionDescription);

		expect(node.methods?.listSearch?.getLists).toBe(getLists);
	});
});
