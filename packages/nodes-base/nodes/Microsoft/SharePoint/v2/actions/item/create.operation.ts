import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	ResourceMapperField,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import {
	addUniqueConstraintHint,
	assertPathSegment,
	HYPERLINK_WRITE_HEADERS,
} from '../../helpers/utils';
import { buildItemFieldsPayload, resolveItemMapperValues } from '../../item';
import { listRLC, untilSiteSelected } from '../../list';
import { itemColumns } from '../../list/columns';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site the list belongs to',
	},
	{
		...listRLC,
		description: 'Select the list to create an item in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	itemColumns('add'),
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	// https://learn.microsoft.com/en-us/graph/api/listitem-create
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const listIdOrTitle = assertPathSegment(
		this.getNode(),
		String(this.getNodeParameter('list', i, '', { extractValue: true })),
		'List',
	);

	const schema = this.getNodeParameter('columns.schema', i, []) as ResourceMapperField[];
	const value = resolveItemMapperValues.call(this, i);
	const { fields, hasHyperlink } = buildItemFieldsPayload(value, schema);

	try {
		return await microsoftApiRequest.call(
			this,
			'POST',
			`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items`,
			{ fields },
			{},
			undefined,
			hasHyperlink ? HYPERLINK_WRITE_HEADERS : {},
		);
	} catch (error) {
		addUniqueConstraintHint(error);
		throw error;
	}
}
