import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { resolveSiteId } from '../site';
import { microsoftApiRequest } from '../transport';

export const folderRLC: INodeProperties = {
	displayName: 'Parent Folder',
	name: 'folder',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The folder to operate on, within the site’s default document library',
	typeOptions: {
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

// The editor stops auto-paging while a filter is typed, so getFolders pages itself, capped here
const FILTERED_SEARCH_PAGE_LIMIT = 10;

export async function getFolders(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const siteId = paginationToken ? '' : await resolveSiteId.call(this, 0);

	const filterLower = filter?.toLowerCase();
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
						// Graph rejects this enumeration without a $filter but ignores this
						// one, so it must stay; the reply is re-checked below
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
