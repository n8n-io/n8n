import type { IDataObject, IExecuteFunctions, INode, ResourceMapperValue } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as itemActions from '../../../v2/actions/item';
import { versionDescription } from '../../../v2/actions/versionDescription';
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

const GRAPH_ITEM_REPLY: IDataObject = {
	id: ITEM_ID,
	fields: { Title: 'Title 2', ID: ITEM_ID },
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
];

describe('Microsoft SharePoint v2 — Item: Create or Update', () => {
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
		operation: 'upsert',
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

	it('updates the single matched item and returns the item envelope', async () => {
		setParams(baseParams({ value: { Title: 'Title 2' }, matchingColumns: ['Title'] }));
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
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'PATCH',
			`${ITEMS_PATH}/${ITEM_ID}/fields`,
			{ Title: 'Title 2' },
			{},
			undefined,
			{},
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			3,
			'GET',
			`${ITEMS_PATH}/${ITEM_ID}`,
			{},
			{ $expand: 'fields' },
		);
		expect(result).toEqual([[{ json: GRAPH_ITEM_REPLY, pairedItem: { item: 0 } }]]);
	});

	it('creates a new item when nothing matches, mapping the real column values', async () => {
		setParams(baseParams({ value: { Title: 'Title 2' }, matchingColumns: ['Title'] }));
		const created = { id: '2', fields: { Title: 'Title 2' } };
		apiRequest.mockResolvedValueOnce({ value: [] }).mockResolvedValueOnce(created);

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			ITEMS_PATH,
			{ fields: { Title: 'Title 2' } },
			{},
			undefined,
			{},
		);
		expect(result).toEqual([[{ json: created, pairedItem: { item: 0 } }]]);
	});

	it('throws and does neither when several items match (AC#2)', async () => {
		setParams(baseParams({ value: { Title: 'Duplicate' }, matchingColumns: ['Title'] }));
		apiRequest.mockResolvedValueOnce({ value: [{ id: 'a' }, { id: 'b' }] });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'Multiple items match the selected column(s)',
		);
		// Only the lookup ran — nothing after it proves neither update nor create.
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('propagates a lookup failure instead of silently creating (AC#3)', async () => {
		setParams(baseParams({ value: { Title: 'Title 2' }, matchingColumns: ['Title'] }));
		apiRequest.mockRejectedValueOnce(new Error('non-indexed column query failed'));

		await expect(node.execute.call(ctx)).rejects.toThrow('non-indexed column query failed');
		// One call (the failed lookup) and nothing after it proves no create was attempted.
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('creates without a lookup when no matching columns are selected', async () => {
		setParams(baseParams({ value: { Title: 'Title 2' }, matchingColumns: [] }));
		const created = { id: '2', fields: { Title: 'Title 2' } };
		apiRequest.mockResolvedValueOnce(created);

		const result = await node.execute.call(ctx);

		// No matching columns → skip the lookup GET entirely, straight to the create POST.
		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			ITEMS_PATH,
			{ fields: { Title: 'Title 2' } },
			{},
			undefined,
			{},
		);
		expect(result).toEqual([[{ json: created, pairedItem: { item: 0 } }]]);
	});

	it('folds split hyperlink fields into the two-part shape when updating', async () => {
		setParams(
			baseParams({
				value: { 'Link.Url': 'https://example.com', 'Link.Description': 'Example' },
				matchingColumns: ['Title'],
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
		apiRequest
			.mockResolvedValueOnce({ value: [{ id: ITEM_ID }] })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ ...GRAPH_ITEM_REPLY });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'PATCH',
			`${ITEMS_PATH}/${ITEM_ID}/fields`,
			{ Link: { Url: 'https://example.com', Description: 'Example' } },
			{},
			undefined,
			{ Prefer: 'apiversion=2.1' },
		);
	});

	it('registers the Create or Update operation and dispatches to it', () => {
		const operationProp = itemActions.description[0];
		expect(operationProp.options).toContainEqual(
			expect.objectContaining({ name: 'Create or Update', value: 'upsert' }),
		);
		expect('upsert' in itemActions).toBe(true);
		expect(typeof itemActions.upsert.execute).toBe('function');
	});
});
