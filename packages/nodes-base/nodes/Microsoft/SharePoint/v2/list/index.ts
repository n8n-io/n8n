import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { type GraphSearchReply } from '../helpers/utils';
import { resolveSiteId } from '../site';
import { microsoftApiRequest } from '../transport';

/** Hide gate copied from v1: the list field stays hidden until a site is chosen. */
export const untilSiteSelected = { site: [''] };

export const untilListSelected = { list: [''] };

// Colocated with getLists/resolveSiteId, mirroring how siteRLC lives next to
// getSites/resolveSiteId in v2/site/index.ts, rather than a separate registry.
export const listRLC: INodeProperties = {
	displayName: 'List',
	name: 'list',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The list to operate on. You can use the list title in place of the ID.',
	typeOptions: {
		loadOptionsDependsOn: ['site.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getLists',
				searchable: true,
			},
		},
		{
			displayName: 'By ID or Title',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 58a279af-1f06-4392-a5ed-2b37fa1d6c1d or My List',
		},
	],
};

type ListSearchReply = GraphSearchReply<{ id?: string; displayName?: string }>;

/**
 * Searches a site's lists by display name. Resolves `site` via `resolveSiteId`
 * so a URL-mode site behaves identically here and in the List actions.
 * Next-page links are requested exactly as returned (see `getSites`).
 */
export async function getLists(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// In load-options contexts getNodeParameter's 2nd arg is the fallback, not
	// an item index (see getSharePointCredentialType) — 0 is safe here since a
	// real `site` value exists by the time this dropdown can be opened. The
	// site field validates itself inside resolveSiteId.
	const siteId = await resolveSiteId.call(this, 0);

	let response: ListSearchReply;
	if (paginationToken) {
		response = (await microsoftApiRequest.call(
			this,
			'GET',
			'',
			{},
			{},
			paginationToken,
		)) as ListSearchReply;
	} else {
		response = (await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/sites/${encodeURIComponent(siteId)}/lists`,
			{},
			{ $select: 'id,displayName' },
		)) as ListSearchReply;
	}

	// Graph's /lists only honors `eq` filters (no startswith), so the typed
	// text filters the reply client-side instead of being sent as a $filter.
	const filterLower = filter?.toLowerCase();
	// Kept in the API's order — a per-page sort would reset at every page
	// boundary once results span pages (see getSites).
	const results = (response.value ?? [])
		.filter(
			(list) =>
				list.id && (!filterLower || (list.displayName ?? '').toLowerCase().includes(filterLower)),
		)
		.map((list) => ({ name: list.displayName ?? String(list.id), value: String(list.id) }));

	return { results, paginationToken: response['@odata.nextLink'] };
}
