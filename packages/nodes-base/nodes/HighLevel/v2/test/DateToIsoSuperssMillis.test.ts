import { dateToIsoSupressMillis } from '../GenericFunctions';

describe('dateToIsoSupressMillis', () => {
	it('should return an ISO string without milliseconds (UTC)', () => {
		const dateTime = '2024-12-25T10:15:30.123Z';
		const result = dateToIsoSupressMillis(dateTime);
		expect(result).toBe('2024-12-25T10:15:30.123+00:00');
	});

	it('should handle dates without milliseconds correctly', () => {
		const dateTime = '2024-12-25T10:15:30Z';
		const result = dateToIsoSupressMillis(dateTime);
		expect(result).toBe('2024-12-25T10:15:30+00:00');
	});

	it('should handle time zone offsets correctly', () => {
		const dateTime = '2024-12-25T10:15:30.123+02:00';
		const result = dateToIsoSupressMillis(dateTime);
		expect(result).toBe('2024-12-25T08:15:30.123+00:00');
	});

	it('should handle edge case for empty input', () => {
		const dateTime = '';
		const result = dateToIsoSupressMillis(dateTime);
		expect(result).toBeNull();
	});

	it('should handle edge case for null input', () => {
		const dateTime = null as unknown as string;
		const result = dateToIsoSupressMillis(dateTime);
		expect(result).toBeNull();
	});
});
