import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { LIST_SIMPLIFY_SELECT } from '../../../v2/helpers/utils';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';

// microsoftApiRequestAllItems calls microsoftApiRequest as a same-module
// function reference (not an import), so mocking the transport module
// wouldn't intercept that internal call. Stubbing the network helper one
// layer down instead (as transport/index.test.ts does) keeps both
// microsoftApiRequest and microsoftApiRequestAllItems real and end-to-end.
const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);
const GRAPH_BASE_URL = 'https://graph.microsoft.com';

// Realistic Graph shape: @odata.etag rides on each item; @odata.context lives
// on the envelope instead, so it's never part of `value` in the first place.
const GRAPH_LIST_1: IDataObject = {
	'@odata.etag': '"etag-1"',
	id: 'list-1',
	name: 'list1',
	displayName: 'List One',
	description: 'First list',
	createdDateTime: '2025-03-12T19:38:40Z',
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/List%20One',
};

const GRAPH_LIST_2: IDataObject = {
	'@odata.etag': '"etag-2"',
	id: 'list-2',
	name: 'list2',
	displayName: 'List Two',
	description: 'Second list',
	createdDateTime: '2025-04-01T10:00:00Z',
	lastModifiedDateTime: '2025-04-02T11:00:00Z',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/List%20Two',
};

const SIMPLIFIED_LIST_1: IDataObject = {
	id: 'list-1',
	name: 'list1',
	displayName: 'List One',
	description: 'First list',
	createdDateTime: '2025-03-12T19:38:40Z',
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/List%20One',
};

const SIMPLIFIED_LIST_2: IDataObject = {
	id: 'list-2',
	name: 'list2',
	displayName: 'List Two',
	description: 'Second list',
	createdDateTime: '2025-04-01T10:00:00Z',
	lastModifiedDateTime: '2025-04-02T11:00:00Z',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/List%20Two',
};

describe('Microsoft SharePoint v2 — List: Get Many', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
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

	it('sends $select and omits $top when Simplify is on and Return All is on', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: true,
			simplify: true,
		});
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({ value: [{ ...GRAPH_LIST_1 }] });

		await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({
				uri: `${GRAPH_BASE_URL}/v1.0/sites/${ENCODED_SITE_ID}/lists`,
				qs: { $select: LIST_SIMPLIFY_SELECT },
			}),
		);
	});

	it('omits $select when Simplify is off', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: true,
			simplify: false,
		});
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({ value: [{ ...GRAPH_LIST_1 }] });

		await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({
				uri: `${GRAPH_BASE_URL}/v1.0/sites/${ENCODED_SITE_ID}/lists`,
				qs: {},
			}),
		);
	});

	it('keeps only the trimmed Simplify fields per item and drops @odata.etag', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: true,
			simplify: true,
		});
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({
			value: [{ ...GRAPH_LIST_1 }, { ...GRAPH_LIST_2 }],
		});

		const result = await node.execute.call(ctx);

		expect(result).toEqual([
			[
				{ json: SIMPLIFIED_LIST_1, pairedItem: { item: 0 } },
				{ json: SIMPLIFIED_LIST_2, pairedItem: { item: 0 } },
			],
		]);
	});

	it('keeps the raw @odata fields when Simplify is off', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: true,
			simplify: false,
		});
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({ value: [{ ...GRAPH_LIST_1 }] });

		const result = await node.execute.call(ctx);

		expect(result).toEqual([[{ json: GRAPH_LIST_1, pairedItem: { item: 0 } }]]);
	});

	it('concatenates every page when Return All is on, routing through the real pagination helper', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: true,
			simplify: false,
		});
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({
				value: [{ id: '1' }, { id: '2' }],
				'@odata.nextLink': `${GRAPH_BASE_URL}/v1.0/sites/s/lists?$skiptoken=p2`,
			})
			.mockResolvedValueOnce({ value: [{ id: '3' }] });

		const result = await node.execute.call(ctx);

		expect(result).toEqual([
			[
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 0 } },
				{ json: { id: '3' }, pairedItem: { item: 0 } },
			],
		]);
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it('stops at Limit even across multiple pages, routing through the real pagination helper', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: false,
			limit: 3,
			simplify: false,
		});
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({
				value: [{ id: '1' }, { id: '2' }],
				'@odata.nextLink': `${GRAPH_BASE_URL}/v1.0/sites/s/lists?$skiptoken=p2`,
			})
			.mockResolvedValueOnce({
				value: [{ id: '3' }],
				// A further page is available but must not be fetched — the limit is
				// already met after this page. A "fetch everything, then slice"
				// implementation would make an unconfigured 3rd call here and fail.
				'@odata.nextLink': `${GRAPH_BASE_URL}/v1.0/sites/s/lists?$skiptoken=p3`,
			});

		const result = await node.execute.call(ctx);

		expect(result).toEqual([
			[
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 0 } },
				{ json: { id: '3' }, pairedItem: { item: 0 } },
			],
		]);
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it('sends $top equal to the limit in Limit mode', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: false,
			limit: 5,
			simplify: false,
		});
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({ value: [{ id: '1' }] });

		await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({
				uri: `${GRAPH_BASE_URL}/v1.0/sites/${ENCODED_SITE_ID}/lists`,
				qs: { $top: 5 },
			}),
		);
	});

	it('resolves a site URL before listing its lists', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' },
			returnAll: true,
			simplify: true,
		});
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ id: SITE_ID })
			.mockResolvedValueOnce({ value: [{ ...GRAPH_LIST_1 }] });

		const result = await node.execute.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'microsoftOAuth2Api',
			expect.objectContaining({
				uri: `${GRAPH_BASE_URL}/v1.0/sites/contoso.sharepoint.com:/sites/site1`,
				qs: { $select: 'id' },
			}),
		);
		expect(ctx.helpers.requestOAuth2).toHaveBeenNthCalledWith(
			2,
			'microsoftOAuth2Api',
			expect.objectContaining({
				uri: `${GRAPH_BASE_URL}/v1.0/sites/${ENCODED_SITE_ID}/lists`,
				qs: { $select: LIST_SIMPLIFY_SELECT },
			}),
		);
		expect(result).toEqual([[{ json: SIMPLIFIED_LIST_1, pairedItem: { item: 0 } }]]);
	});

	it('resolves a site URL once per execution across items', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' },
			returnAll: true,
			simplify: false,
		});
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ id: SITE_ID })
			.mockResolvedValueOnce({ value: [{ id: '1' }] })
			.mockResolvedValueOnce({ value: [{ id: '2' }] });

		const result = await node.execute.call(ctx);

		// 1 site lookup (memoized) + 2 list-getAll calls, one per item
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(3);
		expect(result[0]).toHaveLength(2);
	});

	it('rejects an empty Site value', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: '' },
			returnAll: true,
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(ctx.helpers.requestOAuth2).not.toHaveBeenCalled();
	});

	it('surfaces a transport error per item when continueOnFail is on', async () => {
		setParams({
			resource: 'list',
			operation: 'getAll',
			site: { mode: 'id', value: SITE_ID },
			returnAll: true,
			simplify: true,
		});
		ctx.continueOnFail.mockReturnValue(true);
		ctx.helpers.requestOAuth2.mockRejectedValueOnce(new Error('boom'));

		const result = await node.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
	});
});
