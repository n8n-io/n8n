import type { IExecuteFunctions, INode, ResourceMapperField } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
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
const LIST_ID = '58a279af-1f06-4392-a5ed-2b37fa1d6c1d';
const ITEMS_URL = `/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items`;

const SCHEMA = [
	{ id: 'Title', type: 'string' },
	{ id: 'number', type: 'number' },
	{ id: 'currency', type: 'number' },
	{ id: 'bool', type: 'boolean' },
	{ id: 'choice', type: 'options' },
	{ id: 'datetime', type: 'dateTime' },
	{ id: 'person', type: 'string' },
	{ id: 'link.Url', type: 'url' },
	{ id: 'link.Description', type: 'string' },
] as ResourceMapperField[];

describe('Microsoft SharePoint v2 — Item: Create', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const baseParams = {
		resource: 'item',
		operation: 'create',
		site: { mode: 'id', value: SITE_ID },
		list: LIST_ID,
		'columns.mappingMode': 'defineBelow',
		'columns.schema': SCHEMA,
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

	it('sends every mapped column value verbatim under fields and returns the raw reply', async () => {
		const value = {
			Title: 'Title 1',
			number: 1,
			currency: 1,
			bool: true,
			choice: 'Choice 1',
			datetime: '2025-03-24T00:00:00',
			person: '1',
		};
		setParams({ ...baseParams, 'columns.value': value });
		const created = { id: '1', fields: value };
		apiRequest.mockResolvedValue(created);

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			ITEMS_URL,
			{ fields: value },
			{},
			undefined,
			{},
		);
		expect(result).toEqual([[{ json: created, pairedItem: { item: 0 } }]]);
	});

	it("folds a hyperlink column into SharePoint's two-part value and opts into apiversion 2.1", async () => {
		setParams({
			...baseParams,
			'columns.value': {
				Title: 'Linked',
				'link.Url': 'https://example.com',
				'link.Description': 'Example',
			},
		});
		apiRequest.mockResolvedValue({ id: '1' });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			ITEMS_URL,
			{ fields: { Title: 'Linked', link: { Url: 'https://example.com', Description: 'Example' } } },
			{},
			undefined,
			{ Prefer: 'apiversion=2.1' },
		);
	});

	it('sends a hyperlink with only the URL part when no description is entered', async () => {
		setParams({ ...baseParams, 'columns.value': { 'link.Url': 'https://example.com' } });
		apiRequest.mockResolvedValue({ id: '1' });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			ITEMS_URL,
			{ fields: { link: { Url: 'https://example.com' } } },
			{},
			undefined,
			{ Prefer: 'apiversion=2.1' },
		);
	});

	it('auto-maps only the input properties that match list columns', async () => {
		setParams({ ...baseParams, 'columns.mappingMode': 'autoMapInputData' });
		ctx.getInputData.mockReturnValue([{ json: { Title: 'Mapped', notAColumn: 'dropped' } }]);
		apiRequest.mockResolvedValue({ id: '1' });

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			ITEMS_URL,
			{ fields: { Title: 'Mapped' } },
			{},
			undefined,
			{},
		);
	});

	it('rejects when no List has been chosen yet', async () => {
		setParams({ ...baseParams, list: '' });

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'List' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('adds a hint when a column with unique values already has the provided value', async () => {
		setParams({ ...baseParams, 'columns.value': { Title: 'Duplicate' } });
		apiRequest.mockRejectedValue(
			new NodeApiError(
				mock<INode>(),
				{ message: 'invalidRequest' },
				{ message: 'One or more fields with unique constraints already has the provided value.' },
			),
		);

		await expect(node.execute.call(ctx)).rejects.toMatchObject({
			message: 'One or more fields with unique constraints already has the provided value.',
			description: "Double-check the value(s) in 'Columns' and try again",
		});
	});
});
