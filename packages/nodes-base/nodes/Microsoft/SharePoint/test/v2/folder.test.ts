import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../v2/actions/versionDescription';
import { folderRLC, getFolders } from '../../v2/folder';
import { SEARCH_PAGE_LIMIT } from '../../v2/helpers/graphSearch';
import { MicrosoftSharePointV2 } from '../../v2/MicrosoftSharePointV2.node';
import * as transport from '../../v2/transport';
import type * as _importType0 from '../../v2/transport';

vi.mock('../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);

describe('Microsoft SharePoint v2 — folder selection', () => {
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
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams({ site: { mode: 'id', value: SITE_ID } });
	});

	it('lists only folders, asking Graph for folders and re-checking the reply', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'folder-1', name: 'Reports', folder: { childCount: 3 } },
				{ id: 'file-1', name: 'notes.txt' },
				{ id: 'folder-2', name: 'Archive', folder: { childCount: 0 } },
				{ name: 'No ID', folder: {} },
			],
		});

		const result = await getFolders.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/drive/items`,
			{},
			{
				$select: 'id,name,folder',
				$filter: 'folder ne null',
			},
		);
		expect(result.results).toEqual([
			{ name: 'Reports', value: 'folder-1' },
			{ name: 'Archive', value: 'folder-2' },
		]);
	});

	it('labels a folder without a name by its ID', async () => {
		apiRequest.mockResolvedValue({ value: [{ id: 'bare-folder', folder: {} }] });

		const result = await getFolders.call(ctx);

		expect(result.results).toEqual([{ name: 'bare-folder', value: 'bare-folder' }]);
	});

	it('filters the fetched results by name, case-insensitively', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'folder-1', name: 'Quarterly Reports', folder: {} },
				{ id: 'folder-2', name: 'Archive', folder: {} },
			],
		});

		const result = await getFolders.call(ctx, 'reports');

		expect(result.results).toEqual([{ name: 'Quarterly Reports', value: 'folder-1' }]);
	});

	it('walks further pages while filtering, so matches beyond page one are found', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/drive/items?$skiptoken=p2';
		apiRequest
			.mockResolvedValueOnce({
				value: [{ id: 'file-1', name: 'archive-notes.txt' }],
				'@odata.nextLink': nextLink,
			})
			.mockResolvedValueOnce({
				value: [{ id: 'folder-2', name: 'Archive', folder: {} }],
			});

		const result = await getFolders.call(ctx, 'archive');

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(result.results).toEqual([{ name: 'Archive', value: 'folder-2' }]);
		expect(result.paginationToken).toBeUndefined();
	});

	it('caps the filtered page walk and hands back the residual next-page link', async () => {
		apiRequest.mockImplementation(async () => ({
			value: [{ id: 'file-x', name: 'not-a-folder.txt' }],
			'@odata.nextLink': 'https://graph.microsoft.com/next',
		}));

		const result = await getFolders.call(ctx, 'archive');

		// Bounded so one keystroke cannot crawl an arbitrarily large drive
		expect(apiRequest).toHaveBeenCalledTimes(SEARCH_PAGE_LIMIT);
		expect(result.results).toEqual([]);
		expect(result.paginationToken).toBe('https://graph.microsoft.com/next');
	});

	it('stops at the first page that yields folders when no filter is set', async () => {
		apiRequest.mockResolvedValue({
			value: [{ id: 'folder-1', name: 'Reports', folder: {} }],
			'@odata.nextLink': 'https://graph.microsoft.com/next',
		});

		const result = await getFolders.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(result.paginationToken).toBe('https://graph.microsoft.com/next');
	});

	it('walks past pages holding no folders when no filter is set', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/drive/items?$skiptoken=p2';
		apiRequest
			.mockResolvedValueOnce({
				value: [{ id: 'file-1', name: 'a.txt', file: {} }],
				'@odata.nextLink': nextLink,
			})
			.mockResolvedValueOnce({
				value: [{ id: 'folder-1', name: 'Reports', folder: {} }],
			});

		const result = await getFolders.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(result.results).toEqual([{ name: 'Reports', value: 'folder-1' }]);
	});

	it('caps the unfiltered walk over folder-less pages and hands back the residual link', async () => {
		apiRequest.mockImplementation(async () => ({
			value: [{ id: 'file-x', name: 'not-a-folder.txt', file: {} }],
			'@odata.nextLink': 'https://graph.microsoft.com/next',
		}));

		const result = await getFolders.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(SEARCH_PAGE_LIMIT);
		expect(result.results).toEqual([]);
		expect(result.paginationToken).toBe('https://graph.microsoft.com/next');
	});

	it('resolves a pasted site URL before listing folders', async () => {
		setParams({ site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' } });
		apiRequest.mockImplementation(async (_method: string, resource: string) =>
			resource.startsWith('/v1.0/sites/contoso.sharepoint.com:')
				? { id: SITE_ID }
				: { value: [{ id: 'folder-1', name: 'Reports', folder: {} }] },
		);

		const result = await getFolders.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/sites/contoso.sharepoint.com:/sites/mysite',
			{},
			{ $select: 'id' },
		);
		expect(result.results).toEqual([{ name: 'Reports', value: 'folder-1' }]);
	});

	it('rejects when no site has been chosen yet', async () => {
		setParams({ site: { mode: 'id', value: '' } });

		await expect(getFolders.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('hands back the next-page link and requests it exactly as returned', async () => {
		const nextLink = `https://graph.microsoft.com/v1.0/sites/${ENCODED_SITE_ID}/drive/items?$skiptoken=abc`;
		apiRequest.mockResolvedValueOnce({
			value: [{ id: 'folder-1', name: 'Reports', folder: {} }],
			'@odata.nextLink': nextLink,
		});

		const firstPage = await getFolders.call(ctx);
		expect(firstPage.paginationToken).toBe(nextLink);

		apiRequest.mockResolvedValueOnce({ value: [{ id: 'folder-2', name: 'Archive', folder: {} }] });
		const secondPage = await getFolders.call(ctx, undefined, nextLink);

		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(secondPage.results).toEqual([{ name: 'Archive', value: 'folder-2' }]);
		expect(secondPage.paginationToken).toBeUndefined();
	});

	describe('field shape', () => {
		it('offers search first, with an ID mode alongside', () => {
			expect(folderRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'id']);
			expect(folderRLC.modes?.[0].typeOptions?.searchListMethod).toBe('getFolders');
			expect(folderRLC.modes?.[0].typeOptions?.searchable).toBe(true);
			expect(folderRLC.default).toEqual({ mode: 'list', value: '' });
		});

		it('re-fetches when the chosen site changes', () => {
			expect(folderRLC.typeOptions?.loadOptionsDependsOn).toEqual(['site.value']);
		});

		it('is wired into the node as a list-search method', () => {
			const node = new MicrosoftSharePointV2(versionDescription);

			expect(node.methods?.listSearch?.getFolders).toBe(getFolders);
		});
	});
});
