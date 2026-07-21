import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { type CollectionSearchOptions, searchGraphCollection } from '../helpers/driveItemSearch';
import { resolveSiteId } from '../site';

/** Hide gate mirroring untilSiteSelected: the item field stays hidden until a list is chosen. */
export const untilListSelected = { list: [''] };

// Colocated with getItems/resolveSiteId, mirroring how listRLC lives next to
// getLists in v2/list/index.ts, rather than a separate registry.
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

// FileLeafRef is a document library's file name; Title is empty there (see label fallback).
type ItemEntry = { id?: string; fields?: { Title?: string; FileLeafRef?: string } };

/**
 * Searches a list's items by their label, walking further pages when the typed
 * filter needs them (Graph can't substring-filter list items server-side).
 * Resolves `site` via `resolveSiteId` and reads `list` through the resource
 * locator so a URL-mode site and a title-mode list behave identically here and
 * in the Item actions.
 */
export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let endpoint = '';
	if (!paginationToken) {
		// In load-options contexts getNodeParameter's 2nd arg is the fallback, not
		// an item index (see getLists) — a real site/list value exists by the time
		// this dropdown can be opened. extractValue unwraps the list resource locator.
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
		// Graph requires the `$`-prefixed nested option: fields($select=...).
		// (v1's legacy endpoint tolerated `select=Title`; Graph's OData parser rejects it.)
		// FileLeafRef gives document libraries a file-name label where Title is empty.
		qs: { $expand: 'fields($select=Title,FileLeafRef)', $select: 'id,fields' },
		filter,
		paginationToken,
		toResult: (item) =>
			item.id
				? {
						// `||` (not `??`) so an empty Title falls back to FileLeafRef, then the item's ID.
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty Title must fall back, which ?? would not do
						name: item.fields?.Title || item.fields?.FileLeafRef || String(item.id),
						value: String(item.id),
					}
				: null,
	});
}
