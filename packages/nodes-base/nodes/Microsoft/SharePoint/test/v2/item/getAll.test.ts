import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { ITEM_SIMPLIFY_EXPAND, ITEM_SIMPLIFY_SELECT } from '../../../v2/helpers/utils';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';

// microsoftApiRequestAllItems calls microsoftApiRequest as a same-module
// function reference (not an import), so mocking the transport module
// wouldn't intercept that internal call. Stubbing the network helper one
// layer down instead keeps both request helpers real and end-to-end.
const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);
const LIST_ID = '58a279af-1f06-4392-a5ed-2b37fa1d6c1d';
const GRAPH_BASE_URL = 'https://graph.microsoft.com';
const ITEMS_URI = `${GRAPH_BASE_URL}/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items`;
const NEXT_LINK = `${ITEMS_URI}?$skiptoken=UGFnZWQ9VFJVRQ`;
const PREFER_NON_INDEXED = { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' };

const GRAPH_ITEM: IDataObject = {
	'@odata.etag': '"etag-1"',
	id: 'item1',
	createdDateTime: '2025-03-12T22:18:18Z',
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
	'fields@odata.navigationLink': 'sites/site1/lists/list1/items/1/fields',
	fields: { '@odata.etag': '"etag-1,1"', Title: 'Item 1' },
};

describe('Microsoft SharePoint v2 — Item: Get Many', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const baseParams = {
		resource: 'item',
		operation: 'getAll',
		site: { mode: 'id', value: SITE_ID },
		list: LIST_ID,
		returnAll: true,
		simplify: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftSharePointV2(versionDescription);
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: GRAPH_BASE_URL });
		ctx.helpers.requestOAuth2.mockResolvedValue({ value: [] });
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
	});

	it('sends the filter as $filter and opts into non-indexed queries', async () => {
		setParams({ ...baseParams, filter: "fields/Title eq 'item1'" });

		await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({
				uri: ITEMS_URI,
				qs: { $filter: "fields/Title eq 'item1'" },
				headers: expect.objectContaining(PREFER_NON_INDEXED),
			}),
		);
	});

	it('requests the v1 trim server-side and strips the annotations when Simplify is on', async () => {
		setParams({ ...baseParams, simplify: true });
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({ value: [{ ...GRAPH_ITEM }] });

		const result = await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({
				qs: { $select: ITEM_SIMPLIFY_SELECT, $expand: ITEM_SIMPLIFY_EXPAND },
			}),
		);
		expect(result).toEqual([
			[
				{
					json: {
						id: 'item1',
						createdDateTime: '2025-03-12T22:18:18Z',
						lastModifiedDateTime: '2025-03-12T22:18:18Z',
						webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
						fields: { Title: 'Item 1' },
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('selects only the chosen fields and expands fields when included', async () => {
		setParams({ ...baseParams, 'options.fields': ['id', 'webUrl', 'fields'] });

		await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({ qs: { $select: 'id,webUrl,fields', $expand: 'fields' } }),
		);
	});

	it('follows next-page links without re-sending query options but keeps the Prefer header', async () => {
		setParams({ ...baseParams, filter: "fields/Title eq 'item1'" });
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: [{ id: '1' }], '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: [{ id: '2' }] });

		const result = await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
		expect(ctx.helpers.requestOAuth2.mock.calls[1][1]).toEqual(
			expect.objectContaining({
				uri: NEXT_LINK,
				qs: {},
				headers: expect.objectContaining(PREFER_NON_INDEXED),
			}),
		);
		expect(result[0]).toHaveLength(2);
	});

	it('keeps fetching until the limit is met when pages come back short', async () => {
		setParams({ ...baseParams, returnAll: false, limit: 3 });
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: [{ id: '1' }, { id: '2' }], '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: [{ id: '3' }, { id: '4' }] });

		const result = await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({ qs: { $top: 3 } }),
		);
		expect(result[0].map((item) => item.json)).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
	});

	it('returns every item of a 10,000+ item list on Return All', async () => {
		setParams({ ...baseParams });
		const page = (offset: number) =>
			Array.from({ length: 5000 }, (_, index) => ({ id: `${offset + index}` }));
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: page(0), '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: page(5000) });

		const result = await node.execute.call(ctx);

		expect(result[0]).toHaveLength(10000);
		expect(result[0].at(-1)?.json).toEqual({ id: '9999' });
	});

	it('fails naming the column when a non-indexed filter dies part-way through a big list', async () => {
		setParams({ ...baseParams, filter: "fields/NotIndexed eq 'x'" });
		ctx.helpers.requestOAuth2.mockRejectedValueOnce({
			statusCode: 400,
			error: {
				error: {
					code: 'invalidRequest',
					message:
						'The attempted operation is prohibited because it exceeds the list view threshold.',
				},
			},
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(
			"SharePoint could not finish filtering on column(s) 'NotIndexed': large lists can only be filtered on indexed columns",
		);
	});

	it('fails naming the column under app-only auth too, despite the sanitized error', async () => {
		setParams({
			...baseParams,
			filter: "fields/NotIndexed eq 'x'",
			authentication: 'microsoftEntraServicePrincipalApi',
		});
		ctx.helpers.requestWithAuthentication.mockRejectedValueOnce({
			statusCode: 400,
			error: {
				error: {
					code: 'invalidRequest',
					message:
						'The attempted operation is prohibited because it exceeds the list view threshold.',
				},
			},
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(
			"SharePoint could not finish filtering on column(s) 'NotIndexed': large lists can only be filtered on indexed columns",
		);
	});

	it('rejects when no List has been chosen yet', async () => {
		setParams({ ...baseParams, list: '' });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'List' parameter is empty");
		expect(ctx.helpers.requestOAuth2).not.toHaveBeenCalled();
	});
});
