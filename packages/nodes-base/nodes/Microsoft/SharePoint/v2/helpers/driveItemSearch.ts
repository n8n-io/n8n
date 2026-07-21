import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

// A drive page can yield nothing to show (wrong item kind, or no filter match);
// those pages are walked here in one call — the editor would otherwise re-request
// per empty page — capped so a single dropdown request can't crawl a whole drive.
export const SEARCH_PAGE_LIMIT = 10;

type DriveItem = { id?: string; name?: string; folder?: unknown; file?: unknown };

type DriveItemsReply = {
	'@odata.nextLink'?: string;
	value?: DriveItem[];
};

/**
 * Pages through a drive-items collection, keeping the entries `keep` accepts
 * and applying the typed filter to their names — Graph can't filter drive
 * items by name server-side. Next-page links are requested exactly as
 * returned — never rebuilt.
 */
export async function searchDriveItems(
	this: ILoadOptionsFunctions,
	options: {
		/** First-page resource path; ignored once `paginationToken` is set. */
		endpoint: string;
		qs: IDataObject;
		keep: (item: DriveItem) => boolean;
		filter?: string;
		paginationToken?: string;
	},
): Promise<INodeListSearchResult> {
	const filterLower = options.filter?.toLowerCase();
	// Kept in the API's order: the editor concatenates pages, so a per-page
	// sort would reset at every page boundary and read as misordered
	const results: INodeListSearchResult['results'] = [];
	let nextToken = options.paginationToken;
	let pagesLeft = SEARCH_PAGE_LIMIT;

	do {
		const response = nextToken
			? ((await microsoftApiRequest.call(this, 'GET', '', {}, {}, nextToken)) as DriveItemsReply)
			: ((await microsoftApiRequest.call(
					this,
					'GET',
					options.endpoint,
					{},
					options.qs,
				)) as DriveItemsReply);

		for (const item of response.value ?? []) {
			if (!item.id || !options.keep(item)) continue;
			if (filterLower && !(item.name ?? '').toLowerCase().includes(filterLower)) continue;
			results.push({
				name: item.name ?? String(item.id),
				value: String(item.id),
			});
		}

		nextToken = response['@odata.nextLink'];
		pagesLeft -= 1;
	} while (
		nextToken !== undefined &&
		pagesLeft > 0 &&
		(filterLower !== undefined || results.length === 0)
	);

	return { results, paginationToken: nextToken };
}
