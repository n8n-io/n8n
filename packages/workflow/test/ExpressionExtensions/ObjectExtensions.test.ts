import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Object Data Transformation Functions', () => {
		test('.isEmpty() should work correctly on an empty object', () => {
			expect(evaluate('={{({}).isEmpty()}}')).toEqual(true);
		});
	});
});
