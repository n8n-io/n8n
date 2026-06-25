import { toMultiOptionsCsv } from '../GenericFunctions';

describe('Zulip > GenericFunctions', () => {
	describe('toMultiOptionsCsv', () => {
		it('joins array values', () => {
			expect(toMultiOptionsCsv(['user1@example.com', 'user2@example.com'])).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('trims entries inside an array (interpolated array elements)', () => {
			expect(toMultiOptionsCsv(['user1@example.com ', ' user2@example.com'])).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('coerces non-string array entries via String()', () => {
			expect(toMultiOptionsCsv([1, 2, 3])).toBe('1,2,3');
		});

		it('accepts a comma-joined string (the whitespace-expression coercion case)', () => {
			expect(toMultiOptionsCsv('user1@example.com,user2@example.com ')).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('trims whitespace around each entry in a comma-string', () => {
			expect(toMultiOptionsCsv(' user1@example.com , user2@example.com ')).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('drops empty entries', () => {
			expect(toMultiOptionsCsv(['user1@example.com', '', '  ', 'user2@example.com'])).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('returns an empty string for undefined/null/empty values', () => {
			expect(toMultiOptionsCsv(undefined)).toBe('');
			expect(toMultiOptionsCsv(null)).toBe('');
			expect(toMultiOptionsCsv('')).toBe('');
			expect(toMultiOptionsCsv([])).toBe('');
		});
	});
});
