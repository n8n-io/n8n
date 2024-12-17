import { addTimezoneToDate } from '../GenericFunctions';

describe('addTimezoneToDate', () => {
	it('should add timezone to date', () => {
		const dateWithTimezone = '2021-09-01T12:00:00.000Z';
		const result1 = addTimezoneToDate(dateWithTimezone, 'Europe/Prague');
		expect(result1).toBe('2021-09-01T12:00:00.000Z');

		const dateWithoutTimezone = '2021-09-01T12:00:00';
		const result2 = addTimezoneToDate(dateWithoutTimezone, 'Europe/Prague');
		expect(result2).toBe('2021-09-01T10:00:00Z');

		const result3 = addTimezoneToDate(dateWithoutTimezone, 'Asia/Tokyo');
		expect(result3).toBe('2021-09-01T03:00:00Z');

		const dateWithDifferentTimezone = '2021-09-01T12:00:00.000+08:00';
		const result4 = addTimezoneToDate(dateWithDifferentTimezone, 'Europe/Prague');
		expect(result4).toBe('2021-09-01T12:00:00.000+08:00');
	});
});
