import type { IDataObject, IExecuteFunctions, INode, ResourceMapperValue } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { buildItemFieldsPayload } from '../../../v2/item';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
import type * as _importType0 from '../../../v2/transport';
import * as transport from '../../../v2/transport';

// Real transport module except the network helper, so getSharePointCredentialType
// keeps its real behavior; only microsoftApiRequest is stubbed.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID = 'site1';
const LIST_ID = 'list1';
const ITEM_ID = 'item1';
const ITEMS_PATH = `/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`;

// v1's pinned update output (test/item/update.workflow.json) — v2 must return
// the same full listItem envelope for the same update.
const GRAPH_ITEM_REPLY: IDataObject = {
	'@odata.context':
		'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
	'@odata.etag': '"cc40561f-3d3b-4cfb-b8a9-8af9d71de3f0,2"',
	createdBy: {
		user: {
			displayName: 'John Doe',
			email: 'john@doe.onmicrosoft.com',
			id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
		},
	},
	createdDateTime: '2025-03-25T12:26:12Z',
	eTag: '"cc40561f-3d3b-4cfb-b8a9-8af9d71de3f0,2"',
	id: ITEM_ID,
	lastModifiedDateTime: '2025-03-25T12:26:46Z',
	parentReference: {
		id: '84070a73-ea24-463c-8eb2-0e9afa11c63f',
		listId: LIST_ID,
		siteId: SITE_ID,
	},
	webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/3_.000',
	'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
	fields: {
		'@odata.etag': '"cc40561f-3d3b-4cfb-b8a9-8af9d71de3f0,2"',
		Title: 'Title 2',
		ID: ITEM_ID,
	},
};

const SCHEMA: ResourceMapperValue['schema'] = [
	{
		id: 'Title',
		displayName: 'Title',
		canBeUsedToMatch: true,
		defaultMatch: false,
		display: true,
		readOnly: false,
		required: false,
		type: 'string',
	},
	{
		id: 'id',
		displayName: 'ID',
		canBeUsedToMatch: true,
		defaultMatch: false,
		display: true,
		readOnly: true,
		required: true,
		type: 'string',
	},
];

describe('Microsoft SharePoint v2 — Item: Update', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const baseParams = (columns: Partial<ResourceMapperValue>) => ({
		resource: 'item',
		operation: 'update',
		site: { mode: 'id', value: SITE_ID },
		list: LIST_ID,
		'columns.mappingMode': columns.mappingMode ?? 'defineBelow',
		'columns.schema': columns.schema ?? SCHEMA,
		'columns.value': columns.value ?? null,
		'columns.matchingColumns': columns.matchingColumns ?? [],
	});

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

	it('updates by item ID through the documented fields route and returns the v1 envelope', async () => {
		setParams(
			baseParams({
				value: { Title: 'Title 2', id: ITEM_ID },
				matchingColumns: ['id'],
			}),
		);
		apiRequest
			.mockResolvedValueOnce({ Title: 'Title 2' })
			.mockResolvedValueOnce({ ...GRAPH_ITEM_REPLY });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'PATCH',
			`${ITEMS_PATH}/${ITEM_ID}/fields`,
			{ Title: 'Title 2' },
			{},
			undefined,
			{},
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			`${ITEMS_PATH}/${ITEM_ID}`,
			{},
			{ $expand: 'fields' },
		);
		expect(result).toEqual([[{ json: GRAPH_ITEM_REPLY, pairedItem: { item: 0 } }]]);
	});

	it('looks the item up by a matching column and updates the single match', async () => {
		setParams(
			baseParams({
				value: { Title: 'Title 2' },
				matchingColumns: ['Title'],
			}),
		);
		apiRequest
			.mockResolvedValueOnce({ value: [{ id: ITEM_ID }] })
			.mockResolvedValueOnce({ Title: 'Title 2' })
			.mockResolvedValueOnce({ ...GRAPH_ITEM_REPLY });

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			ITEMS_PATH,
			{},
			{ $filter: "fields/Title eq 'Title 2'" },
			undefined,
			{ Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' },
		);
		// The matched column stays in the write body, exactly like v1
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'PATCH',
			`${ITEMS_PATH}/${ITEM_ID}/fields`,
			{ Title: 'Title 2' },
			{},
			undefined,
			{},
		);
		expect(result).toEqual([[{ json: GRAPH_ITEM_REPLY, pairedItem: { item: 0 } }]]);
	});

	it("throws v1's error when no item matches the columns", async () => {
		setParams(
			baseParams({
				value: { Title: 'Missing' },
				matchingColumns: ['Title'],
			}),
		);
		apiRequest.mockResolvedValueOnce({ value: [] });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			"The column(s) don't match any existing item",
		);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it("throws v1's error when several items match the columns", async () => {
		setParams(
			baseParams({
				value: { Title: 'Duplicate' },
				matchingColumns: ['Title'],
			}),
		);
		apiRequest.mockResolvedValueOnce({ value: [{ id: 'item1' }, { id: 'item2' }] });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			"The column(s) don't match any existing item",
		);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it("throws v1's error when matching by ID but the ID value is empty", async () => {
		setParams(
			baseParams({
				value: { Title: 'Title 2', id: '' },
				matchingColumns: ['id'],
			}),
		);

		await expect(node.execute.call(ctx)).rejects.toThrow(
			"The column(s) don't match any existing item",
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('escapes single quotes in the lookup filter value', async () => {
		setParams(
			baseParams({
				value: { Title: "O'Brien" },
				matchingColumns: ['Title'],
			}),
		);
		apiRequest
			.mockResolvedValueOnce({ value: [{ id: ITEM_ID }] })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ ...GRAPH_ITEM_REPLY });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			ITEMS_PATH,
			{},
			{ $filter: "fields/Title eq 'O''Brien'" },
			undefined,
			{ Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' },
		);
	});

	it('folds split hyperlink fields back into the two-part shape', async () => {
		setParams(
			baseParams({
				value: {
					id: ITEM_ID,
					'Link.Url': 'https://example.com',
					'Link.Description': 'Example',
				},
				matchingColumns: ['id'],
				schema: [
					...SCHEMA,
					{
						id: 'Link.Url',
						displayName: 'Link (URL)',
						canBeUsedToMatch: false,
						defaultMatch: false,
						display: true,
						readOnly: false,
						required: false,
						type: 'url',
					},
					{
						id: 'Link.Description',
						displayName: 'Link (Description)',
						canBeUsedToMatch: false,
						defaultMatch: false,
						display: true,
						readOnly: false,
						required: false,
						type: 'string',
					},
				],
			}),
		);
		apiRequest.mockResolvedValueOnce({}).mockResolvedValueOnce({ ...GRAPH_ITEM_REPLY });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'PATCH',
			`${ITEMS_PATH}/${ITEM_ID}/fields`,
			{ Link: { Url: 'https://example.com', Description: 'Example' } },
			{},
			undefined,
			{ Prefer: 'apiversion=2.1' },
		);
	});

	it('rejects an empty List value', async () => {
		setParams({
			...baseParams({ value: { id: ITEM_ID }, matchingColumns: ['id'] }),
			list: '',
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'List' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it.each(['.', '..'])('rejects a List value of %j before any request', async (list) => {
		setParams({
			...baseParams({ value: { id: ITEM_ID }, matchingColumns: ['id'] }),
			list,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(`The 'List' value '${list}' is not valid`);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it.each(['.', '..'])('rejects an item ID of %j before the PATCH', async (id) => {
		setParams(baseParams({ value: { id }, matchingColumns: ['id'] }));

		await expect(node.execute.call(ctx)).rejects.toThrow(`The 'Item' value '${id}' is not valid`);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves auto-mapped values from the input item and updates by its ID', async () => {
		setParams(
			baseParams({
				mappingMode: 'autoMapInputData',
				matchingColumns: ['id'],
			}),
		);
		ctx.getInputData.mockReturnValue([
			{ json: { id: ITEM_ID, Title: 'Title 2', Unknown: 'dropped' } },
		]);
		apiRequest
			.mockResolvedValueOnce({ Title: 'Title 2' })
			.mockResolvedValueOnce({ ...GRAPH_ITEM_REPLY });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'PATCH',
			`${ITEMS_PATH}/${ITEM_ID}/fields`,
			{ Title: 'Title 2' },
			{},
			undefined,
			{},
		);
	});

	it('reports that the update succeeded when only the read-back fails', async () => {
		setParams(
			baseParams({
				value: { Title: 'Title 2', id: ITEM_ID },
				matchingColumns: ['id'],
			}),
		);
		apiRequest
			.mockResolvedValueOnce({ Title: 'Title 2' })
			.mockRejectedValueOnce(new Error('429 Too Many Requests'));

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'The item was updated, but reading back the updated item failed',
		);
		expect(apiRequest).toHaveBeenCalledTimes(2);
	});

	it('keeps the update-succeeded wording in the error item when continueOnFail is on', async () => {
		setParams(
			baseParams({
				value: { Title: 'Title 2', id: ITEM_ID },
				matchingColumns: ['id'],
			}),
		);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest
			.mockResolvedValueOnce({ Title: 'Title 2' })
			.mockRejectedValueOnce(new Error('429 Too Many Requests'));

		const result = await node.execute.call(ctx);

		expect(result).toEqual([
			[
				{
					json: { error: 'The item was updated, but reading back the updated item failed' },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('surfaces a transport error per item when continueOnFail is on', async () => {
		setParams(
			baseParams({
				value: { Title: 'Title 2', id: ITEM_ID },
				matchingColumns: ['id'],
			}),
		);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom'));

		const result = await node.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
	});
});

describe('buildItemFieldsPayload', () => {
	it('drops the id entry and keeps plain columns as-is', () => {
		expect(buildItemFieldsPayload({ id: 'item1', Title: 'A', Count: 3 }, [])).toEqual({
			fields: { Title: 'A', Count: 3 },
			hasHyperlink: false,
		});
	});

	it('only folds dotted keys that the schema confirms as a hyperlink split', () => {
		const schema: ResourceMapperValue['schema'] = [
			{
				id: 'Link.Url',
				displayName: 'Link (URL)',
				canBeUsedToMatch: false,
				defaultMatch: false,
				display: true,
				readOnly: false,
				required: false,
				type: 'url',
			},
		];
		expect(buildItemFieldsPayload({ 'Link.Url': 'https://x', 'Other.Url': 'y' }, schema)).toEqual({
			fields: { Link: { Url: 'https://x' }, 'Other.Url': 'y' },
			hasHyperlink: true,
		});
	});

	it('ignores prototype-polluting keys instead of writing them', () => {
		// A literal `__proto__` key would set the prototype, not an own property
		const value = jsonParse<IDataObject>('{"__proto__": "x", "Title": "A"}');
		const { fields } = buildItemFieldsPayload(value, []);
		expect(fields).toEqual({ Title: 'A' });
		expect(Object.prototype).not.toHaveProperty('x');
	});

	it('does not pollute the prototype when a hyperlink split has a __proto__ base', () => {
		// The dotted key clears every fold guard, so `fields['__proto__']` must
		// not be reused as the folded object — that read aliases Object.prototype.
		const schema: ResourceMapperValue['schema'] = [
			{
				id: '__proto__.Url',
				displayName: 'x (URL)',
				canBeUsedToMatch: false,
				defaultMatch: false,
				display: true,
				readOnly: false,
				required: false,
				type: 'url',
			},
		];
		const value = jsonParse<IDataObject>('{"__proto__.Url": "polluted"}');
		const { fields } = buildItemFieldsPayload(value, schema);
		expect(fields).toEqual({});
		expect(({} as Record<string, unknown>).Url).toBeUndefined();
		expect(Object.prototype).not.toHaveProperty('Url');
	});
});
