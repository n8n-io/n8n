import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { assertPathSegment, ITEM_SIMPLIFY_SELECT } from '../../helpers/utils';
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
		description: 'Select the item you want to retrieve',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	// https://learn.microsoft.com/en-us/graph/api/listitem-get
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
	const simplify = this.getNodeParameter('simplify', i) as boolean;

	// Simplify (default on) trims the response to v1's fields; off returns raw.
	const qs: IDataObject = simplify
		? { $select: ITEM_SIMPLIFY_SELECT, $expand: 'fields($select=Title)' }
		: { $expand: 'fields' };

	// Encode segments so user input can't escape its path segment.
	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(list)}/items/${encodeURIComponent(item)}`,
		{},
		qs,
	);

	if (simplify) {
		// Strip the same metadata keys v1's Simplify drops.
		delete response['@odata.context'];
		delete response['@odata.etag'];
		delete response['fields@odata.navigationLink'];
		delete (response.fields as IDataObject)?.['@odata.etag'];
	}

	return response;
}
