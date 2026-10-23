import { DateTime } from 'luxon';

import { formatOdooDateFields, hasDateCandidate } from '../../../v2/helpers/utils';
import type { OdooFieldSchema } from '../../../v2/helpers/utils';

describe('formatOdooDateFields', () => {
	const schema: OdooFieldSchema = {
		start: { type: 'datetime' },
		stop: { type: 'datetime' },
		date_deadline: { type: 'date' },
		name: { type: 'char' },
		amount: { type: 'float' },
	};

	it('converts ISO 8601 datetime with positive offset to UTC Odoo format', () => {
		const result = formatOdooDateFields({ start: '2026-07-14T12:00:00.000+02:00' }, schema);
		expect(result.start).toBe('2026-07-14 10:00:00');
	});

	it('converts ISO 8601 datetime with Z suffix to UTC Odoo format', () => {
		const result = formatOdooDateFields({ stop: '2026-07-14T08:30:00.000Z' }, schema);
		expect(result.stop).toBe('2026-07-14 08:30:00');
	});

	it('converts ISO 8601 datetime with negative offset', () => {
		const result = formatOdooDateFields({ start: '2026-07-14T12:00:00.000-05:00' }, schema);
		expect(result.start).toBe('2026-07-14 17:00:00');
	});

	it('converts ISO 8601 date field to YYYY-MM-DD', () => {
		const result = formatOdooDateFields({ date_deadline: '2026-07-14T00:00:00.000Z' }, schema);
		expect(result.date_deadline).toBe('2026-07-14');
	});

	it('preserves date component for positive UTC offset without day-shift', () => {
		const result = formatOdooDateFields({ date_deadline: '2026-07-14T00:30:00.000+05:30' }, schema);
		expect(result.date_deadline).toBe('2026-07-14');
	});

	it('converts timezone-less ISO datetime without host timezone shift', () => {
		const result = formatOdooDateFields({ start: '2026-07-14T12:00:00.000' }, schema);
		expect(result.start).toBe('2026-07-14 12:00:00');
	});

	it('leaves values already in Odoo datetime format unchanged', () => {
		const result = formatOdooDateFields({ start: '2026-07-14 12:00:00' }, schema);
		expect(result.start).toBe('2026-07-14 12:00:00');
	});

	it('leaves values already in Odoo date format unchanged', () => {
		const result = formatOdooDateFields({ date_deadline: '2026-07-14' }, schema);
		expect(result.date_deadline).toBe('2026-07-14');
	});

	it('leaves non-datetime fields unchanged', () => {
		const result = formatOdooDateFields({ name: 'Meeting', amount: 99.5 }, schema);
		expect(result.name).toBe('Meeting');
		expect(result.amount).toBe(99.5);
	});

	it('does not convert a field not present in schema', () => {
		const result = formatOdooDateFields({ unknown_field: '2026-07-14T12:00:00.000Z' }, schema);
		expect(result.unknown_field).toBe('2026-07-14T12:00:00.000Z');
	});

	it('skips invalid date strings without throwing', () => {
		const result = formatOdooDateFields({ start: '2026-07-14Tnot-a-date' }, schema);
		expect(result.start).toBe('2026-07-14Tnot-a-date');
	});

	it('handles multiple fields in a single call', () => {
		const result = formatOdooDateFields(
			{
				start: '2026-07-14T10:00:00.000Z',
				stop: '2026-07-14T11:00:00.000Z',
				name: 'Sync call',
			},
			schema,
		);
		expect(result.start).toBe('2026-07-14 10:00:00');
		expect(result.stop).toBe('2026-07-14 11:00:00');
		expect(result.name).toBe('Sync call');
	});

	describe('DateTime and Date values', () => {
		it('converts a Luxon DateTime with an offset to UTC Odoo datetime format', () => {
			const start = DateTime.fromISO('2026-07-14T12:00:00.000+02:00', { setZone: true });
			const result = formatOdooDateFields({ start }, schema);
			expect(result.start).toBe('2026-07-14 10:00:00');
		});

		it('converts a Luxon DateTime to a date in its own zone without a day shift', () => {
			const deadline = DateTime.fromISO('2026-07-14T00:30:00.000+05:30', { setZone: true });
			const result = formatOdooDateFields({ date_deadline: deadline }, schema);
			expect(result.date_deadline).toBe('2026-07-14');
		});

		it('converts a JS Date to UTC Odoo datetime format', () => {
			const result = formatOdooDateFields({ start: new Date('2026-07-14T08:30:00.000Z') }, schema);
			expect(result.start).toBe('2026-07-14 08:30:00');
		});

		it('leaves an invalid JS Date unchanged', () => {
			const invalid = new Date('not a date');
			const result = formatOdooDateFields({ start: invalid }, schema);
			expect(result.start).toBe(invalid);
		});

		it('leaves an invalid DateTime unchanged', () => {
			const invalid = DateTime.invalid('test');
			const result = formatOdooDateFields({ start: invalid }, schema);
			expect(result.start).toBe(invalid);
		});

		it('does not convert a DateTime in a non-date field', () => {
			const value = DateTime.fromISO('2026-07-14T12:00:00.000Z');
			const result = formatOdooDateFields({ name: value }, schema);
			expect(result.name).toBe(value);
		});
	});

	it('does not mutate the original fields object', () => {
		const fields = { start: '2026-07-14T12:00:00.000+02:00' };
		formatOdooDateFields(fields, schema);
		expect(fields.start).toBe('2026-07-14T12:00:00.000+02:00');
	});
});

describe('hasDateCandidate', () => {
	it('returns true for a Luxon DateTime, a JS Date or an ISO 8601 string', () => {
		expect(hasDateCandidate({ start: DateTime.fromISO('2026-07-14T12:00:00Z') })).toBe(true);
		expect(hasDateCandidate({ start: new Date('2026-07-14T12:00:00Z') })).toBe(true);
		expect(hasDateCandidate({ start: '2026-07-14T12:00:00' })).toBe(true);
	});

	it('returns false when no value needs date conversion', () => {
		expect(
			hasDateCandidate({
				name: 'Acme Corp',
				amount: 10,
				date: '2026-07-14',
				datetime: '2026-07-14 12:00:00',
				invalid: new Date('not a date'),
			}),
		).toBe(false);
	});
});
