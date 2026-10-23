import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

/**
 * Board: Aggregate Item Data — server-side aggregation via the `aggregate`
 * GraphQL query. The board's items are counted / summed / averaged on
 * monday's side; the items themselves are never fetched.
 *
 * API quirks this module hides from the user (all verified live 2026-07-15):
 * - group_by.column_id references the SELECT ALIAS, not the raw column ID.
 * - Grouping a status/dropdown column directly returns the label's HEX color;
 *   wrapping the column in the LABEL transform returns the label text, with
 *   "" for items that have no label.
 * - Date values (group keys and MIN/MAX results) come back as epoch
 *   milliseconds.
 * - An aggregation over zero rows returns { value: null } — the union flips
 *   from AggregateBasicAggregationResult to AggregateGroupByResult.
 */

/** UI → API mapping for the calculation functions the operation exposes. */
const CALCULATION_FUNCTIONS: Record<string, { api: string; keyPrefix: string }> = {
	countItems: { api: 'COUNT_ITEMS', keyPrefix: 'count_items' },
	countValues: { api: 'COUNT', keyPrefix: 'count' },
	countUnique: { api: 'COUNT_DISTINCT', keyPrefix: 'count_unique' },
	sum: { api: 'SUM', keyPrefix: 'sum' },
	average: { api: 'AVERAGE', keyPrefix: 'average' },
	median: { api: 'MEDIAN', keyPrefix: 'median' },
	min: { api: 'MIN', keyPrefix: 'min' },
	max: { api: 'MAX', keyPrefix: 'max' },
};

/** Calculation dropdown for the UI (alphabetized per n8n lint). */
export const AGGREGATE_FUNCTION_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Average',
		value: 'average',
		description: 'The average of a numbers or rating column',
	},
	{
		name: 'Count Items',
		value: 'countItems',
		description: 'How many items there are',
	},
	{
		name: 'Count Unique Values',
		value: 'countUnique',
		description: 'How many different values a column has',
	},
	{
		name: 'Count Values',
		value: 'countValues',
		description: 'How many items have a value in a column',
	},
	{
		name: 'Max',
		value: 'max',
		description: 'The highest value of a numbers, rating, or date column',
	},
	{
		name: 'Median',
		value: 'median',
		description: 'The median of a numbers or rating column',
	},
	{
		name: 'Min',
		value: 'min',
		description: 'The lowest value of a numbers, rating, or date column',
	},
	{
		name: 'Sum',
		value: 'sum',
		description: 'The total of a numbers or rating column',
	},
];

/** UI → API mapping for the optional date bucketing on group-by columns. */
const DATE_GROUPING_FUNCTIONS: Record<string, string> = {
	day: 'DATE_TRUNC_DAY',
	week: 'DATE_TRUNC_WEEK',
	month: 'DATE_TRUNC_MONTH',
	quarter: 'DATE_TRUNC_QUARTER',
	year: 'DATE_TRUNC_YEAR',
};

export const AGGREGATE_DATE_GROUPING_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Individual Dates', value: 'none' },
	{ name: 'By Day', value: 'day' },
	{ name: 'By Week', value: 'week' },
	{ name: 'By Month', value: 'month' },
	{ name: 'By Quarter', value: 'quarter' },
	{ name: 'By Year', value: 'year' },
];

/** Synthetic group-by choice for the board's groups (the API accepts "group"). */
export const BOARD_GROUP_COLUMN_ID = 'group';

/** Column types whose grouped value is a label the LABEL transform resolves. */
const LABEL_GROUP_TYPES = new Set(['status', 'dropdown']);

export interface AggregateCalculationRow {
	function: string;
	columnId?: string;
	outputName?: string;
}

export interface AggregateGroupByRow {
	columnId: string;
	dateGrouping?: string;
}

export interface AggregateColumnMeta {
	id: string;
	title: string;
	type: string;
}

/** How one select element maps back to an output field when parsing results. */
interface AliasPlanEntry {
	alias: string;
	outputKey: string;
	kind: 'group' | 'calculation';
	/** Set when the value needs epoch-ms → ISO date conversion. */
	isDate?: boolean;
	/** Set when "" means "no label" and should become null. */
	isLabel?: boolean;
}

export interface AggregateQueryPlan {
	/** The AggregateQueryInput variable value. */
	queryInput: IDataObject;
	/** One entry per select element, keyed by alias, for result parsing. */
	aliases: AliasPlanEntry[];
}

/** Turns a column title into a friendly snake_case output key. */
export function toOutputKey(title: string): string {
	const key = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return key || 'column';
}

/** Appends _2, _3, … when two elements would produce the same output key. */
function uniqueKey(key: string, used: Set<string>): string {
	let candidate = key;
	for (let suffix = 2; used.has(candidate); suffix++) {
		candidate = `${key}_${suffix}`;
	}
	used.add(candidate);
	return candidate;
}

export class AggregateInputError extends Error {}

/**
 * Compiles the node's Calculations / Group By rows into the
 * AggregateQueryInput the API expects, plus the alias plan needed to turn
 * the response back into friendly output rows.
 */
export function buildAggregateQueryPlan(params: {
	boardId: string;
	calculations: AggregateCalculationRow[];
	groupBys: AggregateGroupByRow[];
	columns: AggregateColumnMeta[];
	/** Pre-built items_page-style rules (from buildFilterRules). */
	filterRules?: IDataObject[];
	filtersMatch?: string;
	limit?: number;
}): AggregateQueryPlan {
	const columnsById = new Map(params.columns.map((column) => [column.id, column]));
	const select: IDataObject[] = [];
	const groupBy: IDataObject[] = [];
	const aliases: AliasPlanEntry[] = [];
	const usedKeys = new Set<string>();

	const columnElement = (columnId: string, alias: string): IDataObject => ({
		type: 'COLUMN',
		column: { column_id: columnId },
		as: alias,
	});

	params.groupBys.forEach((row, index) => {
		if (!row.columnId) return;
		const alias = `g${index}`;
		const column = columnsById.get(row.columnId);
		const isBoardGroup = row.columnId === BOARD_GROUP_COLUMN_ID;
		const title = isBoardGroup ? 'Board Group' : (column?.title ?? row.columnId);
		const isLabel = column !== undefined && LABEL_GROUP_TYPES.has(column.type);
		const isDate = column?.type === 'date';
		const dateFunction =
			isDate && row.dateGrouping ? DATE_GROUPING_FUNCTIONS[row.dateGrouping] : undefined;

		if (isLabel) {
			// LABEL returns the label text; the raw grouped value is the hex color.
			select.push({
				type: 'FUNCTION',
				function: { function: 'LABEL', params: [columnElement(row.columnId, `${alias}_src`)] },
				as: alias,
			});
		} else if (dateFunction) {
			select.push({
				type: 'FUNCTION',
				function: { function: dateFunction, params: [columnElement(row.columnId, `${alias}_src`)] },
				as: alias,
			});
		} else {
			select.push(columnElement(row.columnId, alias));
		}

		// The group_by column_id must be the select element's alias.
		groupBy.push({ column_id: alias });
		aliases.push({
			alias,
			outputKey: uniqueKey(toOutputKey(title), usedKeys),
			kind: 'group',
			isDate,
			isLabel,
		});
	});

	const calculationRows = params.calculations.filter((row) => row.function);
	if (calculationRows.length === 0) {
		throw new AggregateInputError(
			'Add at least one calculation (e.g. Count Items) to aggregate the board',
		);
	}

	calculationRows.forEach((row, index) => {
		const mapping = CALCULATION_FUNCTIONS[row.function];
		if (!mapping) {
			throw new AggregateInputError(`Unknown calculation function "${row.function}"`);
		}
		const alias = `c${index}`;
		const needsColumn = row.function !== 'countItems';
		if (needsColumn && !row.columnId) {
			throw new AggregateInputError(
				`Calculation ${index + 1} (${row.function}) needs a column to work on`,
			);
		}

		const column = row.columnId ? columnsById.get(row.columnId) : undefined;
		const defaultKey = needsColumn
			? `${mapping.keyPrefix}_${toOutputKey(column?.title ?? String(row.columnId))}`
			: mapping.keyPrefix;

		select.push({
			type: 'FUNCTION',
			function: {
				function: mapping.api,
				...(needsColumn ? { params: [columnElement(row.columnId as string, `${alias}_src`)] } : {}),
			},
			as: alias,
		});
		aliases.push({
			alias,
			outputKey: uniqueKey(row.outputName?.trim() || defaultKey, usedKeys),
			kind: 'calculation',
			// MIN/MAX on a date column return epoch milliseconds.
			isDate: (row.function === 'min' || row.function === 'max') && column?.type === 'date',
		});
	});

	const queryInput: IDataObject = {
		from: { type: 'TABLE', id: params.boardId },
		select,
	};
	if (groupBy.length > 0) {
		queryInput.group_by = groupBy;
	}
	if (params.filterRules && params.filterRules.length > 0) {
		queryInput.query = {
			rules: params.filterRules,
			operator: params.filtersMatch ?? 'and',
		};
	}
	if (params.limit !== undefined) {
		queryInput.limit = params.limit;
	}

	return { queryInput, aliases };
}

/** The response shape of the aggregate query. */
export interface AggregateApiResponse {
	aggregate?: {
		results?: Array<{
			entries?: Array<{
				alias?: string;
				value?: { result?: number | null; value?: unknown } | null;
			}>;
		}>;
	};
}

/** Epoch milliseconds → "YYYY-MM-DD" (or full ISO when a time is present). */
function epochToDateString(ms: number): string {
	const iso = new Date(ms).toISOString();
	return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}

/**
 * Turns the API's alias/union-value entries into one flat, friendly object
 * per result row, keyed by the plan's output keys.
 */
export function parseAggregateResults(
	response: AggregateApiResponse,
	aliases: AliasPlanEntry[],
): IDataObject[] {
	const planByAlias = new Map(aliases.map((entry) => [entry.alias, entry]));
	const results = response.aggregate?.results ?? [];

	return results.map((resultSet) => {
		const row: IDataObject = {};
		// Seed in plan order so output keys keep the UI's ordering.
		for (const entry of aliases) {
			row[entry.outputKey] = null;
		}
		for (const entry of resultSet.entries ?? []) {
			const plan = entry.alias ? planByAlias.get(entry.alias) : undefined;
			if (!plan) continue;

			// The union carries either { result: Float } or { value: JSON }.
			const raw = entry.value?.result !== undefined ? entry.value.result : entry.value?.value;
			let value = raw === undefined ? null : (raw as IDataObject[keyof IDataObject]);

			if (plan.isLabel && value === '') {
				// LABEL returns "" for items with no label set.
				value = null;
			}
			if (plan.isDate && typeof value === 'number') {
				value = epochToDateString(value);
			}
			row[plan.outputKey] = value;
		}
		return row;
	});
}
