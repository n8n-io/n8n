import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { getItems, itemRLC } from '../../../v2/item';
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
const LIST_ID = 'list1';
const ITEMS_ENDPOINT = `/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items`;
const ITEMS_QS = { $expand: 'fields($select=Title,FileLeafRef)', $select: 'id,fields' };

describe('Microsoft SharePoint v2 — item search', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown, options?: { extractValue?: boolean }) => {
				const value = name in params ? params[name] : fallback;
				if (
					options?.extractValue &&
					value &&
					typeof value === 'object' &&
					'value' in (value as object)
				) {
					return (value as { value: unknown }).value as never;
				}
				return value as never;
			},
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams({ site: { mode: 'id', value: SITE_ID }, list: LIST_ID });
	});

	it("requests a list's items expanding the Title and FileLeafRef fields, without a server-side filter", async () => {
		apiRequest.mockResolvedValue({ value: [] });

		await getItems.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('GET', ITEMS_ENDPOINT, {}, ITEMS_QS);
	});

	it('maps items to their Title and ID', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: '1', fields: { Title: 'First' } },
				{ id: '2', fields: { Title: 'Second' } },
			],
		});

		const result = await getItems.call(ctx);

		expect(result.results).toEqual([
			{ name: 'First', value: '1' },
			{ name: 'Second', value: '2' },
		]);
	});

	it('labels a document-library item by its FileLeafRef when Title is empty', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: '1', fields: { Title: '', FileLeafRef: 'report.pdf' } },
				{ id: '2', fields: { FileLeafRef: 'notes.txt' } },
			],
		});

		const result = await getItems.call(ctx);

		expect(result.results).toEqual([
			{ name: 'report.pdf', value: '1' },
			{ name: 'notes.txt', value: '2' },
		]);
	});

	it('labels an item with no Title or FileLeafRef by its ID', async () => {
		apiRequest.mockResolvedValue({
			value: [{ id: '7', fields: { Title: '', FileLeafRef: '' } }, { id: '8' }],
		});

		const result = await getItems.call(ctx);

		expect(result.results).toEqual([
			{ name: '7', value: '7' },
			{ name: '8', value: '8' },
		]);
	});

	it('filters by a document-library file name client-side, case-insensitively', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: '1', fields: { FileLeafRef: 'Quarterly.pdf' } },
				{ id: '2', fields: { FileLeafRef: 'Archive.zip' } },
			],
		});

		const result = await getItems.call(ctx, 'quarterly');

		expect(result.results).toEqual([{ name: 'Quarterly.pdf', value: '1' }]);
	});

	it('filters the fetched items by Title client-side, case-insensitively', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: '1', fields: { Title: 'Quarterly Report' } },
				{ id: '2', fields: { Title: 'Archive' } },
			],
		});

		const result = await getItems.call(ctx, 'report');

		expect(apiRequest).toHaveBeenCalledWith('GET', ITEMS_ENDPOINT, {}, ITEMS_QS);
		expect(result.results).toEqual([{ name: 'Quarterly Report', value: '1' }]);
	});

	it('walks further pages to find a filter match that is not on the first page', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/lists/l/items?$skiptoken=abc';
		apiRequest
			.mockResolvedValueOnce({
				value: [{ id: '1', fields: { FileLeafRef: 'unrelated.txt' } }],
				'@odata.nextLink': nextLink,
			})
			.mockResolvedValueOnce({ value: [{ id: '2', fields: { FileLeafRef: 'trash.txt' } }] });

		const result = await getItems.call(ctx, 'trash');

		// Second page is fetched with the next-page link verbatim.
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'GET', '', {}, {}, nextLink);
		expect(result.results).toEqual([{ name: 'trash.txt', value: '2' }]);
	});

	it('pages through the reply, requesting the next-page link verbatim and returning every item', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/lists/l/items?$skiptoken=abc';
		apiRequest.mockResolvedValueOnce({
			value: [
				{ id: '1', fields: { Title: 'One' } },
				{ id: '2', fields: { Title: 'Two' } },
			],
			'@odata.nextLink': nextLink,
		});

		const firstPage = await getItems.call(ctx);
		expect(firstPage.paginationToken).toBe(nextLink);
		expect(firstPage.results).toEqual([
			{ name: 'One', value: '1' },
			{ name: 'Two', value: '2' },
		]);

		apiRequest.mockResolvedValueOnce({ value: [{ id: '3', fields: { Title: 'Three' } }] });
		const secondPage = await getItems.call(ctx, undefined, nextLink);

		// The link is a complete address — passed through verbatim, never rebuilt.
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(secondPage.results).toEqual([{ name: 'Three', value: '3' }]);
		expect(secondPage.paginationToken).toBeUndefined();
	});

	it('resolves a URL-mode site the same way the action does', async () => {
		setParams({
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' },
			list: LIST_ID,
		});
		apiRequest
			.mockResolvedValueOnce({ id: SITE_ID })
			.mockResolvedValueOnce({ value: [{ id: '1', fields: { Title: 'One' } }] });

		await getItems.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/v1.0/sites/contoso.sharepoint.com:/sites/site1',
			{},
			{ $select: 'id' },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'GET', ITEMS_ENDPOINT, {}, ITEMS_QS);
	});

	it('offers search first, with the By ID mode alongside', () => {
		expect(itemRLC.modes?.map((mode) => mode.name)).toEqual(['list', 'id']);
		expect(itemRLC.modes?.[0].typeOptions?.searchListMethod).toBe('getItems');
		expect(itemRLC.default).toEqual({ mode: 'list', value: '' });
	});

	it('is wired into the node as a list-search method', () => {
		const node = new MicrosoftSharePointV2(versionDescription);

		expect(node.methods?.listSearch?.getItems).toBe(getItems);
	});
});
