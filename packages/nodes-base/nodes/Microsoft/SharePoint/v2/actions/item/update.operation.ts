import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import {
	addUniqueConstraintHint,
	assertPathSegment,
	HYPERLINK_WRITE_HEADERS,
} from '../../helpers/utils';
import { buildItemFieldsPayload, lookupItemIdByColumns, resolveItemMapperValues } from '../../item';
import { listRLC, untilSiteSelected } from '../../list';
import { itemColumns } from '../../list/columns';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve lists from',
	},
	{
		...listRLC,
		description: 'Select the list you want to update an item in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	itemColumns('update'),
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject> {
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const listIdOrTitle = assertPathSegment(
		this.getNode(),
		String(this.getNodeParameter('list', i, '', { extractValue: true })),
		'List',
	);

	const matchingColumns = this.getNodeParameter('columns.matchingColumns', i, []) as string[];
	const schema = this.getNodeParameter('columns.schema', i, []) as ResourceMapperField[];
	const values = resolveItemMapperValues.call(this, i);

	let itemId: string | undefined;
	if (matchingColumns.includes('id')) {
		const idValue = values.id;
		itemId =
			idValue === undefined || idValue === null || idValue === '' ? undefined : String(idValue);
	} else if (matchingColumns.length > 0) {
		itemId = await lookupItemIdByColumns.call(this, siteId, listIdOrTitle, matchingColumns, values);
	}

	if (itemId === undefined) {
		// v1's exact wording for "no single item matched"
		throw new NodeOperationError(this.getNode(), "The column(s) don't match any existing item", {
			description: 'Double-check the value(s) for the columns to match and try again',
		});
	}

	itemId = assertPathSegment(this.getNode(), itemId, 'Item');

	const { fields, hasHyperlink } = buildItemFieldsPayload(values, schema);

	try {
		// The documented route updates the item's fields directly (v1 PATCHed the
		// item itself with a { fields } wrapper — a route Graph doesn't document).
		await microsoftApiRequest.call(
			this,
			'PATCH',
			`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items/${encodeURIComponent(itemId)}/fields`,
			fields,
			{},
			undefined,
			hasHyperlink ? HYPERLINK_WRITE_HEADERS : {},
		);
	} catch (error) {
		addUniqueConstraintHint(error);
		throw error;
	}

	// The /fields route replies with only the fieldValueSet, but v1 returned the
	// full listItem envelope — re-read the item so the output stays identical.
	return await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items/${encodeURIComponent(itemId)}`,
		{},
		{ $expand: 'fields' },
	);
}
