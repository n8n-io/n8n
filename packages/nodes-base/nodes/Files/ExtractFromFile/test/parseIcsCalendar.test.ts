import { parseIcsCalendar } from '../actions/parseIcsCalendar';

describe('parseIcsCalendar', () => {
	it('parses date-only RRULE UNTIL values', () => {
		const calendar = parseIcsCalendar(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n test//EN
BEGIN:VEVENT
UID:mDceAWXluoi-MADvoh-u2SFjv3jv@proton.me
DTSTAMP:20250915T225621Z
SUMMARY:test recurring
DTSTART;VALUE=DATE:20250917
DTEND;VALUE=DATE:20250918
SEQUENCE:1
RRULE:FREQ=WEEKLY;UNTIL=20250926
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`);

		const until = calendar.events?.[0]?.recurrenceRule?.until?.date;

		expect(until).toBeInstanceOf(Date);
		expect(until?.toISOString()).toBe('2025-09-26T00:00:00.000Z');
	});

	it('keeps date-time RRULE UNTIL values valid', () => {
		const calendar = parseIcsCalendar(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n test//EN
BEGIN:VEVENT
UID:test
DTSTAMP:20250915T225621Z
SUMMARY:test recurring
DTSTART:20250917T100000Z
DTEND:20250917T110000Z
RRULE:FREQ=WEEKLY;UNTIL=20250926T120000Z
END:VEVENT
END:VCALENDAR`);

		const until = calendar.events?.[0]?.recurrenceRule?.until?.date;

		expect(until).toBeInstanceOf(Date);
		expect(until?.toISOString()).toBe('2025-09-26T12:00:00.000Z');
	});
});
