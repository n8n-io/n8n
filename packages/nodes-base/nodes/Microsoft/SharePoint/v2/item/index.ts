import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { type CollectionSearchOptions, searchGraphCollection } from '../helpers/graphSearch';
import { resolveSiteId } from '../site';

/** Keeps the item field hidden until a list is chosen. */
export const untilListSelected = { list: [''] };

export const itemRLC: INodeProperties = {
	displayName: 'Item',
	name: 'item',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The item to operate on',
	typeOptions: {
		loadOptionsDependsOn: ['site.value', 'list.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getItems',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1',
		},
	],
};

// FileLeafRef labels document-library items, where Title is empty.
type ItemEntry = { id?: string; fields?: { Title?: string; FileLeafRef?: string } };

/** Searches a list's items by label, paging through when a filter is typed. */
export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let endpoint = '';
	if (!paginationToken) {
		// In load-options contexts getNodeParameter's 2nd arg is a fallback, not an item index.
		const siteId = await resolveSiteId.call(this, 0);
		const list = String(this.getNodeParameter('list', 0, { extractValue: true }));
		endpoint = `/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(list)}/items`;
	}

	return await searchGraphCollection.call<
		ILoadOptionsFunctions,
		[CollectionSearchOptions<ItemEntry>],
		Promise<INodeListSearchResult>
	>(this, {
		endpoint,
		// Graph requires the nested form: fields($select=...), not select=Title.
		qs: { $expand: 'fields($select=Title,FileLeafRef)', $select: 'id,fields' },
		filter,
		paginationToken,
		toResult: (item) =>
			item.id
				? {
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty Title must fall back to FileLeafRef
						name: item.fields?.Title || item.fields?.FileLeafRef || String(item.id),
						value: String(item.id),
					}
				: null,
	});
}
