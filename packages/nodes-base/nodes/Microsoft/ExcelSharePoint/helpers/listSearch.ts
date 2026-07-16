import type { INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';

import type { AuthContext, GraphListResponse, NamedGraphItem } from './interfaces';
import { microsoftApiRequest } from '../transport';

const PAGE_SIZE = 100;

export type ListSearchItemMapper<T extends NamedGraphItem = NamedGraphItem> = (
	item: T,
) => INodeListSearchItems;

/**
 * Lists one page of a Graph collection for a searchable resourceLocator dropdown.
 * Neither the worksheets nor the tables endpoint supports server-side `$search`,
 * so a typed filter narrows the page's `name` client-side instead. A
 * `paginationToken` is always the previous page's `@odata.nextLink`, followed
 * verbatim — never rebuilt with `endpoint` or extra query params.
 */
export async function listSearchPage<T extends NamedGraphItem = NamedGraphItem>(
	this: AuthContext,
	endpoint: string,
	mapItem: ListSearchItemMapper<T>,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const response = paginationToken
		? await (microsoftApiRequest<GraphListResponse<T>>).call(
				this,
				'GET',
				'',
				{},
				{},
				paginationToken,
			)
		: await (microsoftApiRequest<GraphListResponse<T>>).call(
				this,
				'GET',
				endpoint,
				{},
				{ $top: PAGE_SIZE },
			);

	const items = response.value ?? [];
	const filtered = filter
		? items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
		: items;

	return {
		results: filtered.map(mapItem),
		paginationToken: response['@odata.nextLink'],
	};
}
