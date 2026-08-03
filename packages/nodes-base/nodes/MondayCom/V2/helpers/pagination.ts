import type { IDataObject } from 'n8n-workflow';

import type { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared pagination helpers implementing the n8n Return All / Limit
 * convention against monday's two pagination styles:
 *
 * - Page-based (`limit`/`page` args): boards, users, updates.
 * - Cursor-based (`items_page` → `next_items_page`): items.
 *
 * Scale rules (see roadmap item "Cursor pagination + Return All handling"):
 * - Results stream page by page — never one giant request.
 * - Complexity budget is handled by MondayGraphQLClient, which retries with
 *   monday's `retry_in_seconds` hint on ComplexityException / rate limits.
 * - Return All is hard-capped so a 1M-record account cannot melt a workflow;
 *   past the cap the caller gets the cap's worth of records.
 */
export const RETURN_ALL_HARD_CAP = 100000;

/** Default records per request. Kept well under API maximums to control
 * per-request complexity when callers select many fields. */
export const DEFAULT_PAGE_SIZE = 100;

export interface PageBasedOptions {
	client: MondayGraphQLClient;
	itemIndex: number;
	/** Query that declares `$limit: Int!` and `$page: Int!` variables. */
	query: string;
	variables?: Record<string, unknown>;
	/** Pull the array of rows out of one response payload. */
	extractRows: (data: IDataObject) => IDataObject[];
	/** Maximum records to return; undefined = Return All (hard-capped). */
	limit?: number;
	pageSize?: number;
}

/**
 * Page-based pagination (boards, users, updates). Requests `$page` starting
 * at 1 and stops when a page comes back short, the limit is reached, or the
 * hard cap is hit.
 */
export async function fetchAllPaged(options: PageBasedOptions): Promise<IDataObject[]> {
	const { client, itemIndex, query, variables, extractRows } = options;
	const max = Math.min(options.limit ?? RETURN_ALL_HARD_CAP, RETURN_ALL_HARD_CAP);
	const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, max);

	const rows: IDataObject[] = [];
	let page = 1;

	while (rows.length < max) {
		const data = await client.execute(query, itemIndex, {
			...variables,
			limit: pageSize,
			page,
		});
		const pageRows = extractRows(data);
		rows.push(...pageRows);

		// A short page means the collection is exhausted.
		if (pageRows.length < pageSize) break;
		page += 1;
	}

	return rows.slice(0, max);
}

export interface CursorPage {
	cursor: string | null;
	items: IDataObject[];
}

export interface CursorPageResult {
	rows: IDataObject[];
	/**
	 * Cursor for the next unfetched item, or null when the collection is
	 * exhausted. Valid for 60 minutes; feed it back via `startCursor` to
	 * resume exactly where this run stopped.
	 */
	nextCursor: string | null;
}

export interface CursorBasedOptions {
	client: MondayGraphQLClient;
	itemIndex: number;
	/** Query for the first page. Must declare a `$limit: Int!` variable. */
	firstQuery: string;
	firstVariables?: Record<string, unknown>;
	/** Pull `{ cursor, items }` out of the first page's response payload. */
	extractFirstPage: (data: IDataObject) => CursorPage | undefined;
	/**
	 * GraphQL selection set for each item in follow-up `next_items_page`
	 * requests. Must match the fields selected in `firstQuery`.
	 */
	itemFields: string;
	/** Maximum records to return (hard-capped). */
	limit?: number;
	pageSize?: number;
	/** Resume from a previous run's nextCursor instead of the first query. */
	startCursor?: string;
}

/**
 * Cursor-based pagination for items: first page via the caller's query
 * (`items_page` under a board), follow-up pages via the top-level
 * `next_items_page` until the cursor is exhausted or the limit is reached.
 * Each request asks for exactly the remaining record budget, so the
 * returned nextCursor always points at the first unfetched item — safe to
 * resume from in a later run.
 */
export async function fetchAllByCursor(options: CursorBasedOptions): Promise<CursorPageResult> {
	const { client, itemIndex, firstQuery, firstVariables, extractFirstPage, itemFields } = options;
	const max = Math.min(options.limit ?? RETURN_ALL_HARD_CAP, RETURN_ALL_HARD_CAP);
	const basePageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

	let rows: IDataObject[] = [];
	let cursor: string | null;

	if (options.startCursor) {
		cursor = options.startCursor;
	} else {
		const firstData = await client.execute(firstQuery, itemIndex, {
			...firstVariables,
			limit: Math.min(basePageSize, max),
		});
		const firstPage = extractFirstPage(firstData);
		if (!firstPage) return { rows: [], nextCursor: null };
		rows = [...firstPage.items];
		cursor = firstPage.cursor;
	}

	while (cursor && rows.length < max) {
		const data = await client.execute(
			`query ($cursor: String!, $limit: Int!) {
				next_items_page(cursor: $cursor, limit: $limit) {
					cursor
					items { ${itemFields} }
				}
			}`,
			itemIndex,
			{ cursor, limit: Math.min(basePageSize, max - rows.length) },
		);
		const nextPage = data.next_items_page as unknown as CursorPage | undefined;
		if (!nextPage) break;

		rows.push(...nextPage.items);
		cursor = nextPage.cursor;
	}

	return { rows: rows.slice(0, max), nextCursor: cursor ?? null };
}
