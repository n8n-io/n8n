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

describe('Google Calendar -> addNextOccurrence', () => {
	it('should correctly add next occurrence and split time component', () => {
		const mockEvent = {
			start: {
				dateTime: '2023-09-07T09:30:00+02:00',
				timeZone: 'Europe/Berlin',
			},
			end: {
				dateTime: '2023-09-07T11:00:00+02:00',
				timeZone: 'Europe/Berlin',
			},
			recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=TH'],
		};

		const result = addNextOccurrence([mockEvent]);

		expect(result[0].nextOccurrence).toBeDefined();
		expect(result[0].nextOccurrence.start.dateTime.split('T')[1]).toBe('09:30:00+02:00');
	});

	it('should handle events without recurrence', () => {
		const mockEventNoRecurrence = {
			start: {
				dateTime: '2023-09-07T09:30:00+02:00',
				timeZone: 'Europe/Berlin',
			},
			end: {
				dateTime: '2023-09-07T11:00:00+02:00',
				timeZone: 'Europe/Berlin',
			},
			recurrence: [],
		};

		const result = addNextOccurrence([mockEventNoRecurrence]);
		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should handle events with invalid recurrence rules', () => {
		const mockEventInvalidRecurrence = {
			start: {
				dateTime: '2023-09-07T09:30:00+02:00',
				timeZone: 'Europe/Berlin',
			},
			end: {
				dateTime: '2023-09-07T11:00:00+02:00',
				timeZone: 'Europe/Berlin',
			},
			recurrence: ['INVALID_RRULE'],
		};

		const result = addNextOccurrence([mockEventInvalidRecurrence]);
		expect(result[0].nextOccurrence).toBeUndefined();
	});
});
