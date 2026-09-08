import { microsoftApiRequest } from '../transport';
const PAGE_SIZE = 100;
/**
 * Lists one page of a Graph collection for a searchable resourceLocator dropdown.
 * Neither the worksheets nor the tables endpoint supports server-side `$search`,
 * so a typed filter narrows each page's `name` client-side instead. A
 * `paginationToken` is always a previous page's `@odata.nextLink`, followed
 * verbatim — never rebuilt with `endpoint` or extra query params.
 *
 * The editor disables "load more" while a filter is active (it assumes a
 * searchable dropdown does server-side search across the whole collection),
 * so a filter that only ever looked at the page it was given would make an
 * item past that page look like it doesn't exist, with no way to reach it.
 * While filtering, keep following `@odata.nextLink` on our own until a page
 * has a match or there are no more pages — matching, not exhaustive: this
 * stops at the first non-empty page rather than collecting every match in
 * the collection.
 */
export async function listSearchPage(endpoint, mapItem, filter, paginationToken) {
    let nextLink = paginationToken;
    let matches = [];
    do {
        const response = nextLink
            ? await (microsoftApiRequest).call(this, 'GET', '', {}, {}, nextLink)
            : await (microsoftApiRequest).call(this, 'GET', endpoint, {}, { $top: PAGE_SIZE });
        const items = response.value ?? [];
        matches = filter
            ? items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
            : items;
        nextLink = response['@odata.nextLink'];
    } while (filter && matches.length === 0 && nextLink !== undefined);
    return {
        results: matches.map(mapItem),
        paginationToken: nextLink,
    };
}
//# sourceMappingURL=listSearch.js.map