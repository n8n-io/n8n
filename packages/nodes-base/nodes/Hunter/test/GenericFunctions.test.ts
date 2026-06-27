import { toMultiOptionsCsv } from '../GenericFunctions';

describe('Hunter > GenericFunctions', () => {
	describe('toMultiOptionsCsv', () => {
		it('joins array values', () => {
			expect(toMultiOptionsCsv(['junior', 'senior'])).toBe('junior,senior');
		});

		it('trims entries inside an array (interpolated array elements)', () => {
			expect(toMultiOptionsCsv(['junior ', ' senior'])).toBe('junior,senior');
		});

		it('coerces non-string array entries via String()', () => {
			expect(toMultiOptionsCsv([1, 2, 3])).toBe('1,2,3');
		});

		it('accepts a comma-joined string (the whitespace-expression coercion case)', () => {
			expect(toMultiOptionsCsv('junior,senior')).toBe('junior,senior');
		});

		it('trims whitespace around each entry in a comma-string', () => {
			expect(toMultiOptionsCsv(' junior , senior ')).toBe('junior,senior');
		});

		it('drops empty entries from an array', () => {
			expect(toMultiOptionsCsv(['junior', '', '  ', 'senior'])).toBe('junior,senior');
		});

		it('drops empty entries from a string', () => {
			expect(toMultiOptionsCsv('junior,,senior')).toBe('junior,senior');
		});

		it('returns an empty string for an empty array', () => {
			expect(toMultiOptionsCsv([])).toBe('');
		});

		it('returns an empty string for an empty string', () => {
			expect(toMultiOptionsCsv('')).toBe('');
		});

		it('returns an empty string for non-string non-array values', () => {
			expect(toMultiOptionsCsv(undefined)).toBe('');
			expect(toMultiOptionsCsv(null)).toBe('');
		});
	});
});
