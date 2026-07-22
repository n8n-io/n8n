import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { searchDriveItems } from '../helpers/graphSearch';
import { resolveSiteId } from '../site';

// The whole file-selection piece lives here — the field and the search behind
// it — mirroring the site and folder modules.

export const fileRLC: INodeProperties = {
	displayName: 'File',
	name: 'file',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The file to operate on',
	typeOptions: {
		// Re-fetch the file list whenever the chosen site or folder changes
		loadOptionsDependsOn: ['site.value', 'folder.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getFiles',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 01SPEVVYELNAJ4S3XKNBBIEUJZOWXGE64U',
		},
	],
};

/**
 * Lists the files in the chosen folder. The typed filter is applied to the
 * fetched results, walking further pages when needed.
 */
export async function getFiles(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let endpoint = '';
	if (!paginationToken) {
		// resolveSiteId validates the site field itself, including the empty case
		const siteId = await resolveSiteId.call(this, 0);
		const folderId = (
			this.getNodeParameter('folder', undefined, { extractValue: true }) as string
		).trim();
		if (folderId === '') {
			throw new NodeOperationError(this.getNode(), "The 'Parent Folder' parameter is empty", {
				description: 'Choose a folder before selecting a file.',
			});
		}
		endpoint = `/v1.0/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(folderId)}/children`;
	}

	return await searchDriveItems.call(this, {
		endpoint,
		qs: {
			$select: 'id,name,file',
			// `file` isn't a documented filterable property, so the reply is
			// re-checked by `keep`; when honored this just trims the payload
			$filter: 'file ne null',
		},
		keep: (item) => Boolean(item.file),
		filter,
		paginationToken,
	});
}
