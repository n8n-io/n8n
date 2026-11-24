import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pgPromise from 'pg-promise';

import type { DateTypeParserOptions } from './postgres';
import {
	getDateAsStringTypeParsers,
	getLegacyDateTypeParsers,
	parseDateToISO,
	parseTimestampToISO,
} from './postgres';

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

describe('parseTimestampToISO', () => {
	it.each([
		['2020-01-01 12:00:00', '2020-01-01T12:00:00'],
		['2026-07-15 14:30:00.123456', '2026-07-15T14:30:00.123456'],
		['2026-07-15 14:30:00.1', '2026-07-15T14:30:00.1'],
		['20262-07-15 14:30:00', '20262-07-15T14:30:00'],
	])('should join %s with a T and keep every digit', (wire, expected) => {
		expect(parseTimestampToISO(wire)).toBe(expected);
	});

	it.each([
		'infinity',
		'-infinity',
		'0044-03-15 00:00:00 BC',
		'2020-01-01 12:00:00+00',
		'not-a-timestamp',
		'',
	])('should return %s unchanged', (wire) => {
		expect(parseTimestampToISO(wire)).toBe(wire);
	});

	// Both expectations are literals, so they hold whatever zone the n8n process runs in
	it('should keep the reading the server sent, where the instant it replaces could not', () => {
		const wire = '2026-07-15 14:30:00.123456';

		expect(parseTimestampToISO(wire)).toBe('2026-07-15T14:30:00.123456');
		// The old reading truncates to milliseconds and claims a zone the column does not carry
		expect(parseDateToISO(wire)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});

	// A server on a non-ISO `DateStyle` still sends no offset, so the raw reading stays the truth
	it.each([
		['SQL, MDY', '07/15/2026 14:30:00.123456'],
		['SQL, DMY', '15/07/2026 14:30:00.123456'],
		['Postgres, MDY', 'Wed Jul 15 14:30:00.123456 2026'],
		['Postgres, DMY', 'Wed 15 Jul 14:30:00.123456 2026'],
		['German', '15.07.2026 14:30:00.123456'],
	])('should return a DateStyle %s timestamp unchanged', (_style, wire) => {
		expect(parseTimestampToISO(wire)).toBe(wire);
	});

	// These three change on purpose: `new Date()` recognised them and invented a zone for them
	it.each([
		['SQL, MDY', '07/15/2026 14:30:00.123456'],
		['Postgres, MDY', 'Wed Jul 15 14:30:00.123456 2026'],
		['Postgres, DMY', 'Wed 15 Jul 14:30:00.123456 2026'],
	])('should stop converting a DateStyle %s timestamp to an instant', (_style, wire) => {
		expect(parseDateToISO(wire)).toMatch(/Z$/);
		expect(parseTimestampToISO(wire)).toBe(wire);
	});
});

describe('getDateAsStringTypeParsers', () => {
	const pgp = pgPromise({ noWarnings: true });
	const { builtins } = pgp.pg.types;
	const DATE_ARRAY_TYPE_ID = 1182;
	const TIMESTAMP_ARRAY_TYPE_ID = 1115;

	const parse = (oid: number, value: string, options?: DateTypeParserOptions) =>
		getDateAsStringTypeParsers(pgp, options).getTypeParser(oid, 'text')(value);

	it('should keep DATE columns as their raw YYYY-MM-DD string', () => {
		expect(parse(builtins.DATE, '2020-01-01')).toBe('2020-01-01');
	});

	it('should return TIMESTAMP as ISO local time and TIMESTAMPTZ as a UTC instant', () => {
		expect(parse(builtins.TIMESTAMP, '2020-01-01 12:00:00.5')).toBe('2020-01-01T12:00:00.5');
		expect(parse(builtins.TIMESTAMPTZ, '2020-01-01 12:00:00+00')).toBe('2020-01-01T12:00:00.000Z');
	});

	it('should read TIMESTAMP as a UTC instant when legacyUtcTimestamps is on', () => {
		const options = { legacyUtcTimestamps: true };

		expect(parse(builtins.TIMESTAMP, '2020-01-01 12:00:00+00', options)).toBe(
			'2020-01-01T12:00:00.000Z',
		);
		expect(parse(TIMESTAMP_ARRAY_TYPE_ID, '{"2020-01-01 12:00:00+00"}', options)).toEqual([
			'2020-01-01T12:00:00.000Z',
		]);
	});

	it('should return date array elements as strings', () => {
		expect(parse(DATE_ARRAY_TYPE_ID, '{2020-01-01,2020-01-02}')).toEqual([
			'2020-01-01',
			'2020-01-02',
		]);
	});

	it('should return timestamp array elements as ISO local time', () => {
		expect(parse(TIMESTAMP_ARRAY_TYPE_ID, '{"2020-01-01 12:00:00.5"}')).toEqual([
			'2020-01-01T12:00:00.5',
		]);
	});

	it('should delegate non-date types to the default parser', () => {
		// int4 default parser returns a JS number
		expect(parse(OTHER_TYPE_ID, '42')).toBe(42);
		// numeric default parser preserves precision as a string
		expect(parse(NUMERIC_TYPE_ID, '99.99')).toBe('99.99');
	});

	it('should not change the global pg-types parsers', () => {
		const globalTimestamptz = pgp.pg.types.getTypeParser(builtins.TIMESTAMPTZ, 'text');
		const globalDate = pgp.pg.types.getTypeParser(builtins.DATE, 'text');

		getDateAsStringTypeParsers(pgp).setTypeParser(builtins.TIMESTAMPTZ, (value) => value);

		expect(pgp.pg.types.getTypeParser(builtins.TIMESTAMPTZ, 'text')).toBe(globalTimestamptz);
		expect(pgp.pg.types.getTypeParser(builtins.DATE, 'text')).toBe(globalDate);
	});
});

describe('getLegacyDateTypeParsers', () => {
	const pgp = pgPromise({ noWarnings: true });
	const { builtins } = pgp.pg.types;
	const DATE_ARRAY_TYPE_ID = 1182;
	const TIMESTAMPTZ_ARRAY_TYPE_ID = 1185;

	const parse = (oid: number, value: string) =>
		getLegacyDateTypeParsers(pgp).getTypeParser(oid, 'text')(value);

	it('should still read TIMESTAMP and TIMESTAMPTZ as UTC instants', () => {
		expect(parse(builtins.TIMESTAMP, '2020-01-01 12:00:00+00')).toBe('2020-01-01T12:00:00.000Z');
		expect(parse(builtins.TIMESTAMPTZ, '2020-01-01 12:00:00+00')).toBe('2020-01-01T12:00:00.000Z');
	});

	it('should still read a zoneless TIMESTAMP as a local wall clock', () => {
		const parsed = parse(builtins.TIMESTAMP, '2020-01-01 12:00:00');

		// Asserted through the clock rather than as a literal, because the instant
		// this produces depends on the zone the test machine runs in. That dependence
		// is the behaviour this PR removes everywhere except here.
		expect(parsed.endsWith('Z')).toBe(true);
		expect(new Date(parsed).getHours()).toBe(12);
	});

	it('should keep returning Date objects for DATE columns', () => {
		const result = parse(builtins.DATE, '2020-01-01');

		expect(result).toBeInstanceOf(Date);
		expect(result).toEqual(pgp.pg.types.getTypeParser(builtins.DATE, 'text')('2020-01-01'));
	});

	it('should keep the default parser for date and timestamp array columns', () => {
		// Array OIDs are not part of the pg-types `TypeId` enum
		const defaultParse = (oid: number, value: string) =>
			pgp.pg.types.getTypeParser(oid as never, 'text')(value);

		expect(parse(DATE_ARRAY_TYPE_ID, '{2020-01-01}')).toEqual(
			defaultParse(DATE_ARRAY_TYPE_ID, '{2020-01-01}'),
		);
		expect(parse(TIMESTAMPTZ_ARRAY_TYPE_ID, '{"2020-01-01 12:00:00+00"}')).toEqual(
			defaultParse(TIMESTAMPTZ_ARRAY_TYPE_ID, '{"2020-01-01 12:00:00+00"}'),
		);
	});

	it('should delegate non-date types to the default parser', () => {
		expect(parse(OTHER_TYPE_ID, '42')).toBe(42);
		expect(parse(NUMERIC_TYPE_ID, '99.99')).toBe('99.99');
	});

	it('should delegate binary format lookups to the default parser', () => {
		const parsers = getLegacyDateTypeParsers(pgp);

		expect(parsers.getTypeParser(builtins.TIMESTAMPTZ, 'binary')).toBe(
			pgp.pg.types.getTypeParser(builtins.TIMESTAMPTZ, 'binary'),
		);
	});

	it('should not change the global pg-types parsers', () => {
		const globalTimestamp = pgp.pg.types.getTypeParser(builtins.TIMESTAMP, 'text');
		const globalTimestamptz = pgp.pg.types.getTypeParser(builtins.TIMESTAMPTZ, 'text');

		const parsers = getLegacyDateTypeParsers(pgp);
		parsers.setTypeParser(builtins.TIMESTAMPTZ, (value) => value);

		expect(pgp.pg.types.getTypeParser(builtins.TIMESTAMP, 'text')).toBe(globalTimestamp);
		expect(pgp.pg.types.getTypeParser(builtins.TIMESTAMPTZ, 'text')).toBe(globalTimestamptz);
		// The global parser must still return a live Date, as n8n's own DB connections expect
		expect(globalTimestamptz('2020-01-01 12:00:00+00')).toBeInstanceOf(Date);
	});

	it('should keep overrides isolated between instances', () => {
		const first = getLegacyDateTypeParsers(pgp);
		const second = getLegacyDateTypeParsers(pgp);

		first.setTypeParser(builtins.TIMESTAMPTZ, () => 'custom');

		expect(first.getTypeParser(builtins.TIMESTAMPTZ, 'text')('2020-01-01 12:00:00+00')).toBe(
			'custom',
		);
		expect(second.getTypeParser(builtins.TIMESTAMPTZ, 'text')('2020-01-01 12:00:00+00')).toBe(
			'2020-01-01T12:00:00.000Z',
		);
	});
});

describe('nodes that share the parsers and have no behavioural test', () => {
	// Both send a value that is genuinely UTC, so the zoneless reading is the wrong fix for them:
	// it would strip an offset the value really carries. They need a parse-as-UTC mode, ENT-882.
	it.each(['CrateDb', 'QuestDb'])('should pass legacyUtcTimestamps from the %s node', (node) => {
		const source = readFileSync(join(__dirname, '..', 'nodes', node, `${node}.node.ts`), 'utf8');

		expect(source).toContain('getDateAsStringTypeParsers(pgp, { legacyUtcTimestamps: true })');
	});
});
