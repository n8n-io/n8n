import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { assertPathSegment } from '../../helpers/utils';
import { resolveItemMapperValues, resolveMatchedItemIds, updateItemFields } from '../../item';
import { listRLC, untilSiteSelected } from '../../list';
import { itemColumns } from '../../list/columns';
import { resolveSiteId, siteRLC } from '../../site';

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

	const ids = await resolveMatchedItemIds.call(
		this,
		siteId,
		listIdOrTitle,
		matchingColumns,
		values,
	);
	if (ids.length !== 1) {
		// v1's exact wording for "no single item matched" (covers zero and several)
		throw new NodeOperationError(this.getNode(), "The column(s) don't match any existing item", {
			description: 'Double-check the value(s) for the columns to match and try again',
		});
	}

	return await updateItemFields.call(this, siteId, listIdOrTitle, ids[0], values, schema);
}
