import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { ITEM_SIMPLIFY_SELECT } from '../../../v2/helpers/utils';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

// Stub only the network helper; keep the rest of the transport real.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

// A v1-shaped item reply: the keys Simplify strips, plus survivors.
const GRAPH_ITEM_REPLY: IDataObject = {
	'@odata.context':
		'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
	'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
	createdDateTime: '2025-03-12T22:18:18Z',
	eTag: '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
	id: 'item1',
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
	'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
	fields: {
		'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
		Title: 'Item 1',
		ID: 'item1',
	},
};

// Expected simplified output derived from the reply so the two never drift.
const buildSimplified = (): IDataObject => {
	const expected: IDataObject = {
		...GRAPH_ITEM_REPLY,
		fields: { ...(GRAPH_ITEM_REPLY.fields as IDataObject) },
	};
	delete expected['@odata.context'];
	delete expected['@odata.etag'];
	delete expected['fields@odata.navigationLink'];
	delete (expected.fields as IDataObject)['@odata.etag'];
	return expected;
};

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);
const LIST_ID = 'list1';
const ITEM_ID = 'item1';

describe('Microsoft SharePoint v2 — Item: Get', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(
				name: string,
				_itemIndex?: number,
				fallback?: unknown,
				options?: { extractValue?: boolean },
			) => {
				const value = name in params ? params[name] : fallback;
				// Mimic extractValue unwrapping a resource locator to its value.
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
		node = new MicrosoftSharePointV2(versionDescription);
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
	});

	it('narrows the request and returns v1-trimmed fields when Simplify is on', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: ITEM_ID,
			simplify: true,
		});
		apiRequest.mockImplementation(async () => ({
			...GRAPH_ITEM_REPLY,
			fields: { ...(GRAPH_ITEM_REPLY.fields as IDataObject) },
		}));

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items/${ITEM_ID}`,
			{},
			// Assert the literal $select, so drifting ITEM_SIMPLIFY_SELECT fails here.
			{
				$select: 'id,createdDateTime,lastModifiedDateTime,webUrl',
				$expand: 'fields($select=Title)',
			},
		);
		expect(result).toEqual([[{ json: buildSimplified(), pairedItem: { item: 0 } }]]);
	});

	it('sends ?expand=fields and keeps the raw body when Simplify is off', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: ITEM_ID,
			simplify: false,
		});
		apiRequest.mockImplementation(async () => ({
			...GRAPH_ITEM_REPLY,
			fields: { ...(GRAPH_ITEM_REPLY.fields as IDataObject) },
		}));

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items/${ITEM_ID}`,
			{},
			{ $expand: 'fields' },
		);
		expect(result).toEqual([[{ json: GRAPH_ITEM_REPLY, pairedItem: { item: 0 } }]]);
	});

	it('resolves a site URL and accepts a list title, encoding each segment', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' },
			list: 'My List 1',
			item: ITEM_ID,
			simplify: true,
		});
		apiRequest.mockResolvedValueOnce({ id: SITE_ID }).mockImplementationOnce(async () => ({
			...GRAPH_ITEM_REPLY,
			fields: { ...(GRAPH_ITEM_REPLY.fields as IDataObject) },
		}));

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(2);
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
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/My%20List%201/items/${ITEM_ID}`,
			{},
			{ $select: ITEM_SIMPLIFY_SELECT, $expand: 'fields($select=Title)' },
		);
	});

	it('reads a pasted item ID through the resource locator', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: { mode: 'id', value: '42' },
			simplify: true,
		});
		apiRequest.mockImplementation(async () => ({
			...GRAPH_ITEM_REPLY,
			fields: { ...(GRAPH_ITEM_REPLY.fields as IDataObject) },
		}));

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items/42`,
			{},
			{ $select: ITEM_SIMPLIFY_SELECT, $expand: 'fields($select=Title)' },
		);
	});

	it('rejects an empty List value instead of requesting the whole collection', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: '',
			item: ITEM_ID,
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'List' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty Item value', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: '',
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Item' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it.each(['.', '..'])(
		'rejects a "%s" Item value that would change the request shape',
		async (bad) => {
			setParams({
				resource: 'item',
				operation: 'get',
				site: { mode: 'id', value: SITE_ID },
				list: LIST_ID,
				item: bad,
				simplify: true,
			});

			await expect(node.execute.call(ctx)).rejects.toThrow("The 'Item' value");
			expect(apiRequest).not.toHaveBeenCalled();
		},
	);

	it('rejects an empty Site value', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: '' },
			list: LIST_ID,
			item: ITEM_ID,
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('surfaces a transport error per item when continueOnFail is on', async () => {
		setParams({
			resource: 'item',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: ITEM_ID,
			simplify: true,
		});
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom'));

		const result = await node.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
	});
});
