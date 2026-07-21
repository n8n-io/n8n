/* eslint-disable n8n-nodes-base/node-param-default-missing */
import type { IDataObject, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { getMappingColumns, itemColumns } from '../../../v2/list/columns';
import type { SharePointListColumn } from '../../../v2/list/columns';
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

const contentTypesReply = (columns: SharePointListColumn[]): IDataObject => ({
	value: [{ id: '0x0100', name: 'Item', columns }],
});

// v1's captured contentTypes reply (test/methods/resourceMapping.test.ts),
// trimmed to one column per distinct mapping outcome.
const V1_CONTENT_TYPES_REPLY: IDataObject = {
	value: [
		{
			id: '0x0100362657F7588C5C438072A77E0EF184F4000272C0D1046D984B8097B3C00D199EDE',
			description: 'Create a new list item.',
			hidden: false,
			name: 'Item',
			readOnly: false,
			columns: [
				{
					displayName: 'Title',
					description: 'Description Title',
					enforceUniqueValues: true,
					hidden: false,
					indexed: true,
					name: 'Title',
					readOnly: false,
					required: true,
					type: 'text',
					text: { allowMultipleLines: false, maxLength: 255 },
				},
				{
					displayName: 'Othertitle',
					enforceUniqueValues: false,
					hidden: false,
					name: 'LinkTitle',
					readOnly: true,
					type: 'unknownFutureValue',
				},
				{
					displayName: 'Choice',
					enforceUniqueValues: false,
					hidden: false,
					name: 'choice',
					readOnly: false,
					type: 'choice',
					choice: {
						allowTextEntry: false,
						choices: ['Choice 1', 'Choice 2', 'Choice 3'],
						displayAs: 'dropDownMenu',
					},
				},
				{
					displayName: 'Datetime',
					enforceUniqueValues: false,
					hidden: false,
					name: 'datetime',
					readOnly: false,
					type: 'dateTime',
					dateTime: { displayAs: 'standard', format: 'dateOnly' },
				},
				{
					displayName: 'Person',
					enforceUniqueValues: false,
					hidden: false,
					name: 'person',
					readOnly: false,
					type: 'user',
					personOrGroup: { allowMultipleSelection: false, format: 'peopleOnly' },
				},
				{
					displayName: 'Number',
					enforceUniqueValues: false,
					hidden: false,
					name: 'number',
					readOnly: false,
					type: 'number',
					number: { decimalPlaces: 'automatic', displayAs: 'number' },
				},
				{
					displayName: 'Bool',
					enforceUniqueValues: false,
					hidden: false,
					name: 'bool',
					readOnly: false,
					type: 'boolean',
					boolean: {},
				},
				{
					displayName: 'Hyperlink',
					enforceUniqueValues: false,
					hidden: false,
					name: 'hyperlink',
					readOnly: false,
					type: 'url',
					hyperlinkOrPicture: { isPicture: false },
				},
				{
					displayName: 'Currency',
					enforceUniqueValues: false,
					hidden: false,
					name: 'currency',
					readOnly: false,
					type: 'currency',
					currency: { locale: 'en-US' },
				},
				{
					displayName: 'Location',
					enforceUniqueValues: false,
					hidden: false,
					name: 'location',
					readOnly: false,
					type: 'location',
					location: {},
				},
				{
					displayName: 'location: Country/Region',
					enforceUniqueValues: false,
					hidden: false,
					name: 'CountryOrRegion',
					readOnly: true,
					type: 'text',
					text: { allowMultipleLines: false, maxLength: 255 },
				},
				{
					displayName: 'location: Coordinates',
					enforceUniqueValues: false,
					hidden: false,
					name: 'GeoLoc',
					readOnly: true,
					type: 'geolocation',
					geolocation: {},
				},
				{
					displayName: 'location: Name',
					enforceUniqueValues: false,
					hidden: false,
					name: 'DispName',
					readOnly: true,
					type: 'text',
					text: { allowMultipleLines: false, maxLength: 255 },
				},
				{
					displayName: 'Image',
					enforceUniqueValues: false,
					hidden: false,
					name: 'image',
					readOnly: false,
					type: 'thumbnail',
					thumbnail: {},
				},
				{
					displayName: 'Metadata',
					enforceUniqueValues: false,
					hidden: false,
					name: 'metadata',
					readOnly: false,
					type: 'term',
					term: { allowMultipleValues: false },
				},
				{
					displayName: 'Lookup',
					enforceUniqueValues: false,
					hidden: false,
					name: 'lookup',
					readOnly: false,
					type: 'lookup',
					lookup: { allowMultipleValues: false, columnName: 'Title', listId: LIST_ID },
				},
				{
					displayName: 'Rating (0-5)',
					description: 'Average value of all the ratings that have been submitted',
					enforceUniqueValues: false,
					hidden: false,
					name: 'AverageRating',
					readOnly: false,
					type: 'unknownFutureValue',
				},
			],
		},
	],
};

// v1's pinned expectations (test/methods/resourceMapping.test.ts) with the
// deliberate v2 deltas: no disabled placeholders, omitted booleans become false.
const sharedFieldShape = {
	canBeUsedToMatch: false,
	defaultMatch: false,
	display: true,
	readOnly: false,
	required: false,
};
const EXPECTED_CREATE_FIELDS = [
	{
		...sharedFieldShape,
		id: 'Title',
		displayName: 'Title',
		canBeUsedToMatch: true,
		required: true,
		type: 'string',
	},
	{
		...sharedFieldShape,
		id: 'choice',
		displayName: 'Choice',
		type: 'options',
		options: [
			{ name: 'Choice 1', value: 'Choice 1' },
			{ name: 'Choice 2', value: 'Choice 2' },
			{ name: 'Choice 3', value: 'Choice 3' },
		],
	},
	{ ...sharedFieldShape, id: 'datetime', displayName: 'Datetime', type: 'dateTime' },
	{ ...sharedFieldShape, id: 'person', displayName: 'Person', type: 'string' },
	{ ...sharedFieldShape, id: 'number', displayName: 'Number', type: 'number' },
	{ ...sharedFieldShape, id: 'bool', displayName: 'Bool', type: 'boolean' },
	{ ...sharedFieldShape, id: 'hyperlink.Url', displayName: 'Hyperlink (URL)', type: 'url' },
	{
		...sharedFieldShape,
		id: 'hyperlink.Description',
		displayName: 'Hyperlink (Description)',
		type: 'string',
	},
	{ ...sharedFieldShape, id: 'currency', displayName: 'Currency', type: 'number' },
	{ ...sharedFieldShape, id: 'image', displayName: 'Image', type: 'object' },
	{ ...sharedFieldShape, id: 'lookup', displayName: 'Lookup', type: 'string' },
	{ ...sharedFieldShape, id: 'AverageRating', displayName: 'Rating (0-5)', type: 'number' },
];

const SYNTHETIC_ID_FIELD = {
	id: 'id',
	displayName: 'ID',
	canBeUsedToMatch: true,
	defaultMatch: false,
	display: true,
	readOnly: true,
	required: true,
	type: 'string',
};

describe('Microsoft SharePoint v2 — list columns as form fields', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown) => (name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams({ site: { mode: 'id', value: SITE_ID }, list: LIST_ID, operation: 'create' });
	});

	it('maps a full contentTypes reply to the v1 baseline fields plus the documented v2 deltas', async () => {
		apiRequest.mockResolvedValue({ ...V1_CONTENT_TYPES_REPLY });

		const result = await getMappingColumns.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/contentTypes`,
			{},
			{ expand: 'columns' },
		);
		expect(result).toEqual({ fields: EXPECTED_CREATE_FIELDS });
	});

	it('produces fields for neither hidden nor read-only columns', async () => {
		apiRequest.mockResolvedValue(
			contentTypesReply([
				{ displayName: 'Visible', name: 'Visible', hidden: false, readOnly: false, type: 'text' },
				{ displayName: 'Hidden', name: 'Hidden', hidden: true, readOnly: false, type: 'text' },
				{ displayName: 'Locked', name: 'Locked', hidden: false, readOnly: true, type: 'text' },
			]),
		);

		const result = await getMappingColumns.call(ctx);

		expect(result.fields.map((field) => field.id)).toEqual(['Visible']);
	});

	it('omits location, geolocation, and metadata columns entirely', async () => {
		apiRequest.mockResolvedValue(
			contentTypesReply([
				{ displayName: 'Where', name: 'Where', hidden: false, readOnly: false, type: 'location' },
				{
					displayName: 'Coords',
					name: 'Coords',
					hidden: false,
					readOnly: false,
					type: 'geolocation',
				},
				{ displayName: 'Tags', name: 'Tags', hidden: false, readOnly: false, type: 'term' },
				{
					displayName: 'MultiTags',
					name: 'MultiTags',
					hidden: false,
					readOnly: false,
					type: 'multiterm',
				},
				{ displayName: 'Kept', name: 'Kept', hidden: false, readOnly: false, type: 'text' },
			]),
		);

		const result = await getMappingColumns.call(ctx);

		expect(result.fields.map((field) => field.id)).toEqual(['Kept']);
	});

	it('returns false for the match and required flags on columns where Graph omits them', async () => {
		apiRequest.mockResolvedValue(contentTypesReply([{ displayName: 'Bare', name: 'Bare' }]));

		const result = await getMappingColumns.call(ctx);

		expect(result.fields).toEqual([
			{
				id: 'Bare',
				displayName: 'Bare',
				canBeUsedToMatch: false,
				defaultMatch: false,
				display: true,
				readOnly: false,
				required: false,
				type: 'string',
			},
		]);
	});

	it('presents a choice column without listed choices as an empty options field', async () => {
		apiRequest.mockResolvedValue(
			contentTypesReply([
				{ displayName: 'Pick', name: 'Pick', hidden: false, readOnly: false, type: 'choice' },
			]),
		);

		const result = await getMappingColumns.call(ctx);

		expect(result.fields[0].type).toBe('options');
		expect(result.fields[0].options).toEqual([]);
	});

	it('presents a hyperlink column as a URL input and a description input', async () => {
		apiRequest.mockResolvedValue(
			contentTypesReply([
				{
					displayName: 'My Link',
					name: 'mylink',
					hidden: false,
					readOnly: false,
					required: true,
					type: 'url',
				},
			]),
		);

		const result = await getMappingColumns.call(ctx);

		expect(result.fields).toEqual([
			{
				id: 'mylink.Url',
				displayName: 'My Link (URL)',
				canBeUsedToMatch: false,
				defaultMatch: false,
				display: true,
				readOnly: false,
				required: true,
				type: 'url',
			},
			{
				id: 'mylink.Description',
				displayName: 'My Link (Description)',
				canBeUsedToMatch: false,
				defaultMatch: false,
				display: true,
				readOnly: false,
				required: false,
				type: 'string',
			},
		]);
	});

	it('loads the fields with both sign-in methods', async () => {
		// Real transport here (not the stub): the reply is fed to the credential-
		// specific request helper each auth mode routes through.
		const { microsoftApiRequest: realMicrosoftApiRequest } =
			await vi.importActual<typeof _importType0>('../../../v2/transport');
		apiRequest
			.mockImplementationOnce(realMicrosoftApiRequest)
			.mockImplementationOnce(realMicrosoftApiRequest);
		ctx.getCredentials.mockResolvedValue({});
		ctx.helpers.requestOAuth2.mockResolvedValue({ ...V1_CONTENT_TYPES_REPLY });
		ctx.helpers.requestWithAuthentication.mockResolvedValue({ ...V1_CONTENT_TYPES_REPLY });

		setParams({
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			operation: 'create',
			authentication: 'microsoftOAuth2Api',
		});
		const delegated = await getMappingColumns.call(ctx);

		setParams({
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			operation: 'create',
			authentication: transport.SERVICE_PRINCIPAL_AUTH,
		});
		const appOnly = await getMappingColumns.call(ctx);

		expect(ctx.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		expect(ctx.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(delegated).toEqual({ fields: EXPECTED_CREATE_FIELDS });
		expect(appOnly).toEqual(delegated);
	});

	it('appends the ID matching field after the mapped columns for update, matching v1', async () => {
		setParams({ site: { mode: 'id', value: SITE_ID }, list: LIST_ID, operation: 'update' });
		apiRequest.mockResolvedValue(
			contentTypesReply([
				{ displayName: 'Title', name: 'Title', hidden: false, readOnly: false, type: 'text' },
			]),
		);

		const result = await getMappingColumns.call(ctx);

		expect(result.fields.map((field) => field.id)).toEqual(['Title', 'id']);
		expect(result.fields[1]).toEqual(SYNTHETIC_ID_FIELD);
	});

	it('does not append the ID field for upsert — it matches on a real column', async () => {
		setParams({ site: { mode: 'id', value: SITE_ID }, list: LIST_ID, operation: 'upsert' });
		apiRequest.mockResolvedValue(contentTypesReply([]));

		const result = await getMappingColumns.call(ctx);

		expect(result).toEqual({ fields: [] });
	});

	it('reads columns from the first content type only', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{
					columns: [
						{ displayName: 'First', name: 'First', hidden: false, readOnly: false, type: 'text' },
					],
				},
				{
					columns: [
						{ displayName: 'Second', name: 'Second', hidden: false, readOnly: false, type: 'text' },
					],
				},
			],
		});

		const result = await getMappingColumns.call(ctx);

		expect(result.fields.map((field) => field.id)).toEqual(['First']);
	});

	it('returns no fields when the list has no content types', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		await expect(getMappingColumns.call(ctx)).resolves.toEqual({ fields: [] });
	});

	it('accepts a list title and encodes it in the request path', async () => {
		setParams({ site: { mode: 'id', value: SITE_ID }, list: 'My List 1', operation: 'create' });
		apiRequest.mockResolvedValue(contentTypesReply([]));

		await getMappingColumns.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/My%20List%201/contentTypes`,
			{},
			{ expand: 'columns' },
		);
	});

	it('rejects an empty List value before requesting', async () => {
		setParams({ site: { mode: 'id', value: SITE_ID }, list: '', operation: 'create' });

		await expect(getMappingColumns.call(ctx)).rejects.toThrow("The 'List' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty Site value before requesting', async () => {
		setParams({ site: { mode: 'id', value: '' }, list: LIST_ID, operation: 'create' });

		await expect(getMappingColumns.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('is wired into the node as a resource-mapping method', () => {
		const node = new MicrosoftSharePointV2(versionDescription);

		expect(node.methods?.resourceMapping?.getMappingColumns).toBe(getMappingColumns);
	});

	it.each(['add', 'update', 'upsert'] as const)(
		'builds the shared columns property for the %s mode',
		(mode) => {
			const property = itemColumns(mode);

			expect(property.name).toBe('columns');
			expect(property.type).toBe('resourceMapper');
			expect(property.default).toEqual({ mappingMode: 'defineBelow', value: null });
			expect(property.displayOptions?.hide).toEqual({ site: [''], list: [''] });
			expect(property.typeOptions?.loadOptionsDependsOn).toEqual(['site.value', 'list.value']);
			expect(property.typeOptions?.resourceMapper).toEqual({
				resourceMapperMethod: 'getMappingColumns',
				mode,
				fieldWords: { singular: 'column', plural: 'columns' },
				addAllFields: true,
				multiKeyMatch: false,
			});
		},
	);
});
