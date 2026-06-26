import { parseFilterProperties } from '../GenericFunctions';

describe('Grist parseFilterProperties', () => {
	it('groups values by field, coercing safe integers', () => {
		const result = parseFilterProperties([
			{ field: 'Age', values: '30' },
			{ field: 'Age', values: '40' },
			{ field: 'Name', values: 'Ada' },
		]);

		expect(result).toEqual({ Age: [30, 40], Name: ['Ada'] });
	});

	it('ignores unsafe column names instead of polluting the prototype', () => {
		const result = parseFilterProperties([
			{ field: '__proto__', values: 'x' },
			{ field: 'constructor', values: 'y' },
			{ field: 'Email', values: 'a@b.c' },
		]);

		expect(result).toEqual({ Email: ['a@b.c'] });
		// Prototype chain is untouched.
		expect(({} as Record<string, unknown>).x).toBeUndefined();
		expect(Object.prototype).toEqual(Object.prototype);
	});
});
