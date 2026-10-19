import { describe, expect, it } from 'vitest';

import {
	buildFilterRules,
	COLUMN_TYPE_OPERATORS,
	FILTER_OPERATOR_OPTIONS,
	findRollupStatusRuleColumns,
	findUnsupportedOperatorRules,
	formatUnsupportedOperatorMessage,
	getOperatorOptionsForColumnType,
	isUnfilterableColumnType,
	parseLabelIndexes,
} from '../helpers/itemFilters';

const STATUS_COLUMN = {
	id: 'status_1',
	type: 'status',
	settings_str: '{"labels": {"0": "Working on it", "1": "Done", "2": "Stuck"}}',
};
const DROPDOWN_COLUMN = {
	id: 'drop_1',
	type: 'dropdown',
	settings_str: '{"labels": [{"id": 3, "name": "Red"}, {"id": 7, "name": "Blue"}]}',
};
const NUMBER_COLUMN = { id: 'num_1', type: 'numbers' };
const TEXT_COLUMN = { id: 'text_1', type: 'text' };
const DEPENDENCY_COLUMN = { id: 'dep_1', type: 'dependency' };
const CONNECT_COLUMN = { id: 'connect_1', type: 'board_relation' };
const COLUMNS = [
	STATUS_COLUMN,
	DROPDOWN_COLUMN,
	NUMBER_COLUMN,
	TEXT_COLUMN,
	DEPENDENCY_COLUMN,
	CONNECT_COLUMN,
];

describe('parseLabelIndexes', () => {
	it('parses status-style label maps', () => {
		expect(parseLabelIndexes(STATUS_COLUMN.settings_str)).toEqual({
			'working on it': 0,
			done: 1,
			stuck: 2,
		});
	});

	it('parses dropdown-style label arrays', () => {
		expect(parseLabelIndexes(DROPDOWN_COLUMN.settings_str)).toEqual({ red: 3, blue: 7 });
	});

	it('handles missing or malformed settings', () => {
		expect(parseLabelIndexes(undefined)).toEqual({});
		expect(parseLabelIndexes('not json')).toEqual({});
	});
});

describe('buildFilterRules', () => {
	it('resolves status label text to indexes, case-insensitively', () => {
		const rules = buildFilterRules(
			[{ columnId: 'status_1', operator: 'any_of', value: 'done, STUCK' }],
			COLUMNS,
		);
		expect(rules).toEqual([{ column_id: 'status_1', compare_value: [1, 2], operator: 'any_of' }]);
	});

	it('keeps explicit numeric indexes for label columns', () => {
		const rules = buildFilterRules(
			[{ columnId: 'drop_1', operator: 'not_any_of', value: '7' }],
			COLUMNS,
		);
		expect(rules).toEqual([{ column_id: 'drop_1', compare_value: [7], operator: 'not_any_of' }]);
	});

	it('sends item IDs as numbers on dependency/board_relation rules (strings match nothing)', () => {
		const rules = buildFilterRules(
			[
				{ columnId: 'dep_1', operator: 'any_of', value: '123, 456' },
				{ columnId: 'connect_1', operator: 'not_any_of', value: '789' },
			],
			COLUMNS,
		);
		expect(rules).toEqual([
			{ column_id: 'dep_1', compare_value: [123, 456], operator: 'any_of' },
			{ column_id: 'connect_1', compare_value: [789], operator: 'not_any_of' },
		]);
	});

	it('converts numeric values for number columns and keeps text as strings', () => {
		const rules = buildFilterRules(
			[
				{ columnId: 'num_1', operator: 'greater_than', value: '42' },
				{ columnId: 'text_1', operator: 'contains_text', value: '42' },
			],
			COLUMNS,
		);
		expect(rules).toEqual([
			{ column_id: 'num_1', compare_value: [42], operator: 'greater_than' },
			{ column_id: 'text_1', compare_value: ['42'], operator: 'contains_text' },
		]);
	});

	it('splits multi-value operators on commas but not single-value ones', () => {
		const rules = buildFilterRules(
			[
				{ columnId: 'num_1', operator: 'between', value: '1, 10' },
				{ columnId: 'text_1', operator: 'contains_text', value: 'a, b' },
			],
			COLUMNS,
		);
		expect(rules[0].compare_value).toEqual([1, 10]);
		expect(rules[1].compare_value).toEqual(['a, b']);
	});

	it('sends [] compare_value for empty-check operators (null fails GraphQL validation)', () => {
		const rules = buildFilterRules(
			[{ columnId: 'text_1', operator: 'is_empty', value: 'ignored' }],
			COLUMNS,
		);
		expect(rules).toEqual([{ column_id: 'text_1', compare_value: [], operator: 'is_empty' }]);
	});

	it('drops incomplete rows and handles unknown columns as plain strings', () => {
		const rules = buildFilterRules(
			[
				{ columnId: '', operator: 'any_of', value: 'x' },
				{ columnId: 'mystery', operator: 'any_of', value: 'a, 5' },
			],
			COLUMNS,
		);
		expect(rules).toEqual([
			{ column_id: 'mystery', compare_value: ['a', '5'], operator: 'any_of' },
		]);
	});
});

describe('COLUMN_TYPE_OPERATORS / getOperatorOptionsForColumnType', () => {
	it('only contains operators that exist in the full option list', () => {
		const known = new Set(FILTER_OPERATOR_OPTIONS.map((option) => option.value));
		for (const [type, operators] of Object.entries(COLUMN_TYPE_OPERATORS)) {
			for (const operator of operators) {
				expect(known.has(operator), `${type}: ${operator}`).toBe(true);
			}
		}
	});

	it('ends_with is supported by no column type (rejected everywhere, verified live)', () => {
		for (const operators of Object.values(COLUMN_TYPE_OPERATORS)) {
			expect(operators).not.toContain('ends_with');
		}
	});

	it('narrows options per column type', () => {
		const numberOps = getOperatorOptionsForColumnType('numbers').map((option) => option.value);
		expect(numberOps).toContain('greater_than');
		expect(numberOps).not.toContain('starts_with');
		expect(numberOps).not.toContain('between');

		const textOps = getOperatorOptionsForColumnType('text').map((option) => option.value);
		expect(textOps).toContain('starts_with');
		expect(textOps).not.toContain('greater_than');
	});

	it('falls back to the full list for unknown types', () => {
		expect(getOperatorOptionsForColumnType(undefined)).toEqual(FILTER_OPERATOR_OPTIONS);
		expect(getOperatorOptionsForColumnType('brand_new_type')).toEqual(FILTER_OPERATOR_OPTIONS);
	});

	it('flags fully unfilterable types', () => {
		expect(isUnfilterableColumnType('formula')).toBe(true);
		expect(isUnfilterableColumnType('mirror')).toBe(true);
		expect(isUnfilterableColumnType('numbers')).toBe(false);
		expect(isUnfilterableColumnType('brand_new_type')).toBe(false);
	});
});

describe('findUnsupportedOperatorRules', () => {
	it('flags operators the column type rejects and keeps supported ones', () => {
		const offending = findUnsupportedOperatorRules(
			[
				{ columnId: 'num_1', operator: 'starts_with', value: '5' },
				{ columnId: 'num_1', operator: 'greater_than', value: '5' },
				{ columnId: 'text_1', operator: 'contains_text', value: 'a' },
			],
			COLUMNS,
		);
		expect(offending).toHaveLength(1);
		expect(offending[0]).toMatchObject({
			columnId: 'num_1',
			columnType: 'numbers',
			operator: 'starts_with',
		});
	});

	it('skips unknown columns and unknown column types (fallback = allow)', () => {
		const offending = findUnsupportedOperatorRules(
			[
				{ columnId: 'mystery', operator: 'starts_with', value: 'x' },
				{ columnId: 'future_1', operator: 'starts_with', value: 'x' },
			],
			[...COLUMNS, { id: 'future_1', type: 'brand_new_type' }],
		);
		expect(offending).toEqual([]);
	});

	it('flags every rule on unfilterable column types', () => {
		const offending = findUnsupportedOperatorRules(
			[{ columnId: 'formula_1', operator: 'any_of', value: '6' }],
			[{ id: 'formula_1', type: 'formula' }],
		);
		expect(offending).toHaveLength(1);
		expect(offending[0].supported).toEqual([]);
	});

	it('formats a friendly message for both cases', () => {
		const message = formatUnsupportedOperatorMessage([
			{ columnId: 'num_1', columnType: 'numbers', operator: 'starts_with', supported: ['any_of'] },
			{ columnId: 'formula_1', columnType: 'formula', operator: 'any_of', supported: [] },
		]);
		expect(message).toContain('"starts_with" is not supported by column num_1 (type: numbers)');
		expect(message).toContain('supported operators: any_of');
		expect(message).toContain('column formula_1 (type: formula) cannot be filtered');
	});
});

describe('findRollupStatusRuleColumns', () => {
	const ROLLUP_STATUS = {
		id: 'status_rollup',
		type: 'status',
		capabilities: { calculated: { function: 'COUNT_KEYS' } },
	};
	const ROLLUP_NUMBERS = {
		id: 'num_rollup',
		type: 'numbers',
		capabilities: { calculated: { function: 'SUM' } },
	};
	const PLAIN_STATUS = { id: 'status_plain', type: 'status', capabilities: { calculated: null } };
	const ML_COLUMNS = [ROLLUP_STATUS, ROLLUP_NUMBERS, PLAIN_STATUS, ...COLUMNS];

	it('flags only status columns with a calculated capability', () => {
		const offending = findRollupStatusRuleColumns(
			[
				{ columnId: 'status_rollup', operator: 'any_of', value: 'Done' },
				{ columnId: 'num_rollup', operator: 'greater_than', value: '5' },
				{ columnId: 'status_plain', operator: 'any_of', value: 'Done' },
				{ columnId: 'status_1', operator: 'any_of', value: 'Done' },
			],
			ML_COLUMNS,
		);
		expect(offending).toEqual(['status_rollup']);
	});

	it('deduplicates and ignores unknown or empty column ids', () => {
		const offending = findRollupStatusRuleColumns(
			[
				{ columnId: 'status_rollup', operator: 'any_of', value: 'Done' },
				{ columnId: 'status_rollup', operator: 'not_any_of', value: 'Stuck' },
				{ columnId: '', operator: 'any_of', value: 'x' },
				{ columnId: 'mystery', operator: 'any_of', value: 'x' },
			],
			ML_COLUMNS,
		);
		expect(offending).toEqual(['status_rollup']);
	});
});
