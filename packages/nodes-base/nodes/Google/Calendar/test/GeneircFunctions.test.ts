import { addTimezoneToDate } from '../GenericFunctions';

describe('addTimezoneToDate', () => {
	it('should add timezone to date', () => {
		const dateWithTimezone = '2021-09-01T12:00:00.000Z';
		const result1 = addTimezoneToDate(dateWithTimezone);
		expect(result1).toBe('2021-09-01T12:00:00.000Z');

		const dateWithoutTimezone = '2021-09-01T12:00:00';
		const result2 = addTimezoneToDate(dateWithoutTimezone);
		expect(result2).toBe('2021-09-01T09:00:00.000Z');

		const dateWithDifferentTimezone = '2021-09-01T12:00:00.000+08:00';
		const result3 = addTimezoneToDate(dateWithDifferentTimezone);
		expect(result3).toBe('2021-09-01T04:00:00.000Z');
	});
});
