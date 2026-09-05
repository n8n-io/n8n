import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { SEARCH_MAX_LIMIT } from './accountSearch';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared Board selector: the CRITICAL SCALE PATTERN for this package.
 * Two modes — From List (searchable, paginated, capped) and By ID. A board
 * URL carries no information beyond the ID it embeds, so pasting URLs is
 * not offered — it would only add a parsing failure mode.
 * Never enumerates an account: with no filter typed, the list mode pages
 * 50 recently-used boards at a time; a typed filter switches to the
 * cross-entity search API (search.boards), which matches server-side
 * across the whole account.
 */
export const boardResourceLocator: INodeProperties = {
	displayName: 'Board',
	name: 'boardId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The board to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchBoards',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1234567890',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[0-9]+',
						errorMessage: 'The board ID must be a number',
					},
				},
			],
		},
	],
};

const BOARDS_PAGE_SIZE = 50;

interface BoardSearchRow {
	id: string;
	name: string;
	url: string;
	type?: string;
	workspace?: { name?: string } | null;
}

/**
 * The boards query also returns monday docs (type "document") and subitem
 * boards (type "sub_items_board"). Only real boards belong in board lists.
 */
export function isRealBoard(board: { type?: string }): boolean {
	return board.type === 'board';
}

/**
 * The one way board options are labeled everywhere in this package:
 * "Board (Workspace)". Dropdowns can't render a second row, and putting the
 * workspace in the name also makes it searchable in every picker.
 */
export function formatBoardLabel(board: {
	name: string;
	workspace?: { name?: string } | null;
}): string {
	return board.workspace?.name ? `${board.name} (${board.workspace.name})` : board.name;
}

/** A search.boards result row: indexed snapshot + optional live entity. */
interface BoardSearchApiResult {
	id: string;
	indexed_data?: { name?: string | null; url?: string | null } | null;
	live_data?: BoardSearchRow | null;
}

/**
 * Search path: one search.boards request, relevance-ordered, hard-capped
 * at 20 results with no pagination (per the search API reference). Rows
 * whose live_data resolves to a non-board (docs ride along in board
 * search) are dropped; rows with null live_data (deleted, inaccessible,
 * or index lag per the reference) are kept on their indexed_data — the
 * board may well be selectable, and dropping it would hide legitimate
 * results.
 */
async function searchBoardsViaSearchApi(
	client: MondayGraphQLClient,
	query: string,
): Promise<INodeListSearchResult> {
	const data = await client.execute(
		`query ($q: String!, $limit: Int) {
			search {
				boards(query: $q, limit: $limit) {
					results {
						id
						indexed_data { name url }
						live_data { id name url type workspace { name } }
					}
				}
			}
		}`,
		0,
		{ q: query, limit: SEARCH_MAX_LIMIT },
	);

	const container = (data.search as { boards?: { results?: BoardSearchApiResult[] } } | undefined)
		?.boards;

	const results = (container?.results ?? [])
		.filter((result) => !result.live_data || isRealBoard(result.live_data))
		.map((result) => ({
			name: result.live_data
				? formatBoardLabel(result.live_data)
				: (result.indexed_data?.name ?? String(result.id)),
			value: String(result.id),
			url: result.live_data?.url ?? result.indexed_data?.url ?? undefined,
		}));

	// No paginationToken: the search API returns top-N only.
	return { results };
}

/**
 * listSearch method for the From List mode — hybrid:
 * - No filter → browse mode: pages through active boards (most recently
 *   used first), 50 per request; n8n asks for the next page via
 *   paginationToken as the user scrolls.
 * - Filter typed → server-side search across the whole account via
 *   search.boards (searchBoardsViaSearchApi above), so boards beyond the
 *   recently-used window are still findable on big accounts.
 */
export async function searchBoards(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const client = new MondayGraphQLClient(this);

	const query = filter?.trim();
	if (query) {
		return await searchBoardsViaSearchApi(client, query);
	}

	const page = paginationToken ? Number.parseInt(paginationToken, 10) : 1;

	const data = await client.execute(
		`query ($limit: Int!, $page: Int!) {
			boards(limit: $limit, page: $page, order_by: used_at, state: active) {
				id
				name
				url
				type
				workspace { name }
			}
		}`,
		0,
		{ limit: BOARDS_PAGE_SIZE, page },
	);

	const boards = (data.boards ?? []) as BoardSearchRow[];

	const results = boards.filter(isRealBoard).map((board) => ({
		name: formatBoardLabel(board),
		value: board.id,
		url: board.url,
	}));

	return {
		results,
		// A full page means there may be more boards to scan.
		paginationToken: boards.length === BOARDS_PAGE_SIZE ? String(page + 1) : undefined,
	};
}
