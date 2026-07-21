import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { type GraphSearchReply } from './utils';
import { microsoftApiRequest } from '../transport';

// A page can yield nothing to show (filtered out, or the wrong item kind);
// those pages are walked here in one call — the editor would otherwise re-request
// per empty page — capped so a single dropdown request can't crawl a whole collection.
export const SEARCH_PAGE_LIMIT = 10;

export type CollectionSearchOptions<T> = {
	/** First-page resource path; ignored once `paginationToken` is set. */
	endpoint: string;
	qs: IDataObject;
	toResult: (item: T) => { name: string; value: string } | null;
	filter?: string;
	paginationToken?: string;
};

/**
 * Pages through a Graph collection, mapping each entry to a dropdown result via
 * `toResult` (return `null` to drop an entry) and applying the typed filter to
 * the produced label — Graph can't substring-filter these collections
 * server-side. Next-page links are requested exactly as returned — never
 * rebuilt.
 */
export async function searchGraphCollection<T>(
	this: ILoadOptionsFunctions,
	options: CollectionSearchOptions<T>,
): Promise<INodeListSearchResult> {
	const filterLower = options.filter?.toLowerCase();
	// Kept in the API's order: the editor concatenates pages, so a per-page
	// sort would reset at every page boundary and read as misordered
	const results: INodeListSearchResult['results'] = [];
	let nextToken = options.paginationToken;
	let pagesLeft = SEARCH_PAGE_LIMIT;

	do {
		const response = nextToken
			? ((await microsoftApiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					nextToken,
				)) as GraphSearchReply<T>)
			: ((await microsoftApiRequest.call(
					this,
					'GET',
					options.endpoint,
					{},
					options.qs,
				)) as GraphSearchReply<T>);

		for (const item of response.value ?? []) {
			const result = options.toResult(item);
			if (!result) continue;
			if (filterLower && !result.name.toLowerCase().includes(filterLower)) continue;
			results.push(result);
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

type DriveItem = { id?: string; name?: string; folder?: unknown; file?: unknown };

/**
 * Drive-items wrapper over `searchGraphCollection`: keeps the entries `keep`
 * accepts and labels each by its file name.
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
	return await searchGraphCollection.call<
		ILoadOptionsFunctions,
		[CollectionSearchOptions<DriveItem>],
		Promise<INodeListSearchResult>
	>(this, {
		endpoint: options.endpoint,
		qs: options.qs,
		filter: options.filter,
		paginationToken: options.paginationToken,
		toResult: (item) =>
			item.id && options.keep(item)
				? { name: item.name ?? String(item.id), value: String(item.id) }
				: null,
	});
}
