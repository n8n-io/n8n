import moment from 'moment-timezone';

import type { RecurrentEvent } from '../GenericFunctions';
import { addNextOccurrence } from '../GenericFunctions';

const mockNow = '2024-09-06T16:30:00+03:00';
jest.spyOn(global.Date, 'now').mockImplementation(() => moment(mockNow).valueOf());

describe('addNextOccurrence', () => {
	it('should not modify event if no recurrence exists', () => {
		const event: RecurrentEvent[] = [
			{
				start: {
					dateTime: '2024-09-01T08:00:00Z',
					timeZone: 'UTC',
				},
				end: {
					dateTime: '2024-09-01T09:00:00Z',
					timeZone: 'UTC',
				},
				recurrence: [],
			},
		];

		const result = addNextOccurrence(event);

		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should handle event with no RRULE correctly', () => {
		const event: RecurrentEvent[] = [
			{
				start: {
					dateTime: '2024-09-01T08:00:00Z',
					timeZone: 'UTC',
				},
				end: {
					dateTime: '2024-09-01T09:00:00Z',
					timeZone: 'UTC',
				},
				recurrence: ['FREQ=WEEKLY;COUNT=2'],
			},
		];

		const result = addNextOccurrence(event);

		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should ignore recurrence if until date is in the past', () => {
		const event: RecurrentEvent[] = [
			{
				start: {
					dateTime: '2024-08-01T08:00:00Z',
					timeZone: 'UTC',
				},
				end: {
					dateTime: '2024-08-01T09:00:00Z',
					timeZone: 'UTC',
				},
				recurrence: ['RRULE:FREQ=DAILY;UNTIL=20240805T000000Z'],
			},
		];

		const result = addNextOccurrence(event);

		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should handle errors gracefully without breaking and return unchanged event', () => {
		const event: RecurrentEvent[] = [
			{
				start: {
					dateTime: '2024-09-06T17:30:00+03:00',
					timeZone: 'Europe/Berlin',
				},
				end: {
					dateTime: '2024-09-06T18:00:00+03:00',
					timeZone: 'Europe/Berlin',
				},
				recurrence: ['xxxxx'],
			},
		];

		const result = addNextOccurrence(event);

		expect(result).toEqual(event);
	});
});
