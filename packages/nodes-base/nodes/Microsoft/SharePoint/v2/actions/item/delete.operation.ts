import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { assertPathSegment } from '../../helpers/utils';
import { itemRLC, untilListSelected } from '../../item';
import { listRLC, untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site the item is in',
	},
	{
		...listRLC,
		description: 'Select the list the item is in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		...itemRLC,
		description: 'Select the item you want to delete',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	// https://learn.microsoft.com/en-us/graph/api/listitem-delete
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const list = assertPathSegment(
		this.getNode(),
		String(this.getNodeParameter('list', i, '', { extractValue: true })),
		'List',
	);
	const item = assertPathSegment(
		this.getNode(),
		String(this.getNodeParameter('item', i, '', { extractValue: true })),
		'Item',
	);

	// 204 has no body — report the deletion ourselves, like v1.
	await microsoftApiRequest.call(
		this,
		'DELETE',
		`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(list)}/items/${encodeURIComponent(item)}`,
	);

	return { deleted: true };
}
