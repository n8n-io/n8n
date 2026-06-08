import fc from 'fast-check';

import {
	DATA_TABLE_SYSTEM_COLUMNS,
	DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP,
	DATA_TABLE_SYSTEM_TESTING_COLUMN,
} from '../src/data-table.types';

// The data-table.types module is mostly TS types, but it ships three runtime
// constants that the DataTable node and the data-table CLI module depend on
// for schema-aware behaviour. Stryker can mutate these three declarations
// (string literals, the object literal, and the Object.keys call), so each
// assertion here pins one mutation class and the metamorphic checks lock in
// the derived relationship between the map and the derived columns array.

describe('DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP', () => {
	it('declares exactly the three reserved system columns', () => {
		// Empties the object literal — `{}` — and any added/removed key.
		expect(Object.keys(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP).sort()).toEqual([
			'createdAt',
			'id',
			'updatedAt',
		]);
	});

	it('types the id column as a number', () => {
		// Kills `'number'` → `''` and `'number'` → any other literal.
		expect(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP.id).toBe('number');
	});

	it('types the createdAt column as a date', () => {
		expect(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP.createdAt).toBe('date');
	});

	it('types the updatedAt column as a date', () => {
		// Distinct assertion (not a loop) so each `'date'` literal site is
		// covered independently — Stryker mutates each occurrence as its own
		// mutant and a single failing case would otherwise leave one alive.
		expect(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP.updatedAt).toBe('date');
	});

	it('only emits values from the DataTableColumnType union', () => {
		// Property-style check across all entries: any mutation that swaps a
		// value to '' or to an out-of-union string is caught by membership.
		const allowed = new Set(['string', 'number', 'boolean', 'date']);
		for (const value of Object.values(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP)) {
			expect(allowed.has(value)).toBe(true);
		}
	});
});

describe('DATA_TABLE_SYSTEM_COLUMNS', () => {
	it('is the ordered list of map keys', () => {
		// Pins the exact insertion order from the source object literal so
		// downstream code that relies on positional order (e.g. column
		// projection) stays stable.
		expect(DATA_TABLE_SYSTEM_COLUMNS).toEqual(['id', 'createdAt', 'updatedAt']);
	});

	it('is derived from Object.keys of the type map (metamorphic)', () => {
		// Kills `Object.keys` → `Object.values` (would yield the type names)
		// and any mutation that decouples the constant from the source map.
		expect(DATA_TABLE_SYSTEM_COLUMNS).toEqual(Object.keys(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP));
	});

	it('has the same length as the type map', () => {
		expect(DATA_TABLE_SYSTEM_COLUMNS).toHaveLength(
			Object.keys(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP).length,
		);
	});

	it('every entry is a key of the type map', () => {
		// Property: ∀ col ∈ DATA_TABLE_SYSTEM_COLUMNS, col is a key of the map.
		// Generators here would only exercise the same fixed set, so we drive
		// the property over the actual constant — fast-check is used for
		// shrinkable failure reporting on any future schema additions.
		fc.assert(
			fc.property(fc.constantFrom(...DATA_TABLE_SYSTEM_COLUMNS), (col) => {
				return Object.prototype.hasOwnProperty.call(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP, col);
			}),
		);
	});

	it('contains no duplicate column names', () => {
		expect(new Set(DATA_TABLE_SYSTEM_COLUMNS).size).toBe(DATA_TABLE_SYSTEM_COLUMNS.length);
	});
});

describe('DATA_TABLE_SYSTEM_TESTING_COLUMN', () => {
	it('is the literal "dryRunState"', () => {
		// Kills `'dryRunState'` → `''` and any other literal swap. The exact
		// value is contractual: the data-table service uses it as the row
		// state discriminator in DataTableRowReturnWithState.
		expect(DATA_TABLE_SYSTEM_TESTING_COLUMN).toBe('dryRunState');
	});

	it('does not collide with any real system column', () => {
		// Metamorphic: the testing column lives in a different namespace from
		// the persisted system columns; if anyone renamed it to collide we'd
		// silently corrupt query results.
		expect(DATA_TABLE_SYSTEM_COLUMNS).not.toContain(DATA_TABLE_SYSTEM_TESTING_COLUMN);
	});
});
