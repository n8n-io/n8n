import { icsCalendarToObject } from 'ts-ics';
import type { VCalendar } from 'ts-ics';

export function parseIcsCalendar(calendarString: string): VCalendar {
	// ts-ics < 2.4.5 does not parse date-only RRULE UNTIL values. Remove this after upgrading.
	const normalizedCalendar = calendarString.replace(
		/(^|\r?\n)(RRULE[^\r\n]*?\bUNTIL=)(\d{8})(?=;|\r?\n|$)/g,
		'$1$2$3T000000Z',
	);
	return icsCalendarToObject(normalizedCalendar);
}
