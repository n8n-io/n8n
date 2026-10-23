import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { SEARCH_MAX_LIMIT } from './accountSearch';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared Item selector, dependent on the board selected in the `boardId`
 * parameter. Boards can hold millions of items, so From List NEVER dumps the
 * whole board: without a search term it shows the first page of items, and
 * a typed search term goes to the cross-entity search API (search.items
 * scoped by board_ids) — fuzzy, relevance-ranked matching instead of a
 * literal contains_text rule. Search results are capped at 20 by the API
 * (top-N by relevance, no pagination); typing a more specific term narrows
 * the candidates.
 */
export const itemResourceLocator: INodeProperties = {
	displayName: 'Item',
	name: 'itemId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The item to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchItems',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1234567890',
		},
	],
};

/**
 * Item selection mode switch for item-only operations (Update: Create,
 * Item: Get, Item: Get Subscribers, Update: Get Many, Notification:
 * Create). Item IDs are globally unique, so the board picker exists purely
 * to power the From List item search — By Item ID skips it entirely.
 * Declared per operation group with matching displayOptions.
 */
export const itemInputModeProperty: INodeProperties = {
	displayName: 'Item Input',
	name: 'itemInputMode',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'By Item ID',
			value: 'id',
			description: 'Provide the item ID directly — no board selection needed',
		},
		{
			name: 'From Board',
			value: 'list',
			description: 'Pick a board, then pick the item from its list',
		},
	],
	default: 'id',
	description: 'How to choose the item',
};

/** The item selector reduced to its From List mode — paired with a board
 * picker when itemInputMode is "list". */
export const itemListOnlyResourceLocator: INodeProperties = {
	...itemResourceLocator,
	modes: itemResourceLocator.modes!.filter((mode) => mode.name === 'list'),
};

/**
 * Progressive disclosure for the From Board path: keep the item picker
 * hidden until a board is chosen, because searchItems needs `boardId` and
 * would otherwise open to a "Parameter Board is required" error. Paired
 * with `itemListOnlyResourceLocator` only — a locator that also offers By
 * ID must stay visible, since that mode needs no board.
 *
 * displayOptions unwraps a resourceLocator to its `.value`, so `['']`
 * matches the unselected picker. Expressions (`=...`) don't match and stay
 * visible.
 */
export const HIDE_UNTIL_BOARD_SELECTED = { boardId: [''] };

/**
 * The By Item ID field: a plain text input, not a one-mode resourceLocator
 * (which the UI still renders as a picker with a mode dropdown). Keeps the
 * `itemId` name so execution code reads the same parameter either way.
 */
export const itemIdTextProperty: INodeProperties = {
	displayName: 'Item ID',
	name: 'itemId',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. 1234567890',
	description: 'The ID of the item to operate on',
};

const ITEM_SEARCH_PAGE_SIZE = 50;

interface ItemRow {
	id: string;
	name: string;
	group?: { title?: string } | null;
	parent_item?: { id?: string; name?: string } | null;
}

/** Labels subitems by their parent so nested rows are distinguishable. */
export function formatItemSearchLabel(item: ItemRow): string {
	if (item.parent_item?.name) return `${item.name} (subitem of ${item.parent_item.name})`;
	return item.group?.title ? `${item.name} (${item.group.title})` : item.name;
}

/** A search.items result row: indexed snapshot + optional live entity. */
interface ItemSearchApiResult {
	id: string;
	indexed_data?: { name?: string | null } | null;
	live_data?: ItemRow | null;
}

/**
 * Search path: one search.items request scoped to the selected board,
 * relevance-ordered and fuzzy (contextual matching, not just contains).
 * Hard-capped at 20 results with no pagination (per the search API
 * reference) — a more specific term surfaces what the cap hides. Rows with
 * null live_data (deleted, inaccessible, or index lag) are kept on their
 * indexed_data name — the item may well be selectable, and dropping it
 * would hide legitimate results. Subitems come back too (they are indexed
 * under the same board on multi-level boards), labeled via parent_item.
 */
async function searchItemsViaSearchApi(
	client: MondayGraphQLClient,
	boardId: string,
	query: string,
): Promise<INodeListSearchResult> {
	const data = await client.execute(
		`query ($q: String!, $limit: Int, $boardIds: [ID!]) {
			search {
				items(query: $q, limit: $limit, board_ids: $boardIds) {
					results {
						id
						indexed_data { name }
						live_data { id name group { title } parent_item { id name } }
					}
				}
			}
		}`,
		0,
		{ q: query, limit: SEARCH_MAX_LIMIT, boardIds: [boardId] },
	);

	const container = (data.search as { items?: { results?: ItemSearchApiResult[] } } | undefined)
		?.items;

	const results = (container?.results ?? []).map((result) => ({
		name: result.live_data
			? formatItemSearchLabel(result.live_data)
			: (result.indexed_data?.name ?? String(result.id)),
		value: String(result.id),
	}));

	// No paginationToken: the search API returns top-N only.
	return { results };
}

/**
 * listSearch method for the item From List mode — hybrid, same pattern as
 * searchBoards:
 * - Filter typed → server-side fuzzy search across the selected board via
 *   search.items (searchItemsViaSearchApi above), relevance-ranked.
 * - No filter → browse mode: the first page of the board's items via
 *   items_page, so the picker never dumps a whole board.
 *
 * Multi-level boards keep items and subitems on ONE board; in browse mode
 * the list also covers subitems there (hierarchy_scope_config: "allItems")
 * — needed e.g. to pick a nested parent for Create → Subitem. The
 * all-items scope requires at least one rule (unfiltered it returns an
 * empty page — verified API bug), so browse matches every group. On the
 * search path subitems ride along in the search results themselves.
 */
export async function searchItems(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	if (!boardId) {
		return { results: [] };
	}

	const client = new MondayGraphQLClient(this);

	const query = filter?.trim();
	if (query) {
		return await searchItemsViaSearchApi(client, boardId, query);
	}

	const data = await client.execute(
		`query ($ids: [ID!], $limit: Int!, $queryParams: ItemsQuery) {
			boards(ids: $ids) {
				hierarchy_type
				groups { id }
				items_page(limit: $limit, query_params: $queryParams) {
					items { id name group { title } }
				}
			}
		}`,
		0,
		{
			ids: [boardId],
			limit: ITEM_SEARCH_PAGE_SIZE,
			queryParams: null,
		},
	);

	const boards = (data.boards ?? []) as Array<{
		hierarchy_type?: string | null;
		groups?: Array<{ id: string }>;
		items_page?: { items?: ItemRow[] };
	}>;
	let items = boards[0]?.items_page?.items ?? [];

	if (boards[0]?.hierarchy_type === 'multi_level') {
		const groupIds = (boards[0].groups ?? []).map((group) => group.id);
		const rule = {
			column_id: 'group',
			compare_value: groupIds,
			operator: 'any_of',
		};
		const scoped = await client.execute(
			`query ($ids: [ID!], $limit: Int!, $queryParams: ItemsQuery) {
				boards(ids: $ids) {
					items_page(limit: $limit, query_params: $queryParams, hierarchy_scope_config: "allItems") {
						items { id name group { title } parent_item { id name } }
					}
				}
			}`,
			0,
			{ ids: [boardId], limit: ITEM_SEARCH_PAGE_SIZE, queryParams: { rules: [rule] } },
		);
		const scopedBoards = (scoped.boards ?? []) as Array<{ items_page?: { items?: ItemRow[] } }>;
		items = scopedBoards[0]?.items_page?.items ?? items;
	}

	return {
		results: items.map((item) => ({
			name: formatItemSearchLabel(item),
			value: item.id,
		})),
	};
}
