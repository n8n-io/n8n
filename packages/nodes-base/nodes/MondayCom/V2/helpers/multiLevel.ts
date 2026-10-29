import type { IDataObject } from 'n8n-workflow';

import type { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared multi-level board support (hierarchy_type: multi_level — Portfolio
 * Project boards with up to five subitem levels). Key API facts, all
 * verified live on the pinned version:
 *
 * - All items and subitems share ONE board (and one column schema); the
 *   main board ID is used for every mutation at any depth.
 * - Rollup-capable column values are OMITTED from column_values unless the
 *   query passes `capabilities: [CALCULATED]` (harmless on classic boards).
 * - Status columns with rollup resolve to BatteryValue, not StatusValue,
 *   on every item — including leaves.
 * - `hierarchy_scope_config: "allItems"` on items_page returns the whole
 *   hierarchy flat, but silently ignores order_by, and returns NOTHING when
 *   no query_params rules are set (API bug) — callers must inject a
 *   tautological all-groups rule.
 */
export type BoardHierarchyType = 'classic' | 'multi_level';

/**
 * A board's hierarchy_type never changes (there is no classic ⇄ multi-level
 * conversion), so results are cached per client instance — one instance per
 * node execution, so the cache cannot outlive a run.
 */
const hierarchyCache = new WeakMap<MondayGraphQLClient, Map<string, BoardHierarchyType>>();

/** Resolves a board's hierarchy type with one bounded query (cached per execution). */
export async function getBoardHierarchyType(
	client: MondayGraphQLClient,
	itemIndex: number,
	boardId: string,
): Promise<BoardHierarchyType> {
	let cache = hierarchyCache.get(client);
	if (!cache) {
		cache = new Map();
		hierarchyCache.set(client, cache);
	}
	const cached = cache.get(boardId);
	if (cached) return cached;

	const data = await client.execute(
		'query ($ids: [ID!]) { boards(ids: $ids) { id hierarchy_type } }',
		itemIndex,
		{ ids: [boardId] },
	);
	const boards = (data.boards ?? []) as Array<{ hierarchy_type?: string | null }>;
	const hierarchyType: BoardHierarchyType =
		boards[0]?.hierarchy_type === 'multi_level' ? 'multi_level' : 'classic';
	cache.set(boardId, hierarchyType);
	return hierarchyType;
}

/**
 * Arguments every item column_values read should pass: without CALCULATED,
 * rollup-capable columns are silently absent from the response on
 * multi-level boards (verified live — not even empty entries). On classic
 * boards the argument changes nothing.
 */
export const COLUMN_VALUES_CALCULATED_ARG = 'capabilities: [CALCULATED]';

/**
 * Fragment for status rollup values, which resolve to BatteryValue instead
 * of StatusValue on multi-level boards (on ALL items, including leaves).
 * `is_leaf: false` marks a calculated rollup; `true` marks a static value.
 * Never matches on classic boards, so it's safe to request everywhere.
 */
export const BATTERY_VALUE_FRAGMENT = '... on BatteryValue { battery_value { key count } is_leaf }';

/**
 * Fragments for the linked-item column value types whose `text` and `value`
 * are ALWAYS null in the API (verified live on 2026-07): dependency,
 * board_relation (connect boards) and mirror. `display_value` carries the
 * comma-separated linked item names, `linked_item_ids` the IDs. Both are
 * scalar fields — cheap enough to request on every item read, including
 * Get Many at high limits. Full `linked_items` objects are deliberately NOT
 * here (per-row complexity); Item: Get Column Value requests them via
 * LINKED_VALUE_DETAIL_FRAGMENTS instead.
 */
export const LINKED_VALUE_FRAGMENTS =
	'... on DependencyValue { display_value linked_item_ids } ' +
	'... on BoardRelationValue { display_value linked_item_ids } ' +
	'... on MirrorValue { display_value }';

/**
 * The rich variant for single-column reads (Item: Get Column Value — one
 * item, one column, bounded): adds the linked items' names and, for
 * dependency columns, the per-link metadata. `dependency_links` IS exposed
 * on the pinned 2026-07 schema (dependency_type 0=FS/1=SS/2=FF/3=SF, lag in
 * days — null for plain links); the public doc's "not exposed by the API"
 * callout is stale.
 */
export const LINKED_VALUE_DETAIL_FRAGMENTS =
	'... on DependencyValue { display_value linked_item_ids linked_items { id name } dependency_links { linked_item_id dependency_type lag } } ' +
	'... on BoardRelationValue { display_value linked_item_ids linked_items { id name } } ' +
	'... on MirrorValue { display_value }';

export interface BatteryEntry {
	key?: string | number;
	count?: number;
}

/**
 * Builds a status label index → text map from a status column's
 * settings_str ({"labels": {"0": "Done", ...}}).
 */
function parseLabelTextByIndex(settingsStr?: string): Record<string, string> {
	if (!settingsStr) return {};
	try {
		const settings = JSON.parse(settingsStr) as { labels?: Record<string, string> };
		const labels = settings.labels;
		if (labels && typeof labels === 'object' && !Array.isArray(labels)) {
			return Object.fromEntries(
				Object.entries(labels).filter(([, text]) => typeof text === 'string' && text !== ''),
			);
		}
	} catch {
		// Malformed settings — fall back to raw label keys.
	}
	return {};
}

/**
 * Formats a BatteryValue for flattened output: "Done: 2, Working on it: 1".
 * Label keys are indexes into the column's status labels; unknown keys stay
 * as "label <key>" so nothing is silently dropped.
 */
export function formatBatteryText(
	entries: BatteryEntry[] | null | undefined,
	settingsStr?: string,
): string | null {
	if (!entries || entries.length === 0) return null;
	const labelByIndex = parseLabelTextByIndex(settingsStr);
	return entries
		.map((entry) => {
			const key = String(entry.key ?? '');
			const label = labelByIndex[key] ?? `label ${key}`;
			return `${label}: ${entry.count ?? 0}`;
		})
		.join(', ');
}

/**
 * Tautological items_page rule matching every group — the verified
 * workaround for the API bug where `hierarchy_scope_config: "allItems"`
 * returns an empty page when no query_params rules are set at all.
 */
export function buildAllGroupsRule(groupIds: string[]): IDataObject {
	return { column_id: 'group', compare_value: groupIds, operator: 'any_of' };
}

/** Fetches the board's group IDs (bounded — one call) for buildAllGroupsRule. */
export async function fetchBoardGroupIds(
	client: MondayGraphQLClient,
	itemIndex: number,
	boardId: string,
): Promise<string[]> {
	const data = await client.execute(
		'query ($ids: [ID!]) { boards(ids: $ids) { groups { id } } }',
		itemIndex,
		{ ids: [boardId] },
	);
	const boards = (data.boards ?? []) as Array<{ groups?: Array<{ id: string }> }>;
	return (boards[0]?.groups ?? []).map((group) => group.id);
}

/** Rollup functions each column type supports (CalculatedFunction enum). */
export const ROLLUP_FUNCTIONS_BY_COLUMN_TYPE: Record<string, readonly string[]> = {
	numbers: ['SUM', 'MIN', 'MAX', 'NONE'],
	date: ['MIN', 'MAX', 'NONE'],
	timeline: ['MIN_MAX', 'NONE'],
	status: ['COUNT_KEYS', 'NONE'],
};

/**
 * Validates a picked rollup function against the column type. Returns an
 * error message, or null when the combination is valid.
 */
export function validateRollupFunction(columnType: string, rollupFunction: string): string | null {
	const allowed = ROLLUP_FUNCTIONS_BY_COLUMN_TYPE[columnType];
	if (!allowed) {
		return `Rollup is not supported on ${columnType} columns — only numbers, date, timeline, and status columns can roll up child values`;
	}
	if (!allowed.includes(rollupFunction)) {
		return `Rollup function ${rollupFunction} is not supported on ${columnType} columns (supported: ${allowed.join(', ')})`;
	}
	return null;
}

/**
 * The user-facing note attached to aggregate results on multi-level boards.
 * Verified live: as soon as the query reads any column (a column-based
 * calculation or a grouping), the aggregation engine scans LEAF items only —
 * including Count Items in the same query. A pure Count Items query (no
 * column reads anywhere) counts ALL items at every depth. There is no API
 * control to change either scope.
 */
export const MULTI_LEVEL_AGGREGATE_NOTE =
	'This is a multi-level board. Calculations and groupings that read a board column cover LEAF items only (items without subitems, at any depth) — values stored on parent items are excluded, and rollup columns aggregate their leaf values. Count Items covers all items (parents and subitems) only while the query reads no board column (the item name does not count); combined with a column-based calculation or grouping it also becomes leaf-only.';
