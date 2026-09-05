import { describe, expect, it } from 'vitest';

import {
	buildDropdownColumnDefaults,
	buildStatusColumnDefaults,
	buildTypeSettingsDefaults,
	CREATABLE_COLUMN_TYPES,
	dropdownSettingsToInputRows,
	nextStatusLabelIndex,
	placeStatusLabelRow,
	resolveAfterColumnId,
	STATUS_COLOR_BY_ID,
	STATUS_COLOR_OPTIONS,
	statusSettingsToInputRows,
	validateCustomColumnId,
} from '../helpers/columnDefaults';

describe('CREATABLE_COLUMN_TYPES', () => {
	it('excludes types that need complex settings or are system-managed', () => {
		const values = CREATABLE_COLUMN_TYPES.map((o) => o.value);
		for (const excluded of ['board_relation', 'mirror', 'formula', 'auto_number', 'item_id']) {
			expect(values).not.toContain(excluded);
		}
		expect(values).toContain('status');
		expect(values).toContain('dropdown');
	});
});

describe('STATUS_COLOR_OPTIONS', () => {
	it('covers the full 40-value StatusColumnColors enum', () => {
		expect(STATUS_COLOR_OPTIONS).toHaveLength(40);
		const values = STATUS_COLOR_OPTIONS.map((o) => o.value);
		expect(values).toContain('working_orange');
		expect(values).toContain('done_green');
		expect(values).toContain('stuck_red');
		expect(new Set(values).size).toBe(40);
	});
});

describe('buildStatusColumnDefaults', () => {
	it('assigns indexes from row order and defaults the color', () => {
		expect(
			buildStatusColumnDefaults([
				{ label: 'Todo' },
				{ label: 'Doing', color: 'bright_blue' },
				{ label: 'Done', color: 'done_green', isDone: true },
			]),
		).toEqual({
			labels: [
				{ label: 'Todo', color: 'working_orange', index: 0 },
				{ label: 'Doing', color: 'bright_blue', index: 1 },
				{ label: 'Done', color: 'done_green', index: 2, is_done: true },
			],
		});
	});

	it('sends description only when set and omits is_done when false', () => {
		expect(
			buildStatusColumnDefaults([
				{ label: 'A', color: 'teal', description: 'first', isDone: false },
			]),
		).toEqual({
			labels: [{ label: 'A', color: 'teal', index: 0, description: 'first' }],
		});
	});

	it('returns undefined without rows (monday creates default labels)', () => {
		expect(buildStatusColumnDefaults([])).toBeUndefined();
	});
});

describe('buildDropdownColumnDefaults', () => {
	it('builds the labels list', () => {
		expect(buildDropdownColumnDefaults([{ label: 'Alpha' }, { label: 'Beta' }])).toEqual({
			labels: [{ label: 'Alpha' }, { label: 'Beta' }],
		});
	});

	it('adds selection limits only when limiting is on', () => {
		expect(
			buildDropdownColumnDefaults([{ label: 'A' }], { limitSelect: true, labelLimitCount: 2 }),
		).toEqual({ labels: [{ label: 'A' }], limit_select: true, label_limit_count: 2 });
		expect(
			buildDropdownColumnDefaults([{ label: 'A' }], { limitSelect: false, labelLimitCount: 2 }),
		).toEqual({ labels: [{ label: 'A' }], limit_select: false });
	});

	it('returns undefined without rows (labels is NON_NULL in the schema)', () => {
		expect(buildDropdownColumnDefaults([], { limitSelect: true })).toBeUndefined();
	});
});

describe('buildTypeSettingsDefaults', () => {
	it('nests numbers unit fields under settings.unit', () => {
		expect(
			buildTypeSettingsDefaults('numbers', {
				unitSymbol: '$',
				unitDirection: 'left',
				precision: 2,
				hideFooter: true,
			}),
		).toEqual({
			settings: { hide_footer: true, unit: { symbol: '$', direction: 'left', precision: 2 } },
		});
	});

	it('passes the custom unit symbol through', () => {
		expect(
			buildTypeSettingsDefaults('numbers', { unitSymbol: 'custom', customUnit: 'pts' }),
		).toEqual({ settings: { unit: { symbol: 'custom', custom_unit: 'pts' } } });
	});

	it('maps UI names to API property names per type', () => {
		expect(
			buildTypeSettingsDefaults('rating', { ratingLimit: 10, ratingSymbol: 'hearts' }),
		).toEqual({ settings: { limit: 10, symbol: 'hearts' } });
		expect(
			buildTypeSettingsDefaults('date', { showTimeByDefault: true, dateFormat: 'DD/MM/YYYY' }),
		).toEqual({ settings: { show_time_by_default: true, date_format: 'DD/MM/YYYY' } });
		expect(buildTypeSettingsDefaults('hour', { hourFormat: '12H' })).toEqual({
			settings: { format: '12H' },
		});
	});

	it('stringifies the values the API schema types as strings', () => {
		expect(buildTypeSettingsDefaults('people', { maxPeopleAllowed: 3 })).toEqual({
			settings: { max_people_allowed: '3' },
		});
		expect(
			buildTypeSettingsDefaults('world_clock', { startWorkingHours: 9, endWorkingHours: 17 }),
		).toEqual({ settings: { startWorkingHours: '9', endWorkingHours: '17' } });
	});

	it('ignores unknown fields and returns undefined when nothing is set', () => {
		expect(buildTypeSettingsDefaults('text', {})).toBeUndefined();
		expect(buildTypeSettingsDefaults('text', { nonsense: true })).toBeUndefined();
		expect(buildTypeSettingsDefaults('country', { hideFooter: true })).toBeUndefined();
	});
});

describe('STATUS_COLOR_BY_ID', () => {
	it('maps every numeric id to a color in the options list', () => {
		const enumValues = new Set(STATUS_COLOR_OPTIONS.map((o) => o.value));
		const mapped = Object.values(STATUS_COLOR_BY_ID);
		expect(mapped).toHaveLength(40);
		for (const name of mapped) expect(enumValues.has(name)).toBe(true);
		expect(STATUS_COLOR_BY_ID[0]).toBe('working_orange');
		expect(STATUS_COLOR_BY_ID[107]).toBe('navy');
		expect(STATUS_COLOR_BY_ID[160]).toBe('teal');
	});
});

describe('statusSettingsToInputRows', () => {
	it('re-encodes existing labels with ids, enum colors, and only-set flags', () => {
		expect(
			statusSettingsToInputRows([
				{ id: 0, label: 'Todo', color: 0, index: 0, description: null, is_done: false },
				{ id: 1, label: 'Done', color: 1, index: 1, is_done: true },
				{ id: 2, label: 'Old', color: 107, index: 5, description: 'gone', is_deactivated: true },
			]),
		).toEqual([
			{ id: 0, label: 'Todo', color: 'working_orange', index: 0 },
			{ id: 1, label: 'Done', color: 'done_green', index: 1, is_done: true },
			{
				id: 2,
				label: 'Old',
				color: 'navy',
				index: 5,
				description: 'gone',
				is_deactivated: true,
			},
		]);
	});

	it('falls back to working_orange for unknown color ids', () => {
		expect(statusSettingsToInputRows([{ id: 3, label: 'X', color: 999, index: 0 }])).toEqual([
			{ id: 3, label: 'X', color: 'working_orange', index: 0 },
		]);
	});
});

describe('dropdownSettingsToInputRows', () => {
	it('keeps ids and deactivation only', () => {
		expect(
			dropdownSettingsToInputRows([
				{ id: 1, label: 'Red' },
				{ id: 2, label: 'Green', is_deactivated: true },
			]),
		).toEqual([
			{ id: 1, label: 'Red' },
			{ id: 2, label: 'Green', is_deactivated: true },
		]);
	});
});

describe('nextStatusLabelIndex', () => {
	it('appends after the highest existing index', () => {
		expect(
			nextStatusLabelIndex([
				{ id: 0, label: 'A', index: 0 },
				{ id: 2, label: 'B', index: 5 },
			]),
		).toBe(6);
		expect(nextStatusLabelIndex([])).toBe(0);
	});
});

describe('placeStatusLabelRow', () => {
	const others = [
		{ id: 0, label: 'Alpha', index: 0 },
		{ id: 1, label: 'Beta', index: 1 },
		{ id: 2, label: 'Gamma', index: 2 },
	];
	const target = { id: 7, label: 'Delta', index: 3 };

	it('places first and renumbers sequentially', () => {
		expect(placeStatusLabelRow(others, target, 'first')).toEqual([
			{ id: 7, label: 'Delta', index: 0 },
			{ id: 0, label: 'Alpha', index: 1 },
			{ id: 1, label: 'Beta', index: 2 },
			{ id: 2, label: 'Gamma', index: 3 },
		]);
	});

	it('places last', () => {
		expect(placeStatusLabelRow(others, target, 'last')).toEqual([
			{ id: 0, label: 'Alpha', index: 0 },
			{ id: 1, label: 'Beta', index: 1 },
			{ id: 2, label: 'Gamma', index: 2 },
			{ id: 7, label: 'Delta', index: 3 },
		]);
	});

	it('places before and after an anchor by label id', () => {
		expect(placeStatusLabelRow(others, target, 'before', 1)).toEqual([
			{ id: 0, label: 'Alpha', index: 0 },
			{ id: 7, label: 'Delta', index: 1 },
			{ id: 1, label: 'Beta', index: 2 },
			{ id: 2, label: 'Gamma', index: 3 },
		]);
		expect(placeStatusLabelRow(others, target, 'after', 1)).toEqual([
			{ id: 0, label: 'Alpha', index: 0 },
			{ id: 1, label: 'Beta', index: 1 },
			{ id: 7, label: 'Delta', index: 2 },
			{ id: 2, label: 'Gamma', index: 3 },
		]);
	});

	it('orders by current index (not array order) and closes gaps', () => {
		const gappy = [
			{ id: 2, label: 'Gamma', index: 9 },
			{ id: 0, label: 'Alpha', index: 1 },
		];
		expect(placeStatusLabelRow(gappy, { id: 7, label: 'Delta' }, 'after', 0)).toEqual([
			{ id: 0, label: 'Alpha', index: 0 },
			{ id: 7, label: 'Delta', index: 1 },
			{ id: 2, label: 'Gamma', index: 2 },
		]);
	});

	it('reports a missing anchor (including the moved label itself)', () => {
		expect(placeStatusLabelRow(others, target, 'after', undefined)).toBe('missing-anchor');
		expect(placeStatusLabelRow(others, target, 'before', 99)).toBe('missing-anchor');
		expect(placeStatusLabelRow(others, target, 'after', 7)).toBe('missing-anchor');
	});

	it('does not mutate the input rows', () => {
		const copy = others.map((row) => ({ ...row }));
		placeStatusLabelRow(others, target, 'first');
		expect(others).toEqual(copy);
	});
});

describe('resolveAfterColumnId', () => {
	const boardOrder = ['name', 'text_a', 'status_b', 'date_c'];

	it('returns undefined for end (API default appends)', () => {
		expect(resolveAfterColumnId('end', '', boardOrder)).toBeUndefined();
	});

	it('anchors start after the Name column', () => {
		expect(resolveAfterColumnId('start', '', boardOrder)).toBe('name');
	});

	it('passes the anchor through for after', () => {
		expect(resolveAfterColumnId('after', 'status_b', boardOrder)).toBe('status_b');
	});

	it('resolves before to the preceding column in board order', () => {
		expect(resolveAfterColumnId('before', 'date_c', boardOrder)).toBe('status_b');
		expect(resolveAfterColumnId('before', 'text_a', boardOrder)).toBe('name');
		expect(resolveAfterColumnId('before', 'name', boardOrder)).toBe('name');
	});

	it('returns null when the anchor is missing or not on the board', () => {
		expect(resolveAfterColumnId('after', '', boardOrder)).toBeNull();
		expect(resolveAfterColumnId('before', 'nope', boardOrder)).toBeNull();
	});
});

describe('validateCustomColumnId', () => {
	it('accepts IDs matching the live-verified rules', () => {
		expect(validateCustomColumnId('work_status')).toBeNull();
		// Digits and leading underscores are valid (verified live 2026-07-20,
		// despite the docs claiming a-z and _ only).
		expect(validateCustomColumnId('digits_test_9')).toBeNull();
		expect(validateCustomColumnId('_leading_underscore')).toBeNull();
		expect(validateCustomColumnId('a')).toBeNull();
		// Exactly 24 chars — the live limit (docs claim 20).
		expect(validateCustomColumnId('a'.repeat(24))).toBeNull();
	});

	it('rejects IDs over 24 characters', () => {
		expect(validateCustomColumnId('a'.repeat(25))).toMatch(/24 characters/);
	});

	it('rejects uppercase, hyphens, spaces and leading digits', () => {
		for (const bad of ['Work_Status', 'work-status', 'work status', '9lives', '']) {
			expect(validateCustomColumnId(bad)).toMatch(/lowercase/);
		}
	});
});
