import {
	addRowNumber,
	prepareSheetData,
	removeEmptyColumns,
	removeEmptyRows,
	trimLeadingEmptyRows,
	trimToFirstEmptyRow,
} from '../../../v2/helpers/GoogleSheets.utils';

describe('Test Google Sheets, addRowNumber', () => {
	it('should add row nomber', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			[1, 'a', 'b', 'c'],
			[2, 'd', 'e', 'f'],
			[3, 'g', 'h', 'i'],
		];
		const result = addRowNumber(data, 0);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[4, 2, 'd', 'e', 'f'],
			[5, 3, 'g', 'h', 'i'],
		]);
	});
});

describe('Test Google Sheets, trimToFirstEmptyRow', () => {
	it('should trimToFirstEmptyRow without row numbers', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			[3, 'g', 'h', 'i'],
		];

		const result = trimToFirstEmptyRow(data, false);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
		]);
	});
	it('should trimToFirstEmptyRow with row numbers', () => {
		const data = [
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[4, '', '', '', ''],
			[5, 3, 'g', 'h', 'i'],
		];

		const result = trimToFirstEmptyRow(data);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
		]);
	});
});

describe('Test Google Sheets, removeEmptyRows', () => {
	it('should removeEmptyRows without row numbers', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		];

		const result = removeEmptyRows(data, false);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['id', 'col1', 'col2', 'col3'],
			[0, 'A', 'B', 'C'],
			[2, 'd', 'e', 'f'],
		]);
	});
	it('should removeEmptyRows with row numbers', () => {
		const data = [
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[4, '', '', '', ''],
			[5, 3, 'g', 'h', 'i'],
		];

		const result = removeEmptyRows(data);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[5, 3, 'g', 'h', 'i'],
		]);
	});
});

describe('Test Google Sheets, trimLeadingEmptyRows', () => {
	it('should trimLeadingEmptyRows without row numbers', () => {
		const data = [
			['', '', '', ''],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		];

		const result = trimLeadingEmptyRows(data, false);

		expect(result).toBeDefined();
		expect(result).toEqual([
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		]);
	});
	it('should trimLeadingEmptyRows with row numbers', () => {
		const data = [
			[1, '', '', '', ''],
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[5, 3, 'g', 'h', 'i'],
		];

		const result = trimLeadingEmptyRows(data, true);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['row_number', 'id', 'col1', 'col2', 'col3'],
			[2, 0, 'A', 'B', 'C'],
			[3, 1, 'a', 'b', 'c'],
			[5, 3, 'g', 'h', 'i'],
		]);
	});
});

describe('Test Google Sheets, removeEmptyColumns', () => {
	it('should removeEmptyColumns without row numbers', () => {
		const data = [
			['id', 'col1', '', 'col3'],
			[0, 'A', '', 'C'],
			[1, 'a', '', 'c'],
			[2, 'd', '', 'f'],
			[3, 'g', '', 'i'],
		];

		const result = removeEmptyColumns(data);

		expect(result).toBeDefined();
		expect(result).toEqual([
			['id', 'col1', 'col3'],
			['', 'A', 'C'], // TODO:should be [0, 'A', 'C'] ?
			[1, 'a', 'c'],
			[2, 'd', 'f'],
			[3, 'g', 'i'],
		]);
	});
});

describe('Test Google Sheets, prepareSheetData', () => {
	it('should prepareSheetData without row numbers', () => {
		const data = [
			['id', 'col1', 'col2', 'col3'],
			[1, 'A', 'B', 'C'],
			['', '', '', ''],
			[2, 'd', 'e', 'f'],
			['', '', '', ''],
		];

		const result = prepareSheetData(data, { rangeDefinition: 'detectAutomatically' }, true);

		expect(result).toBeDefined();
		expect(result).toEqual({
			data: [
				['row_number', 'id', 'col1', 'col2', 'col3'],
				[2, 1, 'A', 'B', 'C'],
				[4, 2, 'd', 'e', 'f'],
			],
			firstDataRow: 1,
			headerRow: 0,
		});
	});
});
