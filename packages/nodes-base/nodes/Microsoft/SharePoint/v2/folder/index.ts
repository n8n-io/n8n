import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { searchDriveItems } from '../helpers/graphSearch';
import { resolveSiteId } from '../site';

/** Hide gate: file fields stay hidden until a folder is chosen. */
export const untilFolderSelected = { folder: [''] };

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

/**
 * Lists the folders of the chosen site's default document library. The typed
 * filter is applied to the fetched results, walking further pages when needed.
 */
export async function getFolders(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const siteId = paginationToken ? '' : await resolveSiteId.call(this, 0);

	return await searchDriveItems.call(this, {
		endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/drive/items`,
		qs: {
			$select: 'id,name,folder',
			// `folder` isn't a documented filterable property, so the reply is
			// re-checked by `keep`; when honored this just trims the payload
			$filter: 'folder ne null',
		},
		keep: (item) => Boolean(item.folder),
		filter,
		paginationToken,
	});
}
