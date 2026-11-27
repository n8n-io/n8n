import { parseFilterProperties } from '../GenericFunctions';

describe('Grist parseFilterProperties', () => {
	it('sends a numeric-looking value as both a string and a number', () => {
		expect(parseFilterProperties([{ field: 'zip', values: '12345' }])).toEqual({
			zip: ['12345', 12345],
		});
	});

	it('keeps leading zeros in the string form', () => {
		expect(parseFilterProperties([{ field: 'zip', values: '00123' }])).toEqual({
			zip: ['00123', 123],
		});
	});

	it('sends a non-numeric value only as a string', () => {
		expect(parseFilterProperties([{ field: 'zip', values: 'A1234' }])).toEqual({
			zip: ['A1234'],
		});
	});

	it.each(['', ' '])('sends the blank value %j only as a string', (values) => {
		expect(parseFilterProperties([{ field: 'zip', values }])).toEqual({ zip: [values] });
	});

	it('sends a value outside the safe integer range only as a string', () => {
		expect(parseFilterProperties([{ field: 'id', values: '99999999999999999999' }])).toEqual({
			id: ['99999999999999999999'],
		});
	});

	it('accepts a number from an expression', () => {
		const values = 12345 as unknown as string;
		expect(parseFilterProperties([{ field: 'zip', values }])).toEqual({ zip: ['12345', 12345] });
	});

	it('groups filter rows for the same field', () => {
		expect(
			parseFilterProperties([
				{ field: 'zip', values: '12345' },
				{ field: 'zip', values: 'A1234' },
			]),
		).toEqual({ zip: ['12345', 12345, 'A1234'] });
	});

	it('stores a field named __proto__ as a normal key', () => {
		expect(JSON.stringify(parseFilterProperties([{ field: '__proto__', values: 'x' }]))).toBe(
			'{"__proto__":["x"]}',
		);
	});
});
