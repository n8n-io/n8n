import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

/**
 * Server-side item filtering (items_page query_params rules) — the scalable
 * alternative to fetching everything and filtering in n8n.
 */

/** UI options for the rule operator, mapped 1:1 to ItemsQueryRuleOperator. */
export const FILTER_OPERATOR_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Any Of', value: 'any_of' },
	{ name: 'Between', value: 'between' },
	{ name: 'Contains Terms', value: 'contains_terms' },
	{ name: 'Contains Text', value: 'contains_text' },
	{ name: 'Ends With', value: 'ends_with' },
	{ name: 'Greater Than', value: 'greater_than' },
	{ name: 'Greater Than or Equals', value: 'greater_than_or_equals' },
	{ name: 'Is Empty', value: 'is_empty' },
	{ name: 'Is Not Empty', value: 'is_not_empty' },
	{ name: 'Lower Than', value: 'lower_than' },
	{ name: 'Lower Than or Equal', value: 'lower_than_or_equal' },
	{ name: 'Not Any Of', value: 'not_any_of' },
	{ name: 'Not Contains Text', value: 'not_contains_text' },
	{ name: 'Starts With', value: 'starts_with' },
	{ name: 'Within the Last', value: 'within_the_last' },
	{ name: 'Within the Next', value: 'within_the_next' },
];

/** The operator families the matrix below is built from. */
const EMPTY_OPS = ['is_empty', 'is_not_empty'];
const SET_OPS = ['any_of', 'not_any_of'];
const TEXT_MATCH_OPS = ['contains_text', 'not_contains_text', 'contains_terms', 'starts_with'];
const RANGE_OPS = ['greater_than', 'greater_than_or_equals', 'lower_than', 'lower_than_or_equal'];

/**
 * Which operators each column type actually supports, verified empirically
 * against the live API (2026-07 version, fixture board with every creatable
 * column type; one live query per type × operator — see the roadmap item
 * for the full evidence). The per-column docs are close but NOT
 * authoritative in either direction: some documented operators are rejected
 * or silently return wrong results live (e.g. status not_contains_text,
 * tags' [-1] blank sentinel), and some undocumented ones work (e.g.
 * starts_with on text-likes, within_the_last/next on date). Operators the
 * API accepts but that always return wrong/empty results are treated as
 * unsupported here. `ends_with` was rejected by every column type.
 *
 * Column types missing from this map (unknown/future types, plus the
 * deprecated `person` which cannot be created for verification) fall back
 * to the full operator list — better to allow than to wrongly block.
 */
export const COLUMN_TYPE_OPERATORS: Record<string, readonly string[]> = {
	name: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	text: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	long_text: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	email: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	people: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	team: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	country: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	phone: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	link: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	dropdown: [...SET_OPS, ...EMPTY_OPS, ...TEXT_MATCH_OPS],
	// status: not_contains_text and starts_with are accepted but always
	// return zero rows (verified live) — excluded.
	status: [...SET_OPS, ...EMPTY_OPS, 'contains_text', 'contains_terms'],
	world_clock: [...SET_OPS, ...EMPTY_OPS, 'contains_text', 'contains_terms'],
	color_picker: [...SET_OPS, ...EMPTY_OPS, 'contains_text', 'contains_terms'],
	// numbers: between is rejected (use the two bound operators instead);
	// contains_text/contains_terms do text matching on the number.
	numbers: [...SET_OPS, ...EMPTY_OPS, ...RANGE_OPS, 'contains_text', 'contains_terms'],
	rating: [...SET_OPS, ...EMPTY_OPS, 'contains_terms'],
	hour: [...SET_OPS, ...EMPTY_OPS, 'contains_terms'],
	item_id: [...SET_OPS, ...EMPTY_OPS, 'contains_terms'],
	vote: [...SET_OPS, ...EMPTY_OPS],
	location: [...EMPTY_OPS, 'contains_terms'],
	date: [
		...SET_OPS,
		...EMPTY_OPS,
		...RANGE_OPS,
		'between',
		'within_the_last',
		'within_the_next',
		'contains_terms',
	],
	// timeline: gt/gte/lt/lte/between DO work live but only with a
	// compare_attribute (START_DATE/END_DATE) the node doesn't send yet —
	// through this node they fail, so they're excluded here.
	timeline: [...SET_OPS, ...EMPTY_OPS],
	week: [...SET_OPS, ...EMPTY_OPS],
	// creation_log / last_updated: always populated — empty checks rejected.
	creation_log: [...SET_OPS, ...RANGE_OPS, 'between', 'within_the_last', 'within_the_next'],
	last_updated: [...SET_OPS, ...RANGE_OPS, 'between', 'within_the_last', 'within_the_next'],
	// checkbox: any_of/not_any_of are accepted but match nothing for every
	// compare_value shape (verified live) — text ops match the "v" text.
	checkbox: [...EMPTY_OPS, 'contains_text', 'contains_terms'],
	tags: [...SET_OPS, ...EMPTY_OPS, 'contains_text', 'not_contains_text', 'contains_terms'],
	board_relation: [...SET_OPS, ...EMPTY_OPS, ...RANGE_OPS, 'between', ...TEXT_MATCH_OPS],
	dependency: [...SET_OPS, ...EMPTY_OPS, ...RANGE_OPS, 'between', ...TEXT_MATCH_OPS],
	// progress: is_empty is inverted live (returns items WITH progress).
	progress: [...SET_OPS, 'is_not_empty'],
	file: [...SET_OPS, ...EMPTY_OPS],
	doc: [...SET_OPS, ...EMPTY_OPS],
	button: [...SET_OPS, ...EMPTY_OPS],
	time_tracking: [...SET_OPS, ...EMPTY_OPS],
	subtasks: [...EMPTY_OPS],
	// Rejected for every operator ("not supported yet in the API") or
	// degenerate (auto_number values are client-side only; every positive
	// match returns nothing). Excluded from the filterable-column picker.
	formula: [],
	mirror: [],
	lookup: [],
	auto_number: [],
	integration: [],
};

/** Column types that no filter operator works on at all. */
export function isUnfilterableColumnType(columnType: string): boolean {
	return COLUMN_TYPE_OPERATORS[columnType]?.length === 0;
}

/**
 * Operator options narrowed to what the given column type supports.
 * Unknown types get the full list (fallback for new column types).
 */
export function getOperatorOptionsForColumnType(
	columnType: string | undefined,
): INodePropertyOptions[] {
	const supported = columnType ? COLUMN_TYPE_OPERATORS[columnType] : undefined;
	if (!supported) return FILTER_OPERATOR_OPTIONS;
	return FILTER_OPERATOR_OPTIONS.filter((option) => supported.includes(option.value as string));
}

export interface UnsupportedOperatorRule {
	columnId: string;
	columnType: string;
	operator: string;
	supported: readonly string[];
}

/**
 * Finds filter rules whose operator the column's type does not support —
 * the execute-time counterpart of the dynamic Operator dropdown (needed
 * because n8n keeps a stale operator selection when the column changes, and
 * because expression-mode column IDs bypass the dropdown entirely).
 */
export function findUnsupportedOperatorRules(
	rules: FilterRuleInput[],
	columns: FilterColumnMeta[],
): UnsupportedOperatorRule[] {
	const columnsById = new Map(columns.map((column) => [column.id, column]));
	const offending: UnsupportedOperatorRule[] = [];
	for (const rule of rules) {
		if (!rule.columnId || !rule.operator) continue;
		const column = columnsById.get(rule.columnId);
		if (!column) continue;
		const supported = COLUMN_TYPE_OPERATORS[column.type];
		if (supported && !supported.includes(rule.operator)) {
			offending.push({
				columnId: rule.columnId,
				columnType: column.type,
				operator: rule.operator,
				supported,
			});
		}
	}
	return offending;
}

/** Friendly error text for rules using an operator the column type rejects. */
export function formatUnsupportedOperatorMessage(rules: UnsupportedOperatorRule[]): string {
	const details = rules
		.map((rule) =>
			rule.supported.length === 0
				? `column ${rule.columnId} (type: ${rule.columnType}) cannot be filtered via the monday API at all — filter the output in n8n instead`
				: `"${rule.operator}" is not supported by column ${rule.columnId} (type: ${rule.columnType}) — supported operators: ${rule.supported.join(', ')}`,
		)
		.join('; ');
	return `Invalid filter rule. ${details}. The Operator dropdown lists the supported operators once a column is selected.`;
}

/** Operators whose compare_value is a list (comma-separated in the UI). */
const MULTI_VALUE_OPERATORS = new Set(['any_of', 'not_any_of', 'between', 'contains_terms']);

/** Operators that take no value at all. */
const NO_VALUE_OPERATORS = new Set(['is_empty', 'is_not_empty']);

/** Column types whose values are matched by label index, not text. */
const LABEL_COLUMN_TYPES = new Set(['status', 'dropdown']);

/** Column types whose values are numeric. */
const NUMERIC_COLUMN_TYPES = new Set(['numbers', 'rating']);

/**
 * Column types matched by linked item ID. The API silently returns zero
 * rows for string IDs in compare_value (verified live 2026-07-17 on
 * dependency: ["123"] matches nothing, [123] matches) — numeric-looking
 * entries must be sent as numbers.
 */
const ITEM_ID_COLUMN_TYPES = new Set(['dependency', 'board_relation']);

export interface FilterRuleInput {
	columnId: string;
	operator: string;
	value?: string;
}

export interface FilterColumnMeta {
	id: string;
	type: string;
	settings_str?: string;
	/** Rollup metadata — non-null calculated marks a rollup-capable column (multi-level boards). */
	capabilities?: { calculated?: { function?: string } | null } | null;
}

/**
 * Status columns with rollup capability resolve to BatteryValue on
 * multi-level boards, and filter rules against them return silently wrong
 * results (verified live: rules matched or missed items inconsistently
 * across hierarchy scopes). Such rules are blocked with a friendly error
 * instead. Returns the offending column IDs.
 */
export function findRollupStatusRuleColumns(
	rules: FilterRuleInput[],
	columns: FilterColumnMeta[],
): string[] {
	const columnsById = new Map(columns.map((column) => [column.id, column]));
	const offending: string[] = [];
	for (const rule of rules) {
		if (!rule.columnId) continue;
		const column = columnsById.get(rule.columnId);
		if (column?.type === 'status' && column.capabilities?.calculated) {
			offending.push(rule.columnId);
		}
	}
	return [...new Set(offending)];
}

/**
 * Builds a label-text (lowercased) → index map from a status or dropdown
 * column's settings_str. Status stores labels as {"0": "Done"}; dropdown as
 * [{"id": 1, "name": "A"}].
 */
export function parseLabelIndexes(settingsStr?: string): Record<string, number> {
	if (!settingsStr) return {};
	try {
		const settings = JSON.parse(settingsStr) as {
			labels?: Record<string, string> | Array<{ id: number | string; name?: string }>;
		};
		const labels = settings.labels;
		const result: Record<string, number> = {};
		if (Array.isArray(labels)) {
			for (const label of labels) {
				if (label.name) result[label.name.toLowerCase()] = Number(label.id);
			}
		} else if (labels && typeof labels === 'object') {
			for (const [index, text] of Object.entries(labels)) {
				if (typeof text === 'string' && text !== '') result[text.toLowerCase()] = Number(index);
			}
		}
		return result;
	} catch {
		return {};
	}
}

/**
 * Converts one UI value entry for the given column. The API matches status
 * and dropdown columns by label INDEX (verified live: label text silently
 * returns nothing), so label text is resolved through the column settings.
 */
function convertEntry(entry: string, column: FilterColumnMeta | undefined): string | number {
	const isNumeric = /^-?\d+(\.\d+)?$/.test(entry);

	if (column && LABEL_COLUMN_TYPES.has(column.type)) {
		if (isNumeric) return Number(entry);
		const index = parseLabelIndexes(column.settings_str)[entry.toLowerCase()];
		return index !== undefined ? index : entry;
	}
	if (
		column &&
		(NUMERIC_COLUMN_TYPES.has(column.type) || ITEM_ID_COLUMN_TYPES.has(column.type)) &&
		isNumeric
	) {
		return Number(entry);
	}
	return entry;
}

/**
 * Turns the node's filter rows into items_page query_params rules.
 * Multi-value operators split the value on commas; empty-check operators
 * send compare_value: null.
 */
export function buildFilterRules(
	rules: FilterRuleInput[],
	columns: FilterColumnMeta[],
): IDataObject[] {
	const columnsById = new Map(columns.map((column) => [column.id, column]));

	return rules
		.filter((rule) => rule.columnId && rule.operator)
		.map((rule) => {
			const column = columnsById.get(rule.columnId);

			if (NO_VALUE_OPERATORS.has(rule.operator)) {
				// [] — not null: compare_value is a non-null CompareValue! in the
				// GraphQL schema, so null fails request validation (verified live
				// on 2026-07; the docs' "compare_value: null" examples are wrong).
				return { column_id: rule.columnId, compare_value: [], operator: rule.operator };
			}

			const rawEntries = MULTI_VALUE_OPERATORS.has(rule.operator)
				? String(rule.value ?? '')
						.split(',')
						.map((entry) => entry.trim())
						.filter((entry) => entry !== '')
				: [String(rule.value ?? '').trim()];

			return {
				column_id: rule.columnId,
				compare_value: rawEntries.map((entry) => convertEntry(entry, column)),
				operator: rule.operator,
			};
		});
}
