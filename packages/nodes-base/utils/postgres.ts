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

// pg-promise's bundled pg-types exposes `arrayParser.create`, but its published typings don't.
type ArrayParser = {
	create: (source: string, transform: (entry: string) => unknown) => { parse: () => unknown[] };
};

/**
 * Per-connection type parsers that return date/timestamp columns (and their array variants) as
 * JSON-safe strings rather than live `Date` objects: DATE keeps its `YYYY-MM-DD` wire value,
 * timestamps are normalized to ISO, every other OID falls back to the default parser. Applied via
 * the pg `types` connection option so the global pg-types state shared across pools stays untouched.
 */
export function getDateAsStringTypeParsers(pgp: PgpClient): PgTypesConfig {
	const { builtins } = pgp.pg.types;
	const parseElements = (transform: (entry: string) => unknown) => (value: string) =>
		(pgp.pg.types.arrayParser as unknown as ArrayParser).create(value, transform).parse();

	const overrides = new Map<number, (value: string) => unknown>([
		[builtins.DATE, (value) => value],
		[builtins.TIMESTAMP, parseDateToISO],
		[builtins.TIMESTAMPTZ, parseDateToISO],
		[DATE_ARRAY_TYPE_ID, parseElements((value) => value)],
		[TIMESTAMP_ARRAY_TYPE_ID, parseElements(parseDateToISO)],
		[TIMESTAMPTZ_ARRAY_TYPE_ID, parseElements(parseDateToISO)],
	]);

	return {
		setTypeParser(
			id: number,
			formatOrParseFn: string | ((value: string) => unknown),
			parseFn?: string | ((value: string) => unknown),
		) {
			const fn = parseFn ?? formatOrParseFn;
			if (typeof fn === 'function') overrides.set(id, fn);
		},
		getTypeParser(id: number, format?: 'text' | 'binary') {
			const override = overrides.get(id);
			if (override && (format === undefined || format === 'text')) return override;
			return pgp.pg.types.getTypeParser(id, format);
		},
	};
}
