import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

/**
 * Cross-entity account search (the `search` root query, API 2026-07+;
 * updates need 2026-10+ — covered by the node's pin).
 *
 * The query returns a SearchNamespace with one field per entity type, so a
 * single request can search every selected type at once. Facts verified live
 * (2026-07-19) that shape this module:
 * - `limit` is hard-capped at 20 per entity type, default 10, and there is
 *   NO pagination — results come back relevance-ordered, top-N only.
 * - Each result = { id, indexed_data, live_data }: indexed_data is the fast
 *   (possibly stale) search-index snapshot; live_data resolves the full
 *   entity from the core API and is null when the entity was deleted, is
 *   inaccessible, or the index lags — so live_data is opt-in here.
 * - GraphQL rejects declared-but-unused variables, so the variable
 *   definitions are built from the entity/filter combination actually used.
 * - Filter args differ per entity (introspected; the docs are incomplete):
 *   items/boards take board_ids+workspace_ids, updates board_ids+creator_ids.
 *
 * The namespace also searches docs, users, workspaces and timeline items;
 * those come in with the resources that need them.
 */

/** The API's hard cap on results per entity type (no pagination exists). */
export const SEARCH_MAX_LIMIT = 20;

/** The API's default per-entity limit. */
export const SEARCH_DEFAULT_LIMIT = 10;

/**
 * Operation value → SearchNamespace entity field. One node operation per
 * searchable entity type (product decision 2026-07-19 — each operation
 * shows only the filters its API field accepts).
 */
export const SEARCH_OPERATION_ENTITY: Record<string, string> = {
	searchBoardsAccount: 'boards',
	searchItemsAccount: 'items',
	searchUpdatesAccount: 'updates',
};

/** All Search operation values — for shared displayOptions in the node. */
export const SEARCH_OPERATION_VALUES = Object.keys(SEARCH_OPERATION_ENTITY);

/** SearchStrategy enum (introspected live). */
export const SEARCH_STRATEGY_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Balanced',
		value: 'BALANCED',
		description: 'Default trade-off between result quality and response time',
	},
	{ name: 'Quality', value: 'QUALITY', description: 'Best results, slower response' },
	{ name: 'Speed', value: 'SPEED', description: 'Fastest response, simpler matching' },
];

/** indexed_data field selection per entity (introspected — full field sets). */
const INDEXED_FIELDS: Record<string, string> = {
	items: 'id name url board_id workspace_id',
	boards: 'id name description url workspace_id creator_id',
	updates: 'id body creator_id item_id board_id created_at updated_at',
};

/**
 * Bounded live_data selections — never unbounded connections (live_data is
 * the full core-API entity; an item's column_values or a board's items would
 * blow the complexity budget). All verified live.
 */
const LIVE_FIELDS: Record<string, string> = {
	items: 'id name state url created_at updated_at board { id name } group { id title }',
	boards: 'id name state board_kind type url items_count workspace { id name }',
	updates: 'id body text_body created_at updated_at creator { id name } item_id',
};

/** Singular entityType tag emitted on each output row, per namespace field. */
const ENTITY_TYPE_TAG: Record<string, string> = {
	items: 'item',
	boards: 'board',
	updates: 'update',
};

/** Which optional filter args each entity field accepts (introspected). */
const ENTITY_FILTER_ARGS: Record<string, string[]> = {
	items: ['board_ids', 'workspace_ids'],
	boards: ['board_ids', 'workspace_ids'],
	updates: ['board_ids', 'creator_ids'],
};

/** Maps a filter arg name to its GraphQL variable name and type. */
const FILTER_VARIABLES: Record<string, { variable: string; type: string }> = {
	board_ids: { variable: 'boardIds', type: '[ID!]' },
	workspace_ids: { variable: 'workspaceIds', type: '[ID!]' },
	creator_ids: { variable: 'creatorIds', type: '[ID!]' },
};

export interface AccountSearchFilters {
	boardIds?: string[];
	workspaceIds?: string[];
	creatorIds?: string[];
	/** ISO8601 timestamps for CrossEntityDateRangeInput. */
	createdAfter?: string;
	createdBefore?: string;
	updatedAfter?: string;
	updatedBefore?: string;
}

export interface AccountSearchPlan {
	query: string;
	variables: IDataObject;
}

/**
 * Builds the single search request covering all selected entity types.
 * Only entities the caller selected appear in the document, and only
 * variables that are actually referenced get declared (GraphQL rejects
 * unused variable definitions). Filters ride only on the entities whose
 * field accepts them — e.g. a workspace filter is silently inapplicable to
 * update search because the API offers no such argument there.
 */
export function buildAccountSearchPlan(
	searchText: string,
	entities: string[],
	includeLiveData: boolean,
	limit: number,
	strategy?: string,
	filters: AccountSearchFilters = {},
): AccountSearchPlan {
	const selected = entities.filter((entity) => INDEXED_FIELDS[entity] !== undefined);

	const variables: IDataObject = {
		q: searchText,
		limit: Math.max(1, Math.min(limit, SEARCH_MAX_LIMIT)),
	};

	const varDefs = ['$q: String!', '$limit: Int'];

	if (strategy) {
		variables.strategy = strategy;
		varDefs.push('$strategy: SearchStrategy');
	}

	const dateRange: IDataObject = {};
	if (filters.createdAfter) dateRange.created_after = filters.createdAfter;
	if (filters.createdBefore) dateRange.created_before = filters.createdBefore;
	if (filters.updatedAfter) dateRange.updated_after = filters.updatedAfter;
	if (filters.updatedBefore) dateRange.updated_before = filters.updatedBefore;
	if (Object.keys(dateRange).length > 0) {
		variables.dateRange = dateRange;
		varDefs.push('$dateRange: CrossEntityDateRangeInput');
	}

	const filterValues: Record<string, unknown> = {
		board_ids: filters.boardIds?.length ? filters.boardIds : undefined,
		workspace_ids: filters.workspaceIds?.length ? filters.workspaceIds : undefined,
		creator_ids: filters.creatorIds?.length ? filters.creatorIds : undefined,
	};

	const declaredFilterVars = new Set<string>();
	const fields = selected.map((entity) => {
		const args = ['query: $q', 'limit: $limit'];
		if (strategy) args.push('strategy: $strategy');
		if (variables.dateRange) args.push('date_range: $dateRange');

		for (const argName of ENTITY_FILTER_ARGS[entity]) {
			if (filterValues[argName] === undefined) continue;
			const { variable, type } = FILTER_VARIABLES[argName];
			args.push(`${argName}: $${variable}`);
			if (!declaredFilterVars.has(variable)) {
				declaredFilterVars.add(variable);
				varDefs.push(`$${variable}: ${type}`);
				variables[variable] = filterValues[argName] as IDataObject[keyof IDataObject];
			}
		}

		const liveSelection = includeLiveData ? ` live_data { ${LIVE_FIELDS[entity]} }` : '';
		return `${entity}(${args.join(', ')}) { results { id indexed_data { ${INDEXED_FIELDS[entity]} }${liveSelection} } }`;
	});

	return {
		query: `query (${varDefs.join(', ')}) { search { ${fields.join(' ')} } }`,
		variables,
	};
}

interface RawSearchResult {
	id: string;
	indexed_data?: IDataObject | null;
	live_data?: IDataObject | null;
}

/**
 * Flattens the SearchNamespace response into one output row per result:
 * entityType tag + the indexed fields at the top level (+ liveData object
 * when requested — null there means deleted/inaccessible/index-lag, which
 * is API behavior worth surfacing rather than dropping the row).
 */
export function flattenSearchResults(
	searchData: IDataObject | undefined,
	entities: string[],
	includeLiveData: boolean,
): IDataObject[] {
	const rows: IDataObject[] = [];
	for (const entity of entities) {
		const container = searchData?.[entity] as { results?: RawSearchResult[] } | undefined;
		for (const result of container?.results ?? []) {
			const row: IDataObject = {
				entityType: ENTITY_TYPE_TAG[entity] ?? entity,
				id: result.id,
				...(result.indexed_data ?? {}),
			};
			if (includeLiveData) {
				row.liveData = result.live_data ?? null;
			}
			rows.push(row);
		}
	}
	return rows;
}
