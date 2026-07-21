import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { returnAllOrLimit } from '../../../../../../utils/descriptions';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { ITEM_SIMPLIFY_EXPAND, ITEM_SIMPLIFY_SELECT, simplifyItem } from '../../helpers/utils';
import { listRLC, untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site the list belongs to',
	},
	{
		...listRLC,
		description: 'Select the list you want to search for items in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		displayName: 'Filter by Formula',
		name: 'filter',
		type: 'string',
		default: '',
		description:
			'The formula will be evaluated for each record. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
		hint: 'If empty, all the items will be returned',
		placeholder: "e.g. fields/Title eq 'item1'",
	},
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				description: 'The fields you want to include in the output',
				displayOptions: {
					hide: {
						'/simplify': [true],
					},
				},
				options: [
					{ name: 'Content Type', value: 'contentType' },
					{ name: 'Created At', value: 'createdDateTime' },
					{ name: 'Created By', value: 'createdBy' },
					{ name: 'Fields', value: 'fields' },
					{ name: 'ID', value: 'id' },
					{ name: 'Last Modified At', value: 'lastModifiedDateTime' },
					{ name: 'Last Modified By', value: 'lastModifiedBy' },
					{ name: 'Parent Reference', value: 'parentReference' },
					{ name: 'Web URL', value: 'webUrl' },
				],
			},
		],
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
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	// https://learn.microsoft.com/en-us/graph/api/listitem-list
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const listIdOrTitle = (
		this.getNodeParameter('list', i, '', { extractValue: true }) as string
	).trim();
	if (listIdOrTitle === '') {
		throw new NodeOperationError(this.getNode(), "The 'List' parameter is empty", {
			description: 'Set the list ID or title and try again.',
		});
	}

	const filter = (this.getNodeParameter('filter', i, '') as string).trim();
	const returnAll = this.getNodeParameter('returnAll', i);
	const simplify = this.getNodeParameter('simplify', i) as boolean;
	const fields = this.getNodeParameter('options.fields', i, []) as string[];

	const qs: IDataObject = {};
	if (filter !== '') {
		qs.$filter = filter;
	}
	if (simplify) {
		// v1 parity: the trim happens server-side, the annotations client-side
		qs.$select = ITEM_SIMPLIFY_SELECT;
		qs.$expand = ITEM_SIMPLIFY_EXPAND;
	} else if (fields.length > 0) {
		qs.$select = fields.join(',');
		if (fields.includes('fields')) {
			qs.$expand = 'fields';
		}
	}

	let limit: number | undefined;
	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
		qs.$top = limit; // hint only — Graph may still return fewer per page
	}

	let items: IDataObject[];
	try {
		items = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items`,
			{},
			qs,
			limit,
			// SharePoint refuses filters on non-indexed columns without this opt-in
			filter !== '' ? { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } : {},
		);
	} catch (error) {
		// A non-indexed filter can fail part-way through a big list (the 5,000-item
		// view threshold); the run must fail naming the column, never return a
		// silent partial result.
		if (filter !== '' && error instanceof NodeApiError && /threshold/i.test(error.message)) {
			const columns = [...filter.matchAll(/fields\/(\w+)/g)].map((match) => match[1]);
			const subject = columns.length > 0 ? `column(s) '${columns.join("', '")}'` : 'this filter';
			throw new NodeOperationError(
				this.getNode(),
				`SharePoint could not finish filtering on ${subject}: large lists can only be filtered on indexed columns`,
				{
					description:
						'Add an index to the column in SharePoint (List settings → Indexed columns) or filter on an indexed column, then try again.',
				},
			);
		}
		throw error;
	}

	return simplify ? items.map(simplifyItem) : items;
}
