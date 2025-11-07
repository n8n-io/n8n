import { evaluate } from './helpers';

describe('Data Transformation Functions', () => {
	describe('Genric Data Transformation Functions', () => {
		test('.isEmpty() should work correctly on undefined', () => {
			expect(evaluate('={{(undefined).isEmpty()}}')).toEqual(true);
		});
	});
});
