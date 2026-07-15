import type { IDataObject, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';

import type { AuthContext } from './interfaces';
import { microsoftApiRequest } from '../transport';

const PAGE_SIZE = 100;

export type ListSearchItemMapper = (item: IDataObject) => INodeListSearchItems;

/**
 * Lists one page of a Graph collection for a searchable resourceLocator dropdown.
 * Neither the worksheets nor the tables endpoint supports server-side `$search`,
 * so a typed filter narrows the page's `name` client-side instead. A
 * `paginationToken` is always the previous page's `@odata.nextLink`, followed
 * verbatim — never rebuilt with `endpoint` or extra query params.
 */
export async function listSearchPage(
	this: AuthContext,
	endpoint: string,
	mapItem: ListSearchItemMapper,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const response = paginationToken
		? await microsoftApiRequest.call(this, 'GET', '', {}, {}, paginationToken)
		: await microsoftApiRequest.call(this, 'GET', endpoint, {}, { $top: PAGE_SIZE });

	const items = (response.value as IDataObject[]) ?? [];
	const filtered = filter
		? items.filter((item) =>
				String(item.name ?? '')
					.toLowerCase()
					.includes(filter.toLowerCase()),
			)
		: items;

	return {
		results: filtered.map(mapItem),
		paginationToken: response['@odata.nextLink'] as string | undefined,
	};
}
