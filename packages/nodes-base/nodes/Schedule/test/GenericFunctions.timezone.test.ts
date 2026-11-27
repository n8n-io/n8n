import moment from 'moment-timezone';

import { recurrenceCheck } from '../GenericFunctions';

// This file uses the real time zone data of moment-timezone.
// GenericFunctions.test.ts mocks the module.
describe('recurrenceCheck with real time zone data', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	// These zones keep their summer UTC offset from 2026-11-01.
	it.each([
		['America/Vancouver', '-07:00'],
		['America/Edmonton', '-06:00'],
		['America/Inuvik', '-06:00'],
		['America/Winnipeg', '-05:00'],
	])('should resolve %s to UTC%s after 2026-11-01', (timezone, offset) => {
		expect(moment.tz('2026-12-01T12:00:00Z', timezone).format('Z')).toBe(offset);
	});

	it('should keep a 2-day interval across 2026-11-01 in America/Vancouver', () => {
		vi.useFakeTimers();
		const recurrenceRules: Array<number | undefined> = [];
		// Midnight in America/Vancouver is 07:00 UTC on each day from 2026-10-27 to 2026-11-06.
		const midnights = Array.from({ length: 11 }, (_, i) => new Date(Date.UTC(2026, 9, 27 + i, 7)));

		const firedOn = midnights
			.filter((midnight) => {
				vi.setSystemTime(midnight);
				return recurrenceCheck(
					{ activated: true, index: 0, intervalSize: 2, typeInterval: 'days' },
					recurrenceRules,
					'America/Vancouver',
				);
			})
			.map((midnight) => midnight.toISOString().slice(0, 10));

		expect(firedOn).toEqual([
			'2026-10-27',
			'2026-10-29',
			'2026-10-31',
			'2026-11-02',
			'2026-11-04',
			'2026-11-06',
		]);
	});
});
