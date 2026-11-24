import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IPairedItemData,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';

import type { PgpDatabase } from '../../v2/helpers/interfaces';
import { configureQueryRunner, isSelectQuery } from '../../v2/helpers/utils';

const node: INode = {
	id: '1',
	name: 'Postgres node',
	typeVersion: 2,
	type: 'n8n-nodes-base.postgres',
	position: [60, 760],
	parameters: {
		operation: 'executeQuery',
	},
};

const createMockDb = (returnData: IDataObject | IDataObject[]) => {
	const inner = {
		async any() {
			return returnData;
		},
		async multi() {
			return returnData;
		},
	};
	return {
		...inner,
		async tx<T>(cb: (t: typeof inner) => Promise<T>) {
			return await cb(inner);
		},
		async task<T>(cb: (t: typeof inner) => Promise<T>) {
			return await cb(inner);
		},
	} as unknown as PgpDatabase;
};

describe('Test PostgresV2, runQueries', () => {
	it('should execute, should return success true', async () => {
		const pgp = pgPromise();
		const db = createMockDb([]);

		const dbMultiSpy = vi.spyOn(db, 'multi');

		const thisArg = mock<IExecuteFunctions>();
		const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

		const result = await runQueries([{ query: 'SELECT * FROM table', values: [] }], {
			nodeVersion: 2.2,
		});

		expect(result).toBeDefined();
		expect(result).toHaveLength(1);
		expect(result).toEqual([{ json: { success: true }, pairedItem: [{ item: 0 }] }]);
		expect(dbMultiSpy).toHaveBeenCalledWith('SELECT * FROM table');
	});

	describe('empty result fallback (nodeVersion >= 2.3)', () => {
		// Minimal stand-in for n8n-core's constructExecutionMetaData, sufficient for these tests.
		const fakeConstructExecutionMetaData = (
			inputData: INodeExecutionData[],
			options: { itemData: IPairedItemData | IPairedItemData[] },
		): NodeExecutionWithMetadata[] =>
			inputData.map((item) => ({
				...item,
				pairedItem: options.itemData,
			})) as NodeExecutionWithMetadata[];

		const runWithEmptyResult = async (query: string, queryBatching?: string) => {
			const pgp = pgPromise();
			const db = createMockDb([]);
			const thisArg = mockDeep<IExecuteFunctions>();
			thisArg.helpers.constructExecutionMetaData.mockImplementation(fakeConstructExecutionMetaData);
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);
			return await runQueries([{ query, values: [] }], {
				nodeVersion: 2.3,
				queryBatching,
			});
		};

		describe.each(['single', 'transaction', 'independently'])('mode: %s', (mode) => {
			it('returns [] for a plain SELECT with no rows', async () => {
				const result = await runWithEmptyResult('SELECT * FROM users WHERE id = 999', mode);
				expect(result).toEqual([]);
			});

			it('returns [] for a CTE (WITH ...) with no rows', async () => {
				const result = await runWithEmptyResult(
					'WITH t AS (SELECT 1 AS x) SELECT * FROM t WHERE x = 999',
					mode,
				);
				expect(result).toEqual([]);
			});

			it('returns [] for a SELECT preceded by a line comment', async () => {
				const result = await runWithEmptyResult(
					'-- fetch some rows\nSELECT * FROM users WHERE id = 999',
					mode,
				);
				expect(result).toEqual([]);
			});

			it('returns [] for a SELECT preceded by a multi-line block comment', async () => {
				const result = await runWithEmptyResult(
					'/* fetch\n   some rows */\nSELECT * FROM users WHERE id = 999',
					mode,
				);
				expect(result).toEqual([]);
			});

			it('returns [] for a SELECT with an inline trailing line comment', async () => {
				const result = await runWithEmptyResult(
					'SELECT * FROM users WHERE id = 999 -- not found',
					mode,
				);
				expect(result).toEqual([]);
			});

			it('returns {success:true} for a non-SELECT statement (e.g. UPDATE)', async () => {
				const result = await runWithEmptyResult("UPDATE users SET name = 'x' WHERE id = 999", mode);
				expect(result).toHaveLength(1);
				expect((result[0] as { json: unknown }).json).toEqual({ success: true });
			});

			it('returns {success:true} for a CTE-prefixed UPDATE with no rows', async () => {
				const result = await runWithEmptyResult(
					"WITH payload AS (SELECT 1) UPDATE users SET name = 'x' WHERE id = 999",
					mode,
				);
				expect(result).toHaveLength(1);
				expect((result[0] as { json: unknown }).json).toEqual({ success: true });
			});

			it('returns {success:true} when a string literal hides a trailing UPDATE', async () => {
				const result = await runWithEmptyResult(
					"SELECT '-- literal' WHERE false; UPDATE users SET name = 'x' WHERE id = 999",
					mode,
				);
				expect(result).toHaveLength(1);
				expect((result[0] as { json: unknown }).json).toEqual({ success: true });
			});
		});
	});
});

describe('isSelectQuery', () => {
	it.each([
		['plain SELECT', 'SELECT * FROM users'],
		['SELECT with JOIN and WHERE', 'SELECT a.* FROM a JOIN b ON a.id = b.a_id WHERE a.id = 1'],
		['CTE (WITH)', 'WITH t AS (SELECT 1) SELECT * FROM t'],
		['leading line comment', '-- comment\nSELECT * FROM users'],
		['leading block comment (single line)', '/* comment */ SELECT * FROM users'],
		['leading block comment (multi-line)', '/* comment\n   continues */\nSELECT * FROM users'],
		['trailing line comment', 'SELECT * FROM users -- trailing'],
		['lowercase', 'select * from users'],
		['mixed case WITH', 'WiTh t AS (SELECT 1) SELECT * FROM t'],
		['multiple SELECTs separated by ;', 'SELECT 1; SELECT 2;'],
		['trailing semicolon', 'SELECT * FROM users;'],
		['leading whitespace', '   \n\t SELECT * FROM users'],
		// CTE whose body modifies data but whose top-level command is SELECT
		[
			'data-modifying CTE feeding a top-level SELECT',
			'WITH deleted AS (DELETE FROM users WHERE id = 1 RETURNING *) SELECT * FROM deleted',
		],
		// String literals containing keywords/syntax that must be ignored by the classifier
		["SELECT with '--' inside a string literal", "SELECT '-- not a comment' AS s WHERE 1 = 0"],
		[
			"SELECT with '/* */' inside a string literal",
			"SELECT '/* not a comment */' AS s WHERE 1 = 0",
		],
		["SELECT with ';' inside a string literal", "SELECT 'a;b' AS s WHERE 1 = 0"],
		['SELECT with a dollar-quoted string', 'SELECT $$DROP TABLE users$$ AS s WHERE 1 = 0'],
		['SELECT with an E-string and escaped quote', "SELECT E'it\\'s fine' AS s WHERE 1 = 0"],
		[
			'SELECT with a lowercase e-string and escaped quote',
			"SELECT e'it\\'s fine' AS s WHERE 1 = 0",
		],
		// `E` adjacent to a non-identifier char (parenthesis) still counts as an E-string prefix
		[
			'SELECT with an E-string immediately after a parenthesis',
			"SELECT (E'it\\'s fine') AS s WHERE 1 = 0",
		],
		// Doubled single-quote escape (`''`) inside a string literal must not terminate the string
		[
			"SELECT with '' (doubled single quote) inside a string literal",
			"SELECT 'it''s fine' AS s WHERE 1 = 0",
		],
		[
			"doubled single quote keeps a trailing ';UPDATE' contained inside the literal",
			"SELECT 'a''; UPDATE users SET name = ''x''' AS s WHERE 1 = 0",
		],
		// Double-quoted identifiers (table/column names) must be skipped by the classifier
		['SELECT with a double-quoted identifier', 'SELECT "id" FROM "users" WHERE "id" = 1'],
		[
			'SELECT with a double-quoted identifier containing keywords',
			'SELECT * FROM "UPDATE users SET" WHERE 1 = 0',
		],
		[
			'SELECT with a double-quoted identifier containing an escaped quote',
			'SELECT "weird\\"name" FROM users WHERE 1 = 0',
		],
		['SELECT with an unterminated double-quoted identifier', 'SELECT "unterminated'],
		// Unterminated comment / dollar quote (defensive — exercises the `end === -1` fallthrough)
		['SELECT followed by an unterminated block comment', 'SELECT 1 FROM t /* never closed'],
		['unterminated dollar-quoted string after SELECT', 'SELECT $$still going'],
		['unterminated tagged dollar-quoted string after SELECT', 'SELECT $tag$still going'],
		// `$` that is NOT a dollar-quote tag (parameter placeholder) — exercises the falsy regex path
		['SELECT with a $1 parameter placeholder', 'SELECT * FROM users WHERE id = $1'],
		// Empty / whitespace / semicolons-only — exercises `statements.length === 0` early-return
		// AND the `.filter(s => s.length > 0)` discarding empty statements
		['empty query', ''],
		['whitespace-only query', '   \n\t '],
		['semicolons-only query', ';;;'],
		// Multiple semicolons between SELECTs — empty statements between get filtered out
		['SELECTs separated by doubled semicolons', 'SELECT 1;; SELECT 2;'],
	])('returns true for %s', (_label, query) => {
		expect(isSelectQuery(query)).toBe(true);
	});

	it.each([
		['INSERT', 'INSERT INTO users (id) VALUES (1)'],
		['UPDATE', "UPDATE users SET name = 'x' WHERE id = 1"],
		['DELETE', 'DELETE FROM users WHERE id = 1'],
		['CREATE TABLE', 'CREATE TABLE t (id INT)'],
		[
			'MERGE',
			'MERGE INTO target USING source ON target.id = source.id WHEN MATCHED THEN UPDATE SET name = source.name',
		],
		['mixed SELECT + UPDATE', "SELECT * FROM users; UPDATE users SET name = 'x'"],
		// CTE-prefixed writes — top-level command after the CTE is a write, not a SELECT
		['CTE + UPDATE', "WITH payload AS (SELECT 1) UPDATE users SET name = 'x' WHERE id = 999"],
		['CTE + INSERT', 'WITH src AS (SELECT 1 AS id) INSERT INTO logs (id) SELECT id FROM src'],
		[
			'CTE + DELETE',
			'WITH old AS (SELECT id FROM users WHERE created_at < now()) DELETE FROM users WHERE id IN (SELECT id FROM old)',
		],
		[
			'CTE + MERGE',
			'WITH src AS (SELECT 1 AS id, $$x$$ AS name) MERGE INTO target t USING src s ON t.id = s.id WHEN MATCHED THEN UPDATE SET name = s.name',
		],
		[
			'RECURSIVE CTE + UPDATE',
			'WITH RECURSIVE t AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM t WHERE n<3) UPDATE users SET counter = counter + 1',
		],
		// Comment / quoting attacks on the classifier
		[
			'-- inside a string literal hides a trailing UPDATE',
			"SELECT '-- literal' WHERE false; UPDATE users SET name = 'x' WHERE id = 999",
		],
		[
			'/* */ inside a string literal hides a trailing UPDATE',
			"SELECT '/* not a comment */' WHERE false; UPDATE users SET name = 'x' WHERE id = 999",
		],
		[
			'; inside a string literal does not split early',
			"SELECT 'a;b' WHERE false; UPDATE users SET name = 'x'",
		],
		[
			'dollar-quoted string containing UPDATE keyword followed by a real UPDATE',
			"SELECT $$UPDATE users SET name='x'$$ WHERE false; UPDATE users SET name = 'x'",
		],
		// Backslash is NOT an escape in standard (non-E) single-quoted strings, so it
		// must not hide a trailing write statement.
		[
			'trailing backslash in a standard string does not swallow a trailing UPDATE',
			"SELECT 'a\\' AS x; UPDATE t SET x = 1 WHERE FALSE",
		],
		[
			'backslash-quote sequence in a standard string does not swallow a trailing DELETE',
			"SELECT 'foo\\' AS x; DELETE FROM t WHERE FALSE",
		],
		// An `E` that is part of an identifier (e.g. `column_E`) must NOT be treated as
		// an E-string prefix — the following string is a standard literal.
		[
			'identifier ending in E followed by a string does not enable backslash escapes',
			"SELECT column_E'a\\' FROM t; UPDATE t SET x = 1 WHERE FALSE",
		],
		// Query starting with `'` (quote at index 0) — exercises `quoteIndex === 0 → false`
		// in isEStringPrefix. The stripped statement has no top-level command keyword.
		['query starting with a standard string literal', "'just a literal'"],
		// Query starting with `E'` (quote at index 1) — exercises `quoteIndex === 1 → true`
		// in isEStringPrefix. The stripped statement has no top-level command keyword.
		['query that is only an E-string', "E'a\\'b'"],
	])('returns false for %s', (_label, query) => {
		expect(isSelectQuery(query)).toBe(false);
	});
});
