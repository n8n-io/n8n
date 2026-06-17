import { parseToTimestamp } from '../../V2/utils/parseToTimestamp';

describe('parseToTimestamp', () => {
	it('should convert a valid date string to a UTC Unix timestamp', () => {
		const dateString = '2023-10-05T14:48:00Z';
		const expectedTimestamp = 1696517280000;
		expect(parseToTimestamp(dateString)).toBe(expectedTimestamp);
	});

	it('should throw an error for an invalid date string', () => {
		const invalidDateString = 'invalid-date';
		expect(() => parseToTimestamp(invalidDateString)).toThrow('Invalid date string');
	});

	it('should throw an error when input is not a string', () => {
		const invalidDateString = 1234567890;
		expect(() => parseToTimestamp(invalidDateString)).toThrow('Invalid date string');
	});
});
