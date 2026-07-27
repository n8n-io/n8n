import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '../../../../../../utils/descriptions';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { LIST_SIMPLIFY_SELECT } from '../../helpers/utils';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	{ ...siteRLC, description: 'Select the site to retrieve lists from' },
	...returnAllOrLimit,
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = { show: { resource: ['list'], operation: ['getAll'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	// https://learn.microsoft.com/en-us/graph/api/list-list — the site field
	// validates itself inside resolveSiteId.
	const siteId = await resolveSiteId.call(this, i, siteIdCache);

	const returnAll = this.getNodeParameter('returnAll', i);
	const simplify = this.getNodeParameter('simplify', i) as boolean;

	const qs: IDataObject = {};
	if (simplify) {
		qs.$select = LIST_SIMPLIFY_SELECT;
	}

	let limit: number | undefined;
	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
		qs.$top = limit; // hint only — Graph may still return fewer per page
	}

	const lists = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		`/v1.0/sites/${encodeURIComponent(siteId)}/lists`,
		{},
		qs,
		limit,
	);

	if (!simplify) return lists;
	return lists.map((list) => {
		delete list['@odata.context'];
		delete list['@odata.etag'];
		return list;
	});
}
