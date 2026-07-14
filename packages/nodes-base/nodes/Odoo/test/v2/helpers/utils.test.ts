import { formatOdooDateFields } from '../../../v2/helpers/utils';
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

	it('does not mutate the original fields object', () => {
		const fields = { start: '2026-07-14T12:00:00.000+02:00' };
		formatOdooDateFields(fields, schema);
		expect(fields.start).toBe('2026-07-14T12:00:00.000+02:00');
	});
});
