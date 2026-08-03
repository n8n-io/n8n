import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { BULK_IMPORT_MATCH_COLUMN_TYPES } from './bulkImport';
import { getOperatorOptionsForColumnType, isUnfilterableColumnType } from './itemFilters';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

interface ColumnRow {
	id: string;
	title: string;
	type: string;
	capabilities?: { calculated?: { function?: string } | null } | null;
}

async function fetchBoardColumnRows(
	context: ILoadOptionsFunctions,
	boardParameter = 'boardId',
): Promise<ColumnRow[]> {
	const boardId = context.getCurrentNodeParameter(boardParameter, { extractValue: true }) as string;
	if (!boardId) {
		return [];
	}

	const client = new MondayGraphQLClient(context);
	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids) {
				columns { id title type capabilities { calculated { function } } }
			}
		}`,
		0,
		{ ids: [boardId] },
	);

	const boards = (data.boards ?? []) as Array<{ columns?: ColumnRow[] }>;
	return boards[0]?.columns ?? [];
}

function toOptions(columns: ColumnRow[]): INodePropertyOptions[] {
	return columns.map((column) => ({
		name: `${column.title} (${column.type})`,
		value: column.id,
	}));
}

/**
 * loadOptions method for column multi-selects, dependent on the node's
 * `boardId` parameter. Columns are a bounded collection, loaded in one call.
 */
export async function getBoardColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(await fetchBoardColumnRows(this));
}

/**
 * Same as getBoardColumns but reads the `targetBoardId` parameter — for the
 * Item: Move cross-board column mapper, where the target column picker must
 * list the destination board's columns.
 */
export async function getTargetBoardColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(await fetchBoardColumnRows(this, 'targetBoardId'));
}

/**
 * Column types that cannot be cleared via change_multiple_column_values.
 * Almost the same as READ_ONLY_COLUMN_TYPES in columnValueMappers, with two
 * differences: `file` IS clearable (null empties a populated file column —
 * verified live 2026-07-15), and `name` can never be cleared (an item always
 * has a name).
 */
export const NON_CLEARABLE_COLUMN_TYPES = new Set([
	'auto_number',
	'button',
	'creation_log',
	'formula',
	'item_id',
	'last_updated',
	'lookup',
	'mirror',
	'name',
	'progress',
	'subtasks',
	'time_tracking',
	'vote',
]);

/** Only the columns whose values can be cleared — for Item: Clear Column Values. */
export async function getClearableBoardColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(
		(await fetchBoardColumnRows(this)).filter(
			(column) => !NON_CLEARABLE_COLUMN_TYPES.has(column.type),
		),
	);
}

/**
 * Columns usable in filter rules (Item: Get Many, Board: Aggregate).
 * Excluded: status columns with rollup capability (multi-level boards) —
 * their BatteryValue cells return silently wrong filter results (verified
 * live) — and column types no filter operator works on at all (formula,
 * mirror, auto_number: the API rejects or never matches them). The
 * execute-time guard covers expression-mode IDs that bypass this picker.
 */
export async function getFilterableBoardColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(
		(await fetchBoardColumnRows(this)).filter(
			(column) =>
				!(column.type === 'status' && column.capabilities?.calculated) &&
				!isUnfilterableColumnType(column.type),
		),
	);
}

/**
 * Operator options for one filter rule row, narrowed to what the column
 * picked in the SAME row supports ('&columnId' = sibling parameter within
 * the fixedCollection row). Until a column is picked — or when the column
 * type is unknown (expression-mode ID, new API types) — the full operator
 * list is returned; the execute-time guard covers those paths.
 */
export async function getFilterOperators(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let columnId: string | undefined;
	try {
		columnId = this.getCurrentNodeParameter('&columnId') as string;
	} catch {
		columnId = undefined;
	}
	if (!columnId) {
		return getOperatorOptionsForColumnType(undefined);
	}
	const columns = await fetchBoardColumnRows(this);
	const column = columns.find((candidate) => candidate.id === columnId);
	return getOperatorOptionsForColumnType(column?.type);
}

/** Column types Sum / Average / Median can work on. */
const NUMERIC_AGGREGATE_TYPES = new Set(['numbers', 'rating']);

/** Column types Min / Max can work on (numeric plus dates). */
const MIN_MAX_AGGREGATE_TYPES = new Set(['numbers', 'rating', 'date']);

/**
 * Column types that make no sense as an aggregation group-by key
 * (binary/structural content rather than a comparable value).
 */
const NON_GROUPABLE_COLUMN_TYPES = new Set(['button', 'doc', 'file', 'subtasks']);

/** Numbers-like columns — for the Sum / Average / Median calculations. */
export async function getAggregateNumericColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(
		(await fetchBoardColumnRows(this)).filter((column) => NUMERIC_AGGREGATE_TYPES.has(column.type)),
	);
}

/** Numbers-like and date columns — for the Min / Max calculations. */
export async function getAggregateMinMaxColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(
		(await fetchBoardColumnRows(this)).filter((column) => MIN_MAX_AGGREGATE_TYPES.has(column.type)),
	);
}

/**
 * Group-by choices for Board: Aggregate Item Data — the board's groups
 * (synthetic "group" ID, accepted by the aggregate API) plus every groupable
 * column.
 */
export async function getAggregateGroupByColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columns = (await fetchBoardColumnRows(this)).filter(
		(column) => !NON_GROUPABLE_COLUMN_TYPES.has(column.type),
	);
	return [{ name: 'Board Group', value: 'group' }, ...toOptions(columns)];
}

/**
 * Columns on_match can match against — for Item: Bulk Import's Upsert/Skip
 * modes. Only the types monday's matcher supports (incl. the name column).
 */
export async function getBulkImportMatchColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions(
		(await fetchBoardColumnRows(this)).filter((column) =>
			BULK_IMPORT_MATCH_COLUMN_TYPES.has(column.type),
		),
	);
}

/** Same as getBoardColumns, but only file columns — for File: Add to File Column. */
export async function getBoardFileColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions((await fetchBoardColumnRows(this)).filter((column) => column.type === 'file'));
}

/** Doc columns of the selected board — for Doc: Create in a board item. */
export async function getBoardDocColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return toOptions((await fetchBoardColumnRows(this)).filter((column) => column.type === 'doc'));
}

/**
 * Columns of the kind picked in the `labelColumnKind` parameter (status or
 * dropdown) — for the Add Label / Update Label operations.
 */
export async function getBoardLabelColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const kind = (this.getCurrentNodeParameter('labelColumnKind') as string) || 'status';
	return toOptions((await fetchBoardColumnRows(this)).filter((column) => column.type === kind));
}

/**
 * The labels of the status/dropdown column picked in `labelColumnId`, read
 * from the column's typed `settings` field (which includes label ids).
 * Option value = the label id, which is what the update mutations key on.
 */
export async function getColumnLabels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	const columnId = this.getCurrentNodeParameter('labelColumnId') as string;
	if (!boardId || !columnId) {
		return [];
	}

	const client = new MondayGraphQLClient(this);
	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids) {
				columns { id settings }
			}
		}`,
		0,
		{ ids: [boardId] },
	);

	const boards = (data.boards ?? []) as Array<{
		columns?: Array<{ id: string; settings?: { labels?: Array<Record<string, unknown>> } }>;
	}>;
	const column = boards[0]?.columns?.find((candidate) => candidate.id === columnId);
	return (column?.settings?.labels ?? [])
		.filter((label) => label.id !== undefined && label.id !== null)
		.map((label) => ({
			name: `${label.label as string}${label.is_deactivated ? ' (deactivated)' : ''}`,
			value: String(label.id),
		}));
}

/** Sentinel value for the "every file in the column" choice in getItemColumnFiles. */
export const ALL_COLUMN_FILES = '__all__';

interface AssetOptionRow {
	id: string;
	name: string;
	file_size?: number;
	created_at?: string;
}

/**
 * loadOptions for File: Download (By File Column mode) — the files currently
 * in the selected item's file column. Bounded: one item × one column
 * (typically a handful of files). Depends on boardId, itemId and
 * fileColumnId; returns empty without an API call until all are picked.
 */
export async function getItemColumnFiles(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const itemId = this.getCurrentNodeParameter('itemId', { extractValue: true }) as string;
	const columnId = this.getCurrentNodeParameter('fileColumnId') as string;
	if (!itemId || !columnId) {
		return [];
	}

	const client = new MondayGraphQLClient(this);
	const data = await client.execute(
		`query ($ids: [ID!], $columnIds: [String]) {
			items(ids: $ids) {
				assets(assets_source: columns, column_ids: $columnIds) {
					id
					name
					file_size
					created_at
				}
			}
		}`,
		0,
		{ ids: [itemId], columnIds: [columnId] },
	);

	const items = (data.items ?? []) as Array<{ assets?: AssetOptionRow[] }>;
	const assets = items[0]?.assets ?? [];

	return [
		{ name: 'All Files in Column', value: ALL_COLUMN_FILES },
		// Same file name can appear multiple times — the upload date disambiguates.
		...assets.map((asset) => ({
			name: asset.created_at ? `${asset.name} (${asset.created_at.slice(0, 10)})` : asset.name,
			value: asset.id,
		})),
	];
}

const ITEM_UPDATES_WINDOW = 50;

interface UpdateOptionRow {
	id: string;
	text_body?: string | null;
	created_at?: string;
	creator?: { name?: string } | null;
}

/**
 * loadOptions for update pickers (e.g. Notification: Create with an update
 * target) — the newest 50 updates of the selected item, labeled with a text
 * snippet, creator and date. Bounded to one item; returns empty without an
 * API call until an item is picked.
 */
export async function getItemUpdatesList(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const itemId = this.getCurrentNodeParameter('itemId', { extractValue: true }) as string;
	if (!itemId) {
		return [];
	}

	const client = new MondayGraphQLClient(this);
	const data = await client.execute(
		`query ($ids: [ID!], $limit: Int!) {
			items(ids: $ids) {
				updates(limit: $limit) {
					id
					text_body
					created_at
					creator { name }
				}
			}
		}`,
		0,
		{ ids: [itemId], limit: ITEM_UPDATES_WINDOW },
	);

	const items = (data.items ?? []) as Array<{ updates?: UpdateOptionRow[] }>;
	return (items[0]?.updates ?? []).map((update) => {
		const snippet = (update.text_body ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) || '(empty)';
		const meta = [update.creator?.name, update.created_at?.slice(0, 10)]
			.filter(Boolean)
			.join(' · ');
		return { name: meta ? `${snippet} (${meta})` : snippet, value: update.id };
	});
}
