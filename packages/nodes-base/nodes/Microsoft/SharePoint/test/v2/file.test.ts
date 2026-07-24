import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../v2/actions/versionDescription';
import { fileRLC, getFiles } from '../../v2/file';
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
const FOLDER_ID = '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA';

describe('Microsoft SharePoint v2 — file selection', () => {
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
		setParams({ site: { mode: 'id', value: SITE_ID }, folder: FOLDER_ID });
	});

	it('lists only files from the chosen folder, asking Graph for files and re-checking the reply', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'file-1', name: 'report.csv', file: { mimeType: 'text/csv' } },
				{ id: 'folder-1', name: 'Archive', folder: {} },
				{ id: 'file-2', name: 'notes.txt', file: {} },
				{ name: 'No ID', file: {} },
			],
		});

		const result = await getFiles.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/drive/items/${FOLDER_ID}/children`,
			{},
			{
				$select: 'id,name,file',
				$filter: 'file ne null',
			},
		);
		// Folders and ID-less entries are dropped even if Graph ignores the filter;
		// the API's order is kept (pages concatenate in the editor)
		expect(result.results).toEqual([
			{ name: 'report.csv', value: 'file-1' },
			{ name: 'notes.txt', value: 'file-2' },
		]);
	});

	it('filters the fetched results by name, case-insensitively', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'file-1', name: 'Quarterly Report.xlsx', file: {} },
				{ id: 'file-2', name: 'notes.txt', file: {} },
			],
		});

		const result = await getFiles.call(ctx, 'report');

		expect(result.results).toEqual([{ name: 'Quarterly Report.xlsx', value: 'file-1' }]);
	});

	it('walks further pages while filtering, so matches beyond page one are found', async () => {
		const nextLink =
			'https://graph.microsoft.com/v1.0/sites/s/drive/items/f/children?$skiptoken=p2';
		apiRequest
			.mockResolvedValueOnce({
				value: [{ id: 'folder-1', name: 'report-drafts', folder: {} }],
				'@odata.nextLink': nextLink,
			})
			.mockResolvedValueOnce({
				value: [{ id: 'file-2', name: 'Report.pdf', file: {} }],
			});

		const result = await getFiles.call(ctx, 'report');

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(result.results).toEqual([{ name: 'Report.pdf', value: 'file-2' }]);
		expect(result.paginationToken).toBeUndefined();
	});

	it('caps the filtered page walk and hands back the residual next-page link', async () => {
		apiRequest.mockImplementation(async () => ({
			value: [{ id: 'folder-x', name: 'not-a-file', folder: {} }],
			'@odata.nextLink': 'https://graph.microsoft.com/next',
		}));

		const result = await getFiles.call(ctx, 'report');

		// Bounded so one keystroke cannot crawl an arbitrarily large folder
		expect(apiRequest).toHaveBeenCalledTimes(SEARCH_PAGE_LIMIT);
		expect(result.results).toEqual([]);
		expect(result.paginationToken).toBe('https://graph.microsoft.com/next');
	});

	it('stops at the first page that yields files when no filter is set', async () => {
		apiRequest.mockResolvedValue({
			value: [{ id: 'file-1', name: 'report.csv', file: {} }],
			'@odata.nextLink': 'https://graph.microsoft.com/next',
		});

		const result = await getFiles.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(result.paginationToken).toBe('https://graph.microsoft.com/next');
	});

	it('walks past pages holding no files when no filter is set', async () => {
		const nextLink =
			'https://graph.microsoft.com/v1.0/sites/s/drive/items/f/children?$skiptoken=p2';
		apiRequest
			.mockResolvedValueOnce({
				value: [{ id: 'folder-1', name: 'Subfolder', folder: {} }],
				'@odata.nextLink': nextLink,
			})
			.mockResolvedValueOnce({
				value: [{ id: 'file-2', name: 'Report.pdf', file: {} }],
			});

		const result = await getFiles.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(result.results).toEqual([{ name: 'Report.pdf', value: 'file-2' }]);
	});

	it('rejects when no folder has been chosen yet', async () => {
		setParams({ site: { mode: 'id', value: SITE_ID }, folder: '' });

		await expect(getFiles.call(ctx)).rejects.toThrow("The 'Parent Folder' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects when no site has been chosen yet', async () => {
		setParams({ site: { mode: 'id', value: '' }, folder: FOLDER_ID });

		await expect(getFiles.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	describe('field shape', () => {
		it('offers search first, with an ID mode alongside', () => {
			expect(fileRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'id']);
			expect(fileRLC.modes?.[0].typeOptions?.searchListMethod).toBe('getFiles');
			expect(fileRLC.modes?.[0].typeOptions?.searchable).toBe(true);
			expect(fileRLC.default).toEqual({ mode: 'list', value: '' });
		});

		it('re-fetches when the chosen site or folder changes', () => {
			expect(fileRLC.typeOptions?.loadOptionsDependsOn).toEqual(['site.value', 'folder.value']);
		});

		it('is wired into the node as a list-search method', () => {
			const node = new MicrosoftSharePointV2(versionDescription);

			expect(node.methods?.listSearch?.getFiles).toBe(getFiles);
		});
	});
});
