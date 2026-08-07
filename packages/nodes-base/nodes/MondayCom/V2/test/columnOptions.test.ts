import { describe, expect, it } from 'vitest';

import { NON_CLEARABLE_COLUMN_TYPES } from '../helpers/columnOptions';
import { READ_ONLY_COLUMN_TYPES } from '../helpers/columnValueMappers';

describe('NON_CLEARABLE_COLUMN_TYPES', () => {
	it('excludes computed and system columns', () => {
		for (const type of ['formula', 'mirror', 'auto_number', 'item_id', 'name', 'subtasks']) {
			expect(NON_CLEARABLE_COLUMN_TYPES.has(type)).toBe(true);
		}
	});

	it('keeps regular value columns clearable', () => {
		for (const type of ['status', 'text', 'numbers', 'date', 'checkbox', 'link', 'people']) {
			expect(NON_CLEARABLE_COLUMN_TYPES.has(type)).toBe(false);
		}
	});

	it('allows clearing file columns even though the value mapper cannot write them', () => {
		expect(READ_ONLY_COLUMN_TYPES.has('file')).toBe(true);
		expect(NON_CLEARABLE_COLUMN_TYPES.has('file')).toBe(false);
	});
});
