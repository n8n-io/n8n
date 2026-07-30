import pgPromise from 'pg-promise';

import { getDateAsStringTypeParsers, parseDateToISO } from './postgres';

const NUMERIC_TYPE_ID = 1700;
const OTHER_TYPE_ID = 23; // int4

describe('parseDateToISO', () => {
	it('should convert a UTC timestamp string to an ISO string', () => {
		expect(parseDateToISO('2020-01-01 12:00:00+00')).toBe('2020-01-01T12:00:00.000Z');
	});

	it('should normalize a timezone-qualified string to an ISO string', () => {
		expect(parseDateToISO('2020-01-01T05:30:00+05:30')).toBe('2020-01-01T00:00:00.000Z');
	});

	it('should return the original value when the date is invalid', () => {
		expect(parseDateToISO('not-a-date')).toBe('not-a-date');
	});

	it('should return the original value for an empty string', () => {
		expect(parseDateToISO('')).toBe('');
	});
});

describe('getDateAsStringTypeParsers', () => {
	const pgp = pgPromise({ noWarnings: true });
	const { builtins } = pgp.pg.types;
	const DATE_ARRAY_TYPE_ID = 1182;
	const TIMESTAMP_ARRAY_TYPE_ID = 1115;

	const parse = (oid: number, value: string) =>
		getDateAsStringTypeParsers(pgp).getTypeParser(oid, 'text')(value);

	it('should keep DATE columns as their raw YYYY-MM-DD string', () => {
		expect(parse(builtins.DATE, '2020-01-01')).toBe('2020-01-01');
	});

	it('should normalize TIMESTAMP and TIMESTAMPTZ columns to ISO strings', () => {
		expect(parse(builtins.TIMESTAMP, '2020-01-01 12:00:00')).toBe(
			new Date('2020-01-01 12:00:00').toISOString(),
		);
		expect(parse(builtins.TIMESTAMPTZ, '2020-01-01 12:00:00+00')).toBe('2020-01-01T12:00:00.000Z');
	});

	it('should return date array elements as strings', () => {
		expect(parse(DATE_ARRAY_TYPE_ID, '{2020-01-01,2020-01-02}')).toEqual([
			'2020-01-01',
			'2020-01-02',
		]);
	});

	it('should return timestamp array elements as ISO strings', () => {
		expect(parse(TIMESTAMP_ARRAY_TYPE_ID, '{"2020-01-01 12:00:00"}')).toEqual([
			new Date('2020-01-01 12:00:00').toISOString(),
		]);
	});

	it('should delegate non-date types to the default parser', () => {
		// int4 default parser returns a JS number
		expect(parse(OTHER_TYPE_ID, '42')).toBe(42);
		// numeric default parser preserves precision as a string
		expect(parse(NUMERIC_TYPE_ID, '99.99')).toBe('99.99');
	});
});
