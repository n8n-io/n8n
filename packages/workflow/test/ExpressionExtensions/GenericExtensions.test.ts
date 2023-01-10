import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Genric Data Transformation Functions', () => {
		test('.isBlank() should work correctly on undefined', () => {
			expect(evaluate('={{(undefined).isBlank()}}')).toEqual(true);
		});
	});
});
