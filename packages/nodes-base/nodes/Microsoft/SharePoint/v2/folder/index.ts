import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { resolveSiteId } from '../site';
import { microsoftApiRequest } from '../transport';

// The whole folder-selection piece lives here — the field and the search
// behind it — so the later file actions plug it in without their own copies.

export const folderRLC: INodeProperties = {
	displayName: 'Parent Folder',
	name: 'folder',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The folder to operate on, within the site’s default document library',
	typeOptions: {
		// Re-fetch the folder list whenever the chosen site changes
		loadOptionsDependsOn: ['site.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getFolders',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA, or root for the library root',
		},
	],
};

type FolderSearchReply = {
	'@odata.nextLink'?: string;
	value?: Array<{ id?: string; name?: string; folder?: unknown }>;
};

// The editor stops auto-paging while a filter is typed, so filtered matches on
// later pages would be unreachable; getFolders walks pages itself instead,
// bounded so one keystroke can't crawl an arbitrarily large drive.
const FILTERED_SEARCH_PAGE_LIMIT = 10;

/**
 * Lists the folders of the chosen site's default document library. Graph can't
 * filter drive items by name server-side, so the typed filter is applied to
 * the fetched results — walking further pages when needed (see the page limit
 * above). Next-page links are requested exactly as returned — never rebuilt.
 */
export async function getFolders(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// resolveSiteId validates the site field itself, including the empty case
	const siteId = paginationToken ? '' : await resolveSiteId.call(this, 0);

	const filterLower = filter?.toLowerCase();
	// Kept in the API's order: the editor concatenates pages, so a per-page
	// sort would reset at every page boundary and read as misordered
	const results: INodeListSearchResult['results'] = [];
	let nextToken = paginationToken;
	let pagesLeft = filterLower ? FILTERED_SEARCH_PAGE_LIMIT : 1;

	do {
		const response = nextToken
			? ((await microsoftApiRequest.call(this, 'GET', '', {}, {}, nextToken)) as FolderSearchReply)
			: ((await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/sites/${encodeURIComponent(siteId)}/drive/items`,
					{},
					{
						$select: 'id,name,folder',
						// This enumeration route 400s without a $filter, yet doesn't honor
						// this one (`folder` isn't filterable) — it must stay even though
						// the reply is re-checked below. Same contract v1 has shipped on
						// since day one.
						$filter: 'folder ne null',
					},
				)) as FolderSearchReply);

		for (const item of response.value ?? []) {
			if (!item.id || !item.folder) continue;
			if (filterLower && !(item.name ?? '').toLowerCase().includes(filterLower)) continue;
			results.push({
				name: item.name ?? String(item.id),
				value: String(item.id),
			});
		}

		nextToken = response['@odata.nextLink'];
		pagesLeft -= 1;
	} while (nextToken !== undefined && pagesLeft > 0);

	return { results, paginationToken: nextToken };
}
