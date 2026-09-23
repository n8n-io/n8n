import { parseFilterProperties } from '../GenericFunctions';

describe('Grist parseFilterProperties', () => {
	it('auto-detects a numeric-looking value as a number by default (back-compat)', () => {
		expect(parseFilterProperties([{ field: 'Amount', values: '123' }])).toEqual({
			Amount: [123],
		});
	});

	it('auto-detects a non-numeric value as a string', () => {
		expect(parseFilterProperties([{ field: 'Name', values: 'abc' }])).toEqual({
			Name: ['abc'],
		});
	});

	it('keeps a numeric-looking value as a string when type is explicitly "string"', () => {
		// Regression for https://github.com/n8n-io/n8n/issues/39323: filtering a Grist text
		// column whose values happen to look numeric ("123") previously always coerced to a
		// number, which never matched Grist's string-typed cell and returned no rows.
		expect(
			parseFilterProperties([{ field: 'Code', values: '123', type: 'string' }]),
		).toEqual({
			Code: ['123'],
		});
	});

	it('coerces to a number when type is explicitly "number", even for values autoDetect would keep as a string', () => {
		expect(parseFilterProperties([{ field: 'Id', values: '007', type: 'number' }])).toEqual({
			Id: [7],
		});
	});

	it('treats an explicit "autoDetect" type the same as omitting the field', () => {
		expect(
			parseFilterProperties([{ field: 'Amount', values: '123', type: 'autoDetect' }]),
		).toEqual({
			Amount: [123],
		});
	});

	it('groups multiple filter rows for the same field into one array', () => {
		expect(
			parseFilterProperties([
				{ field: 'Status', values: 'open' },
				{ field: 'Status', values: 'pending' },
			]),
		).toEqual({
			Status: ['open', 'pending'],
		});
	});
});
