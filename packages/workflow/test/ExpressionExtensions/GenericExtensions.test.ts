import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Generic Data Transformation Functions', () => {
		test('.isEmpty() should work correctly on undefined', () => {
			expect(evaluate('={{(undefined).isEmpty()}}')).toEqual(true);
		});
	});
});
