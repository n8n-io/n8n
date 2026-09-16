import { decodeRow, describeTable, encodeRow, splitRow } from '../GenericFunctions';
import type { GristColumn } from '../types';

const columns: GristColumn[] = [
	{ id: 'Email', fields: { type: 'Text' } },
	{ id: 'Letters', fields: { type: 'Text' } },
	{ id: 'Note', fields: { type: 'Any' } },
	{ id: 'Sizes', fields: { type: 'ChoiceList' } },
	{ id: 'Friends', fields: { type: 'RefList:People' } },
	{ id: 'Files', fields: { type: 'Attachments' } },
	{ id: 'FullName', fields: { type: 'Text', isFormula: true, formula: '$Email' } },
];
const table = describeTable(columns);

describe('Grist Node', () => {
	describe('Rows', () => {
		describe('splitRow', () => {
			it('should leave out the row ID and formula columns', () => {
				const { require, fields } = splitRow(
					{ id: 1, Email: 'ada@example.com', FullName: 'Ada', Unknown: 'kept' },
					table,
				);

				expect(require).toEqual({});
				expect(fields).toEqual({ Email: 'ada@example.com', Unknown: 'kept' });
			});

			it('should move the columns to match on into require, with the row ID as a number', () => {
				const { require, fields } = splitRow(
					{ id: '1', Email: 'ada@example.com', Sizes: ['M'] },
					table,
					['id', 'Email'],
				);

				expect(require).toEqual({ id: 1, Email: 'ada@example.com' });
				expect(fields).toEqual({ Sizes: ['M'] });
			});
		});

		describe('encodeRow and decodeRow', () => {
			it('should add and remove the list marker for list columns', () => {
				const plain = { Sizes: ['M', 'XL'], Friends: [1, 2], Files: [7] };
				const stored = { Sizes: ['L', 'M', 'XL'], Friends: ['L', 1, 2], Files: ['L', 7] };

				expect(encodeRow(plain, table)).toEqual(stored);
				expect(decodeRow(stored, table)).toEqual(plain);
			});

			it('should keep a list item that is itself the letter L', () => {
				const plain = { Sizes: ['L', 'M', 'XL'] };

				expect(encodeRow(plain, table)).toEqual({ Sizes: ['L', 'L', 'M', 'XL'] });
				expect(decodeRow(encodeRow(plain, table), table)).toEqual(plain);
			});

			it('should leave other columns and empty list cells unchanged', () => {
				const row = {
					Email: 'ada@example.com',
					Letters: '["C","B","A"]',
					Note: ['L', 'x'],
					Sizes: null,
					Friends: '',
				};

				expect(encodeRow(row, table)).toEqual(row);
				expect(decodeRow(row, table)).toEqual(row);
			});
		});
	});
});
