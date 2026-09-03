import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { lookupItemIdByColumns } from '../../../v2/item';

// No transport mock here: microsoftApiRequestAllItems calls microsoftApiRequest
// as a same-module reference, so mocking the module wouldn't intercept it.
// Stubbing the network helper one layer down keeps both request helpers real,
// which is the whole point — this exercises the actual @odata.nextLink paging.
const SITE_ID = 'site1';
const LIST_ID = 'list1';
const GRAPH_BASE_URL = 'https://graph.microsoft.com';
const ITEMS_URI = `${GRAPH_BASE_URL}/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`;
const NEXT_LINK = `${ITEMS_URI}?$skiptoken=UGFnZWQ9VFJVRQ`;
const NEXT_LINK_2 = `${ITEMS_URI}?$skiptoken=UGFnZWQ9VFJVRTI`;
const PREFER_NON_INDEXED = { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' };

describe('Microsoft SharePoint v2 — lookupItemIdByColumns paging', () => {
	let ctx: DeepMockProxy<IExecuteFunctions>;

	const lookup = async () =>
		await lookupItemIdByColumns.call(ctx, SITE_ID, LIST_ID, ['Email'], {
			Email: 'bob@acme.com',
		});

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		// getSharePointCredentialType reads this; anything but the service-principal
		// type routes through requestOAuth2.
		ctx.getNodeParameter.mockReturnValue('microsoftOAuth2Api' as never);
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: GRAPH_BASE_URL });
	});

	it('reports many when two matches are split across pages (one first-page row, one behind nextLink)', async () => {
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: [{ id: '17' }], '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: [{ id: '42' }] });

		expect(await lookup()).toEqual(['17', '42']);
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
		// The second page is fetched from the nextLink verbatim, still opting into
		// non-indexed queries.
		expect(ctx.helpers.requestOAuth2.mock.calls[1][1]).toEqual(
			expect.objectContaining({
				uri: NEXT_LINK,
				headers: expect.objectContaining(PREFER_NON_INDEXED),
			}),
		);
	});

	it('finds a match that only appears on a later page after an empty first page', async () => {
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: [], '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: [{ id: '42' }] });

		expect(await lookup()).toEqual(['42']);
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it('stops at the second match without fetching further pages', async () => {
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: [{ id: '17' }], '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: [{ id: '42' }], '@odata.nextLink': NEXT_LINK_2 })
			.mockResolvedValueOnce({ value: [{ id: '99' }] });

		expect(await lookup()).toEqual(['17', '42']);
		// Two matches already prove "many" — the third page is never requested.
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it('makes a single request when the only match is on the first page', async () => {
		ctx.helpers.requestOAuth2.mockResolvedValueOnce({ value: [{ id: '17' }] });

		expect(await lookup()).toEqual(['17']);
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});

	it('reports no match only after exhausting every page', async () => {
		ctx.helpers.requestOAuth2
			.mockResolvedValueOnce({ value: [], '@odata.nextLink': NEXT_LINK })
			.mockResolvedValueOnce({ value: [] });

		expect(await lookup()).toEqual([]);
		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});
});
