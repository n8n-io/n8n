import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as create from './create.operation';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { assertPathSegment } from '../../helpers/utils';
import { resolveItemMapperValues, resolveMatchedItemIds, updateItemFields } from '../../item';
import { listRLC, untilSiteSelected } from '../../list';
import { itemColumns } from '../../list/columns';
import { resolveSiteId, siteRLC } from '../../site';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site the list belongs to',
	},
	{
		...listRLC,
		description: 'Select the list you want to create or update an item in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	itemColumns('upsert'),
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['upsert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const listIdOrTitle = assertPathSegment(
		this.getNode(),
		String(this.getNodeParameter('list', i, '', { extractValue: true })),
		'List',
	);

	const matchingColumns = this.getNodeParameter('columns.matchingColumns', i, []) as string[];
	const schema = this.getNodeParameter('columns.schema', i, []) as ResourceMapperField[];
	const values = resolveItemMapperValues.call(this, i);

	const ids = await resolveMatchedItemIds.call(
		this,
		siteId,
		listIdOrTitle,
		matchingColumns,
		values,
	);
	if (ids.length >= 2) {
		// v1 created on multiple matches; we stop instead so an ambiguous match
		// never silently updates or duplicates the wrong item.
		throw new NodeOperationError(this.getNode(), 'Multiple items match the selected column(s)', {
			description:
				'Narrow the matching column(s) so they identify a single item, or remove the duplicates, then try again.',
		});
	}
	if (ids.length === 1) {
		return await updateItemFields.call(this, siteId, listIdOrTitle, ids[0], values, schema);
	}

	// No match → create. create.execute re-reads the same params (no extra API
	// call) and POSTs; its field builder also drops `id`, so upsert never leaks one.
	return await create.execute.call(this, i, siteIdCache);
}
