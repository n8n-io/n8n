import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

/**
 * Column types create_column can create. Types that require complex settings
 * (board_relation, mirror, formula) or are system-managed (auto_number,
 * creation_log, item_id, last_updated) are excluded — use the GraphQL
 * operation for those.
 */
export const CREATABLE_COLUMN_TYPES: INodePropertyOptions[] = [
	{ name: 'Checkbox', value: 'checkbox' },
	{ name: 'Color Picker', value: 'color_picker' },
	{ name: 'Country', value: 'country' },
	{ name: 'Date', value: 'date' },
	{ name: 'Dependency', value: 'dependency' },
	{ name: 'Dropdown', value: 'dropdown' },
	{ name: 'Email', value: 'email' },
	{ name: 'Files', value: 'file' },
	{ name: 'Hour', value: 'hour' },
	{ name: 'Link', value: 'link' },
	{ name: 'Location', value: 'location' },
	{ name: 'Long Text', value: 'long_text' },
	{ name: 'Numbers', value: 'numbers' },
	{ name: 'People', value: 'people' },
	{ name: 'Phone', value: 'phone' },
	{ name: 'Rating', value: 'rating' },
	{ name: 'Status', value: 'status' },
	{ name: 'Tags', value: 'tags' },
	{ name: 'Text', value: 'text' },
	{ name: 'Timeline', value: 'timeline' },
	{ name: 'Vote', value: 'vote' },
	{ name: 'Week', value: 'week' },
	{ name: 'World Clock', value: 'world_clock' },
];

/**
 * The StatusColumnColors enum of the 2026-07 schema (verified via
 * introspection). Values are the GraphQL enum names. n8n dropdowns can't
 * render color swatches, so each name carries the nearest colored-circle
 * emoji (groups the palette by hue) and the description carries the exact
 * hex, read back live from the API on 2026-07-15.
 */
export const STATUS_COLOR_OPTIONS: INodePropertyOptions[] = [
	{ name: '⚪ Explosive (Gray)', value: 'explosive', description: '#c4c4c4' },
	{ name: '⚫ American Gray', value: 'american_gray', description: '#757575' },
	{ name: '⚫ Blackish', value: 'blackish', description: '#333333' },
	{ name: '🔴 Dark Red', value: 'dark_red', description: '#bb3354' },
	{ name: '🔴 Sofia Pink', value: 'sofia_pink', description: '#ff007f' },
	{ name: '🔴 Stuck Red', value: 'stuck_red', description: '#df2f4a' },
	{ name: '🔴 Sunset', value: 'sunset', description: '#ff7575' },
	{ name: '🔵 Bright Blue', value: 'bright_blue', description: '#579bfc' },
	{ name: '🔵 Chili Blue', value: 'chili_blue', description: '#66ccff' },
	{ name: '🔵 Dark Blue', value: 'dark_blue', description: '#007eb5' },
	{ name: '🔵 Indigo', value: 'indigo', description: '#5559df' },
	{ name: '🔵 Navy', value: 'navy', description: '#225091' },
	{ name: '🔵 River', value: 'river', description: '#74afcc' },
	{ name: '🔵 Royal', value: 'royal', description: '#216edf' },
	{ name: '🔵 Sky', value: 'sky', description: '#a1e3f6' },
	{ name: '🔵 Steel', value: 'steel', description: '#a9bee8' },
	{ name: '🔵 Winter', value: 'winter', description: '#9aadbd' },
	{ name: '🟠 Dark Orange', value: 'dark_orange', description: '#ff6d3b' },
	{ name: '🟠 Peach', value: 'peach', description: '#ffadad' },
	{ name: '🟠 Working Orange', value: 'working_orange', description: '#fdab3d' },
	{ name: '🟡 Egg Yolk', value: 'egg_yolk', description: '#ffcb00' },
	{ name: '🟡 Saladish', value: 'saladish', description: '#cab641' },
	{ name: '🟢 Aquamarine', value: 'aquamarine', description: '#4eccc6' },
	{ name: '🟢 Bright Green', value: 'bright_green', description: '#9cd326' },
	{ name: '🟢 Done Green', value: 'done_green', description: '#00c875' },
	{ name: '🟢 Grass Green', value: 'grass_green', description: '#037f4c' },
	{ name: '🟢 Teal', value: 'teal', description: '#175a63' },
	{ name: '🟣 Berry', value: 'berry', description: '#7e3b8a' },
	{ name: '🟣 Bubble', value: 'bubble', description: '#faa1f1' },
	{ name: '🟣 Dark Indigo', value: 'dark_indigo', description: '#401694' },
	{ name: '🟣 Dark Purple', value: 'dark_purple', description: '#784bd1' },
	{ name: '🟣 Lavender', value: 'lavender', description: '#bda8f9' },
	{ name: '🟣 Lilac', value: 'lilac', description: '#9d99b9' },
	{ name: '🟣 Lipstick', value: 'lipstick', description: '#ff5ac4' },
	{ name: '🟣 Orchid', value: 'orchid', description: '#e484bd' },
	{ name: '🟣 Purple', value: 'purple', description: '#9d50dd' },
	{ name: '🟤 Brown', value: 'brown', description: '#7f5347' },
	{ name: '🟤 Coffee', value: 'coffee', description: '#cd9282' },
	{ name: '🟤 Pecan', value: 'pecan', description: '#563e3e' },
	{ name: '🟤 Tan', value: 'tan', description: '#bca58a' },
];

/**
 * Numeric color id → StatusColumnColors enum name. The typed `settings` field
 * of a status column returns each label's color as this numeric id, while the
 * update mutations want the enum name — this map bridges the two. Read back
 * live on 2026-07-15 by creating a status column with all 40 enum colors and
 * matching the returned ids (ids 20-100 and 111-150 are unassigned gaps).
 */
export const STATUS_COLOR_BY_ID: Record<number, string> = {
	0: 'working_orange',
	1: 'done_green',
	2: 'stuck_red',
	3: 'dark_blue',
	4: 'purple',
	5: 'explosive',
	6: 'grass_green',
	7: 'bright_blue',
	8: 'saladish',
	9: 'egg_yolk',
	10: 'blackish',
	11: 'dark_red',
	12: 'sofia_pink',
	13: 'lipstick',
	14: 'dark_purple',
	15: 'bright_green',
	16: 'chili_blue',
	17: 'american_gray',
	18: 'brown',
	19: 'dark_orange',
	101: 'sunset',
	102: 'bubble',
	103: 'peach',
	104: 'berry',
	105: 'winter',
	106: 'river',
	107: 'navy',
	108: 'aquamarine',
	109: 'indigo',
	110: 'dark_indigo',
	151: 'pecan',
	152: 'lavender',
	153: 'royal',
	154: 'steel',
	155: 'orchid',
	156: 'lilac',
	157: 'tan',
	158: 'sky',
	159: 'coffee',
	160: 'teal',
};

export interface StatusLabelRow {
	label: string;
	color?: string;
	description?: string;
	isDone?: boolean;
}

/** A label as returned by the typed `settings` JSON field of a column read. */
export interface ExistingLabel {
	id: number;
	label: string;
	color?: number;
	index?: number;
	description?: string | null;
	is_done?: boolean;
	is_deactivated?: boolean;
}

/**
 * Converts a status column's current labels (typed `settings` read) into
 * UpdateStatusLabelInput rows. The update mutations REPLACE the whole label
 * set, so every unchanged label must be re-sent — with its id (identity),
 * its color translated back from numeric id to enum name, and its index.
 */
export function statusSettingsToInputRows(labels: ExistingLabel[]): IDataObject[] {
	return labels.map((label) => {
		const row: IDataObject = {
			id: label.id,
			label: label.label,
			color: STATUS_COLOR_BY_ID[label.color ?? -1] ?? 'working_orange',
			index: label.index ?? 0,
		};
		if (label.description) row.description = label.description;
		if (label.is_done) row.is_done = true;
		if (label.is_deactivated) row.is_deactivated = true;
		return row;
	});
}

/** Same for a dropdown column: UpdateDropdownLabelInput rows. */
export function dropdownSettingsToInputRows(labels: ExistingLabel[]): IDataObject[] {
	return labels.map((label) => {
		const row: IDataObject = { id: label.id, label: label.label };
		if (label.is_deactivated) row.is_deactivated = true;
		return row;
	});
}

/** The index a newly appended status label should get (after all existing). */
export function nextStatusLabelIndex(labels: ExistingLabel[]): number {
	return labels.reduce((max, label) => Math.max(max, label.index ?? 0), -1) + 1;
}

export type StatusLabelPosition = 'first' | 'last' | 'after' | 'before';

/**
 * Places `target` among the other UpdateStatusLabelInput rows at the requested
 * position, returning the full row set with sequential indexes (0..n-1). The
 * update mutation replaces all labels anyway, so normalizing the indexes is
 * safe, removes historical gaps, and keeps the set inside the API's 0–39
 * index range. `others` must NOT contain the target row; rows are ordered by
 * their current `index` first (column reads return labels ordered by id).
 * Returns 'missing-anchor' when Before/After references a label that isn't in
 * `others` (including the target itself — a label can't anchor its own move).
 */
export function placeStatusLabelRow(
	others: IDataObject[],
	target: IDataObject,
	position: StatusLabelPosition,
	anchorId?: number,
): IDataObject[] | 'missing-anchor' {
	const sorted = [...others].sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
	let insertAt: number;
	if (position === 'first') {
		insertAt = 0;
	} else if (position === 'last') {
		insertAt = sorted.length;
	} else {
		const anchorAt = sorted.findIndex((row) => row.id === anchorId);
		if (anchorAt === -1) return 'missing-anchor';
		insertAt = position === 'after' ? anchorAt + 1 : anchorAt;
	}
	sorted.splice(insertAt, 0, target);
	return sorted.map((row, index) => ({ ...row, index }));
}

/**
 * Builds the CreateStatusColumnSettingsInput for create_status_column.
 * Label index (= position) comes from row order; description and is_done
 * are only sent when set, so the API defaults stay in effect.
 */
export function buildStatusColumnDefaults(rows: StatusLabelRow[]): IDataObject | undefined {
	if (rows.length === 0) return undefined;
	return {
		labels: rows.map((row, index) => {
			const label: IDataObject = {
				label: row.label,
				color: row.color || 'working_orange',
				index,
			};
			if (row.description) label.description = row.description;
			if (row.isDone) label.is_done = true;
			return label;
		}),
	};
}

/**
 * Builds the CreateDropdownColumnSettingsInput for create_dropdown_column.
 * labels is NON_NULL in the schema, so this returns undefined without rows —
 * the caller must fall back to the generic mutation then.
 */
export function buildDropdownColumnDefaults(
	rows: Array<{ label: string }>,
	options: { limitSelect?: boolean; labelLimitCount?: number } = {},
): IDataObject | undefined {
	if (rows.length === 0) return undefined;
	const defaults: IDataObject = { labels: rows.map((row) => ({ label: row.label })) };
	if (options.limitSelect !== undefined) defaults.limit_select = options.limitSelect;
	if (options.labelLimitCount !== undefined && options.limitSelect) {
		defaults.label_limit_count = options.labelLimitCount;
	}
	return defaults;
}

/**
 * UI field name → API settings property, per column type. Derived from
 * get_column_type_schema of the 2026-07 version for every creatable type;
 * types absent here (country, location, tags, dependency, status, dropdown)
 * have no simple settings — status/dropdown get the label builders, the rest
 * the Defaults (JSON) escape hatch.
 */
const TYPE_SETTINGS_FIELDS: Record<string, Record<string, string>> = {
	checkbox: { color: 'color', hideFooter: 'hide_footer' },
	color_picker: { color: 'color', colorMethod: 'colorMethod' },
	date: {
		calcType: 'calcType',
		dateFormat: 'date_format',
		hideFooter: 'hide_footer',
		showCurrentYear: 'show_current_year',
		showTimeByDefault: 'show_time_by_default',
		showWeekDay: 'show_week_day',
		showWeekends: 'show_weekends',
		showWeekNumber: 'show_week_number',
		timeFormat: 'time_format',
		useNumericOnlyFormat: 'use_numeric_only_format',
	},
	email: { ccPulse: 'ccPulse', includePulseInSubject: 'includePulseInSubject' },
	file: { hideFooter: 'hide_footer' },
	hour: { hourFormat: 'format' },
	link: {
		defaultText: 'defaultText',
		disableAutoTitle: 'disableAutoTitle',
		hideFooter: 'hide_footer',
	},
	long_text: { hideFooter: 'hide_footer' },
	numbers: { hideFooter: 'hide_footer' },
	people: { maxPeopleAllowed: 'max_people_allowed' },
	phone: { showFlag: 'show_flag' },
	rating: { color: 'color', ratingLimit: 'limit', ratingSymbol: 'symbol' },
	text: { hideFooter: 'hide_footer' },
	timeline: {
		hideFooter: 'hide_footer',
		showMilestone: 'show_set_as_milestone',
		showWeekends: 'show_weekends',
		showWeekNumber: 'show_week_number',
	},
	vote: { color: 'color' },
	week: { color: 'color' },
	world_clock: {
		clockFormat: 'format',
		endWorkingHours: 'endWorkingHours',
		showUtcOffset: 'show_utc_offset',
		startWorkingHours: 'startWorkingHours',
	},
};

/**
 * Compiles the Type Settings collection into the generic create_column
 * defaults object ({ settings: {...} }), applying per-type quirks:
 *   - numbers unit fields nest under settings.unit
 *   - people max_people_allowed is a string in the API schema
 *   - world_clock working hours are stringified 0-23 enums
 * Unknown/unset fields are dropped. Returns undefined when nothing is set.
 */
export function buildTypeSettingsDefaults(
	columnType: string,
	ui: IDataObject,
): IDataObject | undefined {
	const settings: IDataObject = {};

	const fieldMap = TYPE_SETTINGS_FIELDS[columnType] ?? {};
	for (const [uiName, apiName] of Object.entries(fieldMap)) {
		const value = ui[uiName];
		if (value === undefined || value === '') continue;
		if (apiName === 'max_people_allowed' || apiName.endsWith('WorkingHours')) {
			settings[apiName] = String(value);
		} else {
			settings[apiName] = value;
		}
	}

	if (columnType === 'numbers') {
		const unit: IDataObject = {};
		if (ui.unitSymbol !== undefined && ui.unitSymbol !== '') {
			unit.symbol = ui.unitSymbol === 'custom' ? 'custom' : ui.unitSymbol;
			if (ui.unitSymbol === 'custom' && ui.customUnit) unit.custom_unit = ui.customUnit;
		}
		if (ui.unitDirection !== undefined && ui.unitDirection !== '') {
			unit.direction = ui.unitDirection;
		}
		if (ui.precision !== undefined && ui.precision !== '') {
			unit.precision = Number(ui.precision);
		}
		if (Object.keys(unit).length > 0) settings.unit = unit;
	}

	if (Object.keys(settings).length === 0) return undefined;
	return { settings };
}

/**
 * Validates a user-supplied custom column ID for create_column and friends.
 * Rules verified live 2026-07-20 (the public doc page is stale on two
 * counts): lowercase letters, digits and underscores only; must not start
 * with a digit (docs claim a-z/_ only — digits work; leading underscore
 * works); max 24 characters (docs claim 20 — the API rejects at >24).
 * Returns a human-readable problem description, or null when valid.
 * Uniqueness (including reserved IDs of deleted columns) is only known
 * server-side and surfaces as the API's own descriptive error.
 */
export function validateCustomColumnId(id: string): string | null {
	if (id.length > 24) return 'must be at most 24 characters long';
	if (!/^[a-z_][a-z0-9_]*$/.test(id)) {
		return 'must contain only lowercase letters, digits and underscores, and must not start with a digit';
	}
	return null;
}

/**
 * Resolves the after_column_id for the requested position. The Name column
 * (id "name") is always first on a board, which is what makes "start" work.
 * For "before", pass the board's column ids in board order; returns null when
 * the anchor column isn't on the board (caller raises the friendly error).
 */
export function resolveAfterColumnId(
	position: string,
	anchorColumnId: string,
	orderedColumnIds: string[],
): string | null | undefined {
	if (position === 'start') return 'name';
	if (position === 'after') return anchorColumnId || null;
	if (position !== 'before') return undefined;

	if (!anchorColumnId) return null;
	if (anchorColumnId === 'name') return 'name';
	const index = orderedColumnIds.indexOf(anchorColumnId);
	if (index === -1) return null;
	if (index === 0) return 'name';
	return orderedColumnIds[index - 1];
}
