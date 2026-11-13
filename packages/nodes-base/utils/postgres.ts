import type pgPromise from 'pg-promise';
import type pg from 'pg-promise/typescript/pg-subset';

type PgpClient = pgPromise.IMain;
type PgTypesConfig = NonNullable<pg.IConnectionParameters<pg.IClient>['types']>;

// Array type OIDs, not exposed via pg-types `builtins`
const DATE_ARRAY_TYPE_ID = 1182; // _date
const TIMESTAMP_ARRAY_TYPE_ID = 1115; // _timestamp
const TIMESTAMPTZ_ARRAY_TYPE_ID = 1185; // _timestamptz

export function parseDateToISO(value: string) {
	const parsedDate = new Date(value);

	if (isNaN(parsedDate.getTime())) {
		return value;
	}
	return parsedDate.toISOString();
}

// Postgres sends `timestamp without time zone` as `YYYY-MM-DD hh:mm:ss[.ffffff]`.
const ZONELESS_TIMESTAMP = /^(\d{4,}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/;

/**
 * Returns a `timestamp without time zone` as ISO-8601 local time, keeping every digit the server
 * sent. The column carries no offset, so the wire value is already the whole truth: reading it as
 * an instant would both invent a zone and make the output depend on the n8n process's own.
 * `infinity`, BC dates and anything else unrecognised pass through unchanged.
 */
export function parseTimestampToISO(value: string) {
	return value.replace(ZONELESS_TIMESTAMP, '$1T$2');
}

// pg-promise's bundled pg-types exposes `arrayParser.create`, but its published typings don't.
type ArrayParser = {
	create: (source: string, transform: (entry: string) => unknown) => { parse: () => unknown[] };
};

type ParserFn = string | ((value: string) => unknown);

function createTypeParsers(
	pgp: PgpClient,
	overrides: Map<number, (value: string) => unknown>,
): PgTypesConfig {
	return {
		// this method doesn't seem to be ever called by pg package, but we keep it to satisfy typechecks
		setTypeParser(id: number, formatOrParseFn: ParserFn, parseFn?: ParserFn) {
			const fn = parseFn ?? formatOrParseFn;
			if (typeof fn === 'function') overrides.set(id, fn);
		},
		// this method manages type parser override selection
		getTypeParser(id: number, format?: 'text' | 'binary') {
			const override = overrides.get(id);
			if (override && (format === undefined || format === 'text')) return override;
			return pgp.pg.types.getTypeParser(id, format);
		},
	};
}

/** Postgres node versions below 2.9 read a `timestamp without time zone` as a UTC instant. */
export type DateTypeParserOptions = { legacyUtcTimestamps?: boolean };

/**
 * Per-connection type parsers that return date/timestamp columns (and their array variants) as
 * JSON-safe strings rather than live `Date` objects: DATE keeps its `YYYY-MM-DD` wire value,
 * `timestamp with time zone` becomes a UTC instant, `timestamp without time zone` keeps the local
 * reading the server sent, every other OID falls back to the default parser. Applied via the pg
 * `types` connection option so the global pg-types state shared across pools stays untouched.
 */
export function getDateAsStringTypeParsers(
	pgp: PgpClient,
	{ legacyUtcTimestamps = false }: DateTypeParserOptions = {},
): PgTypesConfig {
	const { builtins } = pgp.pg.types;
	const parseElements = (transform: (entry: string) => unknown) => (value: string) =>
		(pgp.pg.types.arrayParser as unknown as ArrayParser).create(value, transform).parse();
	const parseTimestamp = legacyUtcTimestamps ? parseDateToISO : parseTimestampToISO;

	return createTypeParsers(
		pgp,
		new Map<number, (value: string) => unknown>([
			[builtins.DATE, (value) => value],
			[builtins.TIMESTAMP, parseTimestamp],
			[builtins.TIMESTAMPTZ, parseDateToISO],
			[DATE_ARRAY_TYPE_ID, parseElements((value) => value)],
			[TIMESTAMP_ARRAY_TYPE_ID, parseElements(parseTimestamp)],
			[TIMESTAMPTZ_ARRAY_TYPE_ID, parseElements(parseDateToISO)],
		]),
	);
}

/**
 * Per-connection type parsers for legacy Postgres node versions: only TIMESTAMP and TIMESTAMPTZ
 * are normalized to ISO strings. DATE and array columns keep the default parsers, as before.
 */
export function getLegacyDateTypeParsers(pgp: PgpClient): PgTypesConfig {
	const { builtins } = pgp.pg.types;

	return createTypeParsers(
		pgp,
		new Map<number, (value: string) => unknown>([
			[builtins.TIMESTAMP, parseDateToISO],
			[builtins.TIMESTAMPTZ, parseDateToISO],
		]),
	);
}
