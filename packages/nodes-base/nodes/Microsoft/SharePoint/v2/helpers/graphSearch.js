import { microsoftApiRequest } from '../transport';
// Caps how many pages a single dropdown request walks looking for matches.
export const SEARCH_PAGE_LIMIT = 10;
/**
 * Pages through a Graph collection, mapping each entry via `toResult` (return
 * `null` to drop it) and filtering on the produced label — Graph can't
 * substring-filter these collections server-side.
 */
export async function searchGraphCollection(options) {
    const filterLower = options.filter?.toLowerCase();
    // Kept in the API's order — the editor concatenates pages.
    const results = [];
    let nextToken = options.paginationToken;
    let pagesLeft = SEARCH_PAGE_LIMIT;
    do {
        const response = nextToken
            ? (await microsoftApiRequest.call(this, 'GET', '', {}, {}, nextToken))
            : (await microsoftApiRequest.call(this, 'GET', options.endpoint, {}, options.qs));
        for (const item of response.value ?? []) {
            const result = options.toResult(item);
            if (!result)
                continue;
            if (filterLower && !result.name.toLowerCase().includes(filterLower))
                continue;
            results.push(result);
        }
        nextToken = response['@odata.nextLink'];
        pagesLeft -= 1;
    } while (nextToken !== undefined &&
        pagesLeft > 0 &&
        (filterLower !== undefined || results.length === 0));
    return { results, paginationToken: nextToken };
}
/** Drive-items wrapper over `searchGraphCollection`, labelling each by file name. */
export async function searchDriveItems(options) {
    return await searchGraphCollection.call(this, {
        endpoint: options.endpoint,
        qs: options.qs,
        filter: options.filter,
        paginationToken: options.paginationToken,
        toResult: (item) => item.id && options.keep(item)
            ? { name: item.name ?? String(item.id), value: String(item.id) }
            : null,
    });
}
//# sourceMappingURL=graphSearch.js.map