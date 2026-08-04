import type { IExecuteFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	assertRollupFunctionAllowed,
	formatColumnSchemaRow,
} from '../actions/column/column.execute';

function makeContext(rawValue: unknown): IExecuteFunctions {
	return {
		getNodeParameter: () => rawValue,
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 1 }),
	} as unknown as IExecuteFunctions;
}

describe('formatColumnSchemaRow', () => {
	it('parses settings_str into a settings object', () => {
		const row = formatColumnSchemaRow({
			id: 'status',
			title: 'Status',
			type: 'status',
			description: 'Where it stands',
			settings_str: '{"labels":{"0":"Todo","1":"Done"}}',
		});
		expect(row.settings).toEqual({ labels: { '0': 'Todo', '1': 'Done' } });
		expect(row.id).toBe('status');
	});

	it('returns null settings for empty or invalid settings_str', () => {
		expect(formatColumnSchemaRow({ id: 'x', settings_str: '' }).settings).toBeNull();
		expect(formatColumnSchemaRow({ id: 'x', settings_str: '{oops' }).settings).toBeNull();
		expect(formatColumnSchemaRow({ id: 'x' }).settings).toBeNull();
	});

	it('surfaces the calculated capability as rollup, null when absent', () => {
		const withRollup = formatColumnSchemaRow({
			id: 'num',
			capabilities: { calculated: { function: 'SUM', calculated_type: 'rollup' } },
		});
		expect(withRollup.rollup).toEqual({ function: 'SUM', calculated_type: 'rollup' });

		expect(formatColumnSchemaRow({ id: 'x' }).rollup).toBeNull();
		expect(
			formatColumnSchemaRow({ id: 'x', capabilities: { calculated: null } }).rollup,
		).toBeNull();
	});
});

describe('assertRollupFunctionAllowed (Column Create/Update pre-flight)', () => {
	const node = makeContext(null).getNode();

	// Matrix probed live (CalculatedFunction enum, 2026-07 schema): rows are
	// column types, columns are functions; ✓ = valid, ✗ = friendly error.
	const VALID: Array<[string, string]> = [
		['numbers', 'SUM'],
		['numbers', 'MIN'],
		['numbers', 'MAX'],
		['numbers', 'NONE'],
		['date', 'MIN'],
		['date', 'MAX'],
		['date', 'NONE'],
		['timeline', 'MIN_MAX'],
		['timeline', 'NONE'],
		['status', 'COUNT_KEYS'],
		['status', 'NONE'],
	];
	const INVALID: Array<[string, string]> = [
		['numbers', 'MIN_MAX'],
		['numbers', 'COUNT_KEYS'],
		['date', 'SUM'],
		['date', 'MIN_MAX'],
		['date', 'COUNT_KEYS'],
		['timeline', 'SUM'],
		['timeline', 'MIN'],
		['timeline', 'MAX'],
		['timeline', 'COUNT_KEYS'],
		['status', 'SUM'],
		['status', 'MIN'],
		['status', 'MAX'],
		['status', 'MIN_MAX'],
	];

	it.each(VALID)('allows %s + %s', (columnType, rollupFunction) => {
		expect(() => assertRollupFunctionAllowed(node, 0, columnType, rollupFunction)).not.toThrow();
	});

	it.each(INVALID)('rejects %s + %s with the supported list', (columnType, rollupFunction) => {
		expect(() => assertRollupFunctionAllowed(node, 0, columnType, rollupFunction)).toThrow(
			`${rollupFunction} is not supported on ${columnType} columns`,
		);
	});

	it('rejects non-rollup column types with a friendly explanation', () => {
		for (const columnType of ['text', 'people', 'checkbox', 'rating']) {
			expect(() => assertRollupFunctionAllowed(node, 0, columnType, 'SUM')).toThrow(
				/Rollup is not supported on .* columns/,
			);
		}
	});

	it('is a no-op when no rollup function is set (Board Default)', () => {
		expect(() => assertRollupFunctionAllowed(node, 0, 'text', '')).not.toThrow();
	});
});
