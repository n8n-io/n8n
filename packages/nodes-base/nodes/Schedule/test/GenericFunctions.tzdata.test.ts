import moment from 'moment-timezone';

import { recurrenceCheck } from '../GenericFunctions';

// Unlike GenericFunctions.test.ts, this file uses the real bundled moment-timezone
// data: recurrenceCheck reads the wall clock through moment.tz, while the cron job
// that invokes it fires on Luxon/ICU time. If the two data sets disagree, interval
// rules skip or double-fire.
//
// British Columbia (2026b), Alberta (2026c) and the Northwest Territories (2026d)
// stop observing DST after 2026-11-01 and stay on UTC-7, UTC-6 and UTC-6.
describe('moment-timezone data', () => {
	const winter = '2026-12-01T12:00:00Z';

	it.each([
		['America/Vancouver', '-07:00'],
		['America/Edmonton', '-06:00'],
		['America/Inuvik', '-06:00'],
		['America/Toronto', '-05:00'],
	])('resolves %s to %s in December 2026', (zone, offset) => {
		expect(moment.tz(winter, zone).format('Z')).toBe(offset);
	});
});

describe('recurrenceCheck across the 2026 British Columbia time change', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires every 2 days at local midnight without skipping 2026-11-02', () => {
		const timezone = 'America/Vancouver';
		const recurrence = {
			activated: true,
			index: 0,
			intervalSize: 2,
			typeInterval: 'days',
		} as const;
		const recurrenceRules: number[] = [];

		// Cron fires daily at 00:00 local; UTC-7 on both sides of 2026-11-01.
		const fired: string[] = [];
		for (let day = 27; day <= 37; day++) {
			const tick = new Date(Date.UTC(2026, 9, day, 7, 0, 0));
			vi.useFakeTimers({ now: tick });
			if (recurrenceCheck(recurrence, recurrenceRules, timezone)) {
				fired.push(moment.tz(tick, timezone).format('YYYY-MM-DD'));
			}
		}

		expect(fired).toEqual([
			'2026-10-27',
			'2026-10-29',
			'2026-10-31',
			'2026-11-02',
			'2026-11-04',
			'2026-11-06',
		]);
	});
});
