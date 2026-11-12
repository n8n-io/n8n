/**
 * Runs Select with Start After against a real PostgreSQL, provisioned by
 * testcontainers, so this needs nothing set up by hand.
 *
 *   pnpm --filter n8n-nodes-base test:integration:skip startAfter
 *
 * On "Could not find a working container runtime strategy", point testcontainers
 * at your Docker socket. With Colima:
 *
 *   DOCKER_HOST="unix://$HOME/.colima/default/docker.sock" \
 *   TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
 *   pnpm --filter n8n-nodes-base test:integration:skip startAfter
 */
import get from 'lodash/get';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServiceStack, type N8NStack } from 'n8n-containers';
import { constructExecutionMetaData } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';

import * as select from '../../v2/actions/database/select.operation';
import type { PgpClient, PgpDatabase, QueriesRunner } from '../../v2/helpers/interfaces';
import { checkStartAfterColumn, configureQueryRunner } from '../../v2/helpers/utils';

const SCHEMA = 'start_after';

const FIXTURES = `
DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;
DROP SCHEMA IF EXISTS start_after_other CASCADE;
CREATE SCHEMA ${SCHEMA};
SET LOCAL search_path = ${SCHEMA};

CREATE TABLE orders (id integer PRIMARY KEY, status text NOT NULL, customer text NOT NULL, created_on date NOT NULL);
INSERT INTO orders
SELECT g, (ARRAY['new', 'paid'])[1 + g % 2], (ARRAY['Acme', 'Globex', 'Initech'])[1 + g % 3], date '2026-01-01' + (g - 1) / 3
FROM generate_series(1, 10) AS g;
CREATE TABLE skus (code text PRIMARY KEY);
INSERT INTO skus VALUES ('1'), ('10'), ('2'), ('9'), ('abc');
CREATE TABLE around_zero (id integer PRIMARY KEY);
INSERT INTO around_zero SELECT generate_series(-2, 2);

CREATE TABLE pairs (a integer NOT NULL, b integer NOT NULL, UNIQUE (a, b));
CREATE TABLE partial (a integer NOT NULL, deleted boolean NOT NULL);
CREATE UNIQUE INDEX ON partial (a) WHERE NOT deleted;
CREATE TABLE covering (a integer NOT NULL, note text);
CREATE UNIQUE INDEX ON covering (a) INCLUDE (note);
CREATE TABLE expression (a text NOT NULL);
CREATE UNIQUE INDEX ON expression (lower(a));
CREATE TABLE invalid (a integer NOT NULL);
INSERT INTO invalid VALUES (1), (1);
CREATE TABLE nullable (a integer UNIQUE);
CREATE COLLATION case_insensitive (provider = icu, locale = 'und-u-ks-level2', deterministic = false);
CREATE TABLE collated (a text COLLATE case_insensitive NOT NULL);
CREATE UNIQUE INDEX ON collated (a COLLATE "C");
CREATE TABLE stamps (at timestamp PRIMARY KEY);
CREATE DOMAIN stamp_1 AS timestamptz;
CREATE DOMAIN stamp_2 AS stamp_1;
CREATE TABLE stamps_in_domain (at stamp_2 PRIMARY KEY);
CREATE TABLE blobs (id bytea PRIMARY KEY);
CREATE TABLE parent (id integer PRIMARY KEY);
CREATE TABLE child () INHERITS (parent);
CREATE TABLE parted (id integer PRIMARY KEY) PARTITION BY RANGE (id);
CREATE TABLE parted_1 PARTITION OF parted FOR VALUES FROM (0) TO (100);
CREATE VIEW orders_view AS SELECT * FROM orders;
CREATE MATERIALIZED VIEW orders_copy AS SELECT id FROM orders;
CREATE UNIQUE INDEX ON orders_copy (id);

CREATE SCHEMA start_after_other;
CREATE TABLE start_after_other.calls (name text);
CREATE FUNCTION start_after_other.to_jsonb(pg_catalog.pg_index) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO start_after_other.calls VALUES ('to_jsonb');
	RETURN '{"indnkeyatts": 1}';
END $$;
`;

let stack: N8NStack;
let pgp: PgpClient;
let connectionString: string;
let db: PgpDatabase;
let serverVersion: number;

const node: INode = {
	id: '1',
	name: 'Postgres',
	typeVersion: 2.8,
	type: 'n8n-nodes-base.postgres',
	position: [0, 0],
	parameters: {},
};

beforeAll(async () => {
	stack = await createServiceStack({ services: ['postgres'] });
	// The stack types services generically, so narrow to the Postgres shape here.
	const postgres = stack.serviceResults.postgres as unknown as {
		container: { getHost: () => string; getMappedPort: (port: number) => number };
		meta: { database: string; username: string; password: string };
	};

	const { username, password, database } = postgres.meta;
	const address = `${postgres.container.getHost()}:${postgres.container.getMappedPort(5432)}`;
	connectionString = `postgres://${username}:${password}@${address}/${database}`;

	pgp = pgPromise();
	db = pgp(connectionString);

	await db.multi(FIXTURES);
	await db
		.none(`CREATE UNIQUE INDEX CONCURRENTLY invalid_a_key ON ${SCHEMA}.invalid (a)`)
		.catch(() => {});
	serverVersion = Number((await db.one('SHOW server_version_num')).server_version_num);
});

afterAll(async () => {
	await db?.multi(`DROP SCHEMA ${SCHEMA} CASCADE; DROP SCHEMA start_after_other CASCADE;`);
	pgp?.end();
	await stack?.stop();
});

// Like n8n, throw when a parameter is missing and there is no fallback value.
const createExecuteFunctions = (parameters: IDataObject) =>
	({
		getNodeParameter(
			name: string,
			_itemIndex: number,
			fallbackValue?: unknown,
			options?: IGetNodeParameterOptions,
		) {
			const value: unknown = get(
				parameters,
				options?.extractValue ? `${name}.value` : name,
				fallbackValue,
			);
			if (value === undefined) throw new Error(`Could not get parameter "${name}"`);
			return value;
		},
		getNode: () => node,
		helpers: { constructExecutionMetaData },
	}) as unknown as IExecuteFunctions;

const runSelect = async (parameters: IDataObject): Promise<IDataObject[]> => {
	const context = createExecuteFunctions({
		operation: 'select',
		schema: { __rl: true, mode: 'name', value: SCHEMA },
		limit: 3,
		options: {},
		...parameters,
	});
	const runQueries: QueriesRunner = configureQueryRunner.call(context, node, false, pgp, db);
	const items: INodeExecutionData[] = await select.execute.call(
		context,
		runQueries,
		[{ json: {} }],
		{},
		db,
	);
	return items.map((item) => item.json);
};

/** Reads pages until a page is empty, each page after the last value of the page before. */
const walk = async (parameters: IDataObject, column: string, key = column) => {
	const read: unknown[] = [];
	let value: unknown = '';
	for (let page = 0; page < 20; page++) {
		const rows = await runSelect({ ...parameters, startAfter: { values: { column, value } } });
		if (rows.length === 0) break;
		read.push(...rows.map((row) => row[key]));
		value = rows.at(-1)?.[column];
	}
	return read;
};

const table = (name: string) => ({ __rl: true, mode: 'name', value: name });

describe('Postgres Select with Start After on a real database', () => {
	test('reads every row once, smallest first', async () => {
		expect(await walk({ table: table('orders') }, 'id')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});

	test('reads every row once, biggest first, when the column is sorted DESC', async () => {
		expect(
			await walk(
				{ table: table('orders'), sort: { values: [{ column: 'id', direction: 'DESC' }] } },
				'id',
			),
		).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
	});

	test('keeps the OR conditions of Select Rows on every page', async () => {
		const read = await walk(
			{
				table: table('orders'),
				where: {
					values: [
						{ column: 'status', condition: 'equal', value: 'new' },
						{ column: 'customer', condition: 'equal', value: 'Acme' },
					],
				},
				combineConditions: 'OR',
			},
			'id',
		);

		expect(read).toEqual([2, 3, 4, 6, 8, 9, 10]);
	});

	test('reads text keys that look like numbers', async () => {
		expect(await walk({ table: table('skus'), limit: 2 }, 'code')).toEqual([
			'1',
			'10',
			'2',
			'9',
			'abc',
		]);
	});

	test('uses 0 as a value, not as the first page', async () => {
		const rows = await runSelect({
			table: table('around_zero'),
			startAfter: { values: { column: 'id', value: 0 } },
		});

		expect(rows.map((row) => row.id)).toEqual([1, 2]);
	});

	test.each([
		['orders', 'id'],
		['covering', 'a'],
		['parted', 'id'],
		['parted_1', 'id'],
	])('accepts %s.%s', async (tableName, column) => {
		await expect(checkStartAfterColumn(db, node, 0, SCHEMA, tableName, column)).resolves.toBe(
			undefined,
		);
	});

	test.each([
		['orders', 'created_on', 'has no unique index that Start After can use'],
		['pairs', 'a', 'has no unique index that Start After can use'],
		['partial', 'a', 'has no unique index that Start After can use'],
		['expression', 'a', 'has no unique index that Start After can use'],
		['invalid', 'a', 'has no unique index that Start After can use'],
		['collated', 'a', 'has no unique index that Start After can use'],
		['nullable', 'a', 'Column "a" can be null'],
		['stamps', 'at', 'does not support the timestamp column "at"'],
		['stamps_in_domain', 'at', 'does not support the timestamp column "at"'],
		['blobs', 'id', 'does not support the column "id" of type bytea'],
		['parent', 'id', 'can repeat in the child tables'],
		['orders_view', 'id', 'cannot page the view'],
		['orders_copy', 'id', 'cannot page the materialized view'],
		['orders', 'missing', 'Column "missing" does not exist'],
		['missing', 'id', 'does not exist'],
	])('rejects %s.%s', async (tableName, column, message) => {
		await expect(checkStartAfterColumn(db, node, 0, SCHEMA, tableName, column)).rejects.toThrow(
			message,
		);
	});

	test('rejects a NOT NULL constraint that is not valid yet', async ({ skip }) => {
		// NOT NULL ... NOT VALID exists from PostgreSQL 18.
		if (serverVersion < 180000) skip();
		await db.multi(`
			CREATE TABLE ${SCHEMA}.not_valid (a integer UNIQUE);
			INSERT INTO ${SCHEMA}.not_valid VALUES (1), (NULL);
			ALTER TABLE ${SCHEMA}.not_valid ADD CONSTRAINT not_valid_a_not_null NOT NULL a NOT VALID;
		`);

		await expect(checkStartAfterColumn(db, node, 0, SCHEMA, 'not_valid', 'a')).rejects.toThrow(
			'Column "a" can be null',
		);
	});

	test('uses only the catalog functions when another schema comes first in the search path', async () => {
		const searchPath = encodeURIComponent(`-c search_path=start_after_other,${SCHEMA}`);
		const otherPath = pgp(`${connectionString}?options=${searchPath}`);

		await expect(checkStartAfterColumn(otherPath, node, 0, SCHEMA, 'pairs', 'a')).rejects.toThrow(
			'has no unique index that Start After can use',
		);
		expect(await db.any('SELECT * FROM start_after_other.calls')).toEqual([]);
	});
});
