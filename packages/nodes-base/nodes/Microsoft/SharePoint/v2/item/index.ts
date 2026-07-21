import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { type GraphSearchReply } from '../helpers/utils';
import { resolveSiteId } from '../site';
import { microsoftApiRequest } from '../transport';

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

type ItemSearchReply = GraphSearchReply<{
	id?: string;
	// FileLeafRef is a document library's file name; Title is empty there (see label fallback).
	fields?: { Title?: string; FileLeafRef?: string };
}>;

/**
 * Searches a list's items by their Title. Resolves `site` via `resolveSiteId`
 * and reads `list` through the resource locator so a URL-mode site and a
 * title-mode list behave identically here and in the Item actions.
 * Next-page links are requested exactly as returned (see `getLists`).
 */
export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// In load-options contexts getNodeParameter's 2nd arg is the fallback, not
	// an item index (see getLists) — a real site/list value exists by the time
	// this dropdown can be opened. extractValue unwraps the list resource locator.
	const siteId = await resolveSiteId.call(this, 0);
	const list = String(this.getNodeParameter('list', 0, { extractValue: true }));

	let response: ItemSearchReply;
	if (paginationToken) {
		response = (await microsoftApiRequest.call(
			this,
			'GET',
			'',
			{},
			{},
			paginationToken,
		)) as ItemSearchReply;
	} else {
		response = (await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(list)}/items`,
			{},
			// Graph requires the `$`-prefixed nested option: fields($select=...).
			// (v1's legacy endpoint tolerated `select=Title`; Graph's OData parser rejects it.)
			// FileLeafRef gives document libraries a file-name label where Title is empty.
			{ $expand: 'fields($select=Title,FileLeafRef)', $select: 'id,fields' },
		)) as ItemSearchReply;
	}

	// Graph's item collection doesn't offer a Title substring filter, so the
	// typed text filters the reply client-side rather than as a $filter.
	const filterLower = filter?.toLowerCase();
	// Kept in the API's order — a per-page sort would reset at every page
	// boundary once results span pages (see getLists).
	const results = (response.value ?? [])
		.filter((item) => {
			if (!item.id) return false;
			if (!filterLower) return true;
			// Match either label so filtering works for document-library file names too.
			const label = `${item.fields?.Title ?? ''} ${item.fields?.FileLeafRef ?? ''}`;
			return label.toLowerCase().includes(filterLower);
		})
		.map((item) => ({
			// `||` (not `??`) so an empty Title falls back to FileLeafRef, then the item's ID.
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty Title must fall back, which ?? would not do
			name: item.fields?.Title || item.fields?.FileLeafRef || String(item.id),
			value: String(item.id),
		}));

	return { results, paginationToken: response['@odata.nextLink'] };
}
