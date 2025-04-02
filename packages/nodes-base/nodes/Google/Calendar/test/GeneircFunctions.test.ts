import { DateTime } from 'luxon';

import type { RecurringEventInstance } from '../EventInterface';
import { addTimezoneToDate, dateObjectToISO, eventExtendYearIntoFuture } from '../GenericFunctions';

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

describe('dateObjectToISO', () => {
	test('should return ISO string for DateTime instance', () => {
		const mockDateTime = DateTime.fromISO('2025-01-07T12:00:00');
		const result = dateObjectToISO(mockDateTime);
		expect(result).toBe('2025-01-07T12:00:00.000+00:00');
	});

	test('should return ISO string for Date instance', () => {
		const mockDate = new Date('2025-01-07T12:00:00Z');
		const result = dateObjectToISO(mockDate);
		expect(result).toBe('2025-01-07T12:00:00.000Z');
	});

	test('should return string when input is not a DateTime or Date instance', () => {
		const inputString = '2025-01-07T12:00:00';
		const result = dateObjectToISO(inputString);
		expect(result).toBe(inputString);
	});
});

describe('eventExtendYearIntoFuture', () => {
	const timezone = 'UTC';

	it('should return true if any event extends into the next year', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: '2026-01-01T00:00:00Z', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(true);
	});

	it('should return false if no event extends into the next year', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: '2025-12-31T23:59:59Z', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(false);
	});

	it('should return false for invalid event start dates', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: 'invalid-date', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(false);
	});

	it('should return false for events without a recurringEventId', () => {
		const events = [
			{
				recurringEventId: null,
				start: { dateTime: '2025-01-01T00:00:00Z', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(false);
	});

	it('should handle events with only a date and no time', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: null, date: '2026-01-01' },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(true);
	});
});
