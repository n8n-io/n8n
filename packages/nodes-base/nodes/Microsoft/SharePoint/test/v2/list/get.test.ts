import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { LIST_SIMPLIFY_SELECT } from '../../../v2/helpers/utils';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

// Real transport module except the network helper, so getSharePointCredentialType
// keeps its real behavior; only microsoftApiRequest is stubbed.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

// v1's mocked Graph reply and pinned simplified output (test/list/get.test.ts) —
// v2 must return the same trimmed fields for the same list.
const GRAPH_LIST_REPLY: IDataObject = {
	'@odata.context': 'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#lists/$entity',
	'@odata.etag': '"58a279af-1f06-4392-a5ed-2b37fa1d6c1d,5"',
	createdDateTime: '2025-03-12T19:38:40Z',
	description: 'My List 1',
	id: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d',
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	name: 'list1',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list',
	displayName: 'list1',
};

const V1_SIMPLIFIED_OUTPUT: IDataObject = {
	createdDateTime: '2025-03-12T19:38:40Z',
	description: 'My List 1',
	id: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d',
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	name: 'list1',
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list',
	displayName: 'list1',
};

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);
const LIST_ID = '58a279af-1f06-4392-a5ed-2b37fa1d6c1d';

describe('Microsoft SharePoint v2 — List: Get', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

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
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
	});

	it('returns list details for a site ID and list ID, matching v1', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			simplify: true,
		});
		apiRequest.mockImplementation(async () => ({ ...GRAPH_LIST_REPLY }));

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}`,
			{},
			{ $select: LIST_SIMPLIFY_SELECT },
		);
		expect(result).toEqual([[{ json: V1_SIMPLIFIED_OUTPUT, pairedItem: { item: 0 } }]]);
	});

	it('resolves a site URL and accepts a list title, returning the same result as by ID', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' },
			list: 'My List 1',
			simplify: true,
		});
		apiRequest
			.mockResolvedValueOnce({ id: SITE_ID })
			.mockImplementationOnce(async () => ({ ...GRAPH_LIST_REPLY }));

		const result = await node.execute.call(ctx);

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
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/My%20List%201`,
			{},
			{ $select: LIST_SIMPLIFY_SELECT },
		);
		expect(result).toEqual([[{ json: V1_SIMPLIFIED_OUTPUT, pairedItem: { item: 0 } }]]);
	});

	it('sends no $select and keeps the @odata fields when Simplify is off', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			simplify: false,
		});
		apiRequest.mockImplementation(async () => ({ ...GRAPH_LIST_REPLY }));

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}`,
			{},
			{},
		);
		expect(result).toEqual([[{ json: GRAPH_LIST_REPLY, pairedItem: { item: 0 } }]]);
	});

	it('throws a clear error for an invalid site URL', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'url', value: 'not a url' },
			list: LIST_ID,
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('The site URL is not valid');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty List value instead of requesting the whole collection', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: '',
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'List' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty Site value', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'id', value: '' },
			list: LIST_ID,
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('attributes a failed site URL lookup to the Site field', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/typo' },
			list: LIST_ID,
			simplify: true,
		});
		apiRequest.mockRejectedValueOnce(
			new NodeApiError(mock<INode>(), { message: 'not found' }, { httpCode: '404' }),
		);

		await expect(node.execute.call(ctx)).rejects.toThrow('Site not found');
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('resolves a site URL once per execution across items', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/site1' },
			list: LIST_ID,
			simplify: true,
		});
		apiRequest.mockImplementation(async (_method: string, resource: string) =>
			resource.includes(':') ? { id: SITE_ID } : { ...GRAPH_LIST_REPLY },
		);

		const result = await node.execute.call(ctx);

		// 1 site lookup (memoized) + 2 list gets
		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(result[0]).toHaveLength(2);
	});

	it('throws a clear error for an unknown operation', async () => {
		setParams({
			resource: 'list',
			operation: 'delete',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			simplify: true,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'The operation "delete" is not supported!',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('surfaces a transport error per item when continueOnFail is on', async () => {
		setParams({
			resource: 'list',
			operation: 'get',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			simplify: true,
		});
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom'));

		const result = await node.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
	});
});
