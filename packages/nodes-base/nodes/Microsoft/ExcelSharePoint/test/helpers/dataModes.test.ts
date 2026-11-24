import {
	autoMapRow,
	columnsFromFields,
	columnsFromItem,
	defineRow,
	isEmptySheet,
	isEmptyUsedRange,
} from '../../helpers/dataModes';

describe('Microsoft Excel (SharePoint) — helpers/dataModes', () => {
	describe('isEmptyUsedRange', () => {
		it('treats a single-cell address as empty', () => {
			expect(isEmptyUsedRange('Sheet1!A1')).toBe(true);
		});

		it('treats a multi-cell address as non-empty', () => {
			expect(isEmptyUsedRange('Sheet1!A1:B2')).toBe(false);
		});
	});

	describe('isEmptySheet', () => {
		it('treats a single-cell address with a blank cell as empty', () => {
			expect(isEmptySheet('Sheet1!A1', [''])).toBe(true);
		});

		it('treats a single-cell address with no row data at all as empty', () => {
			expect(isEmptySheet('Sheet1!A1', undefined)).toBe(true);
		});

		it('does not treat a one-column sheet with only its header as empty', () => {
			expect(isEmptySheet('Sheet1!A1', ['Notes'])).toBe(false);
		});

		it('treats a multi-cell address as non-empty regardless of content', () => {
			expect(isEmptySheet('Sheet1!A1:B2', [''])).toBe(false);
		});
	});

	describe('columnsFromItem', () => {
		it('returns the keys of an item, in order', () => {
			expect(columnsFromItem({ name: 'alice', age: 30 })).toEqual(['name', 'age']);
		});

		it('returns an empty array for an item with no keys', () => {
			expect(columnsFromItem({})).toEqual([]);
		});
	});

	describe('columnsFromFields', () => {
		it('returns the column names in the order they were defined', () => {
			expect(
				columnsFromFields([
					{ column: 'name', fieldValue: 'alice' },
					{ column: 'age', fieldValue: '30' },
				]),
			).toEqual(['name', 'age']);
		});

		it('returns an empty array when no fields are defined', () => {
			expect(columnsFromFields([])).toEqual([]);
		});
	});

	describe('autoMapRow', () => {
		it('projects the item into column order', () => {
			expect(autoMapRow({ name: 'alice', age: 30 }, ['age', 'name'])).toEqual([30, 'alice']);
		});

		it('fills missing properties with null', () => {
			expect(autoMapRow({ name: 'alice' }, ['name', 'age'])).toEqual(['alice', null]);
		});
	});

	describe('defineRow', () => {
		it('projects the defined fields into column order', () => {
			expect(
				defineRow(
					[
						{ column: 'age', fieldValue: '30' },
						{ column: 'name', fieldValue: 'alice' },
					],
					['name', 'age'],
				),
			).toEqual(['alice', '30']);
		});

		it('fills undefined fields with null', () => {
			expect(defineRow([{ column: 'name', fieldValue: 'alice' }], ['name', 'age'])).toEqual([
				'alice',
				null,
			]);
		});
	});
});
