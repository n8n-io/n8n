import { mock, mockDeep } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';

import type { PgpDatabase } from '../../v2/helpers/interfaces';
import { configureQueryRunner, formatPostgresQuery } from '../../v2/helpers/utils';

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
	return {
		async any() {
			return returnData;
		},
		async multi() {
			return returnData;
		},
		async tx() {
			return returnData;
		},
		async task() {
			return returnData;
		},
	} as unknown as PgpDatabase;
};

describe('Test PostgresV2, runQueries', () => {
	it('should execute, should return success true', async () => {
		const pgp = pgPromise();
		const db = createMockDb([]);

		const dbMultiSpy = jest.spyOn(db, 'multi');

		const thisArg = mock<IExecuteFunctions>();
		const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

		const result = await runQueries([{ query: 'SELECT * FROM table', values: [] }], [], {
			nodeVersion: 2.2,
		});

		expect(result).toBeDefined();
		expect(result).toHaveLength(1);
		expect(result).toEqual([{ json: { success: true }, pairedItem: [{ item: 0 }] }]);
		expect(dbMultiSpy).toHaveBeenCalledWith('SELECT * FROM table');
	});

	describe.each(['single', 'transaction', 'independently'] as const)('mode: %s', (mode) => {
		it('should leave quoted parameters as text from v2.9', async () => {
			const pgp = pgPromise();
			const topLevelMulti = jest.fn().mockResolvedValue([]);
			const nestedMulti = jest.fn().mockResolvedValue([]);
			const one = jest.fn().mockResolvedValue({ standard_conforming_strings: 'on' });
			const nested = { any: jest.fn().mockResolvedValue([]), multi: nestedMulti, one };
			const db = {
				multi: topLevelMulti,
				async tx<T>(callback: (transaction: typeof nested) => Promise<T>) {
					return await callback(nested);
				},
				async task<T>(callback: (task: typeof nested) => Promise<T>) {
					return await callback(nested);
				},
			} as unknown as PgpDatabase;
			const thisArg = mockDeep<IExecuteFunctions>();
			thisArg.helpers.constructExecutionMetaData.mockImplementation(
				(inputData) => inputData as NodeExecutionWithMetadata[],
			);
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			await runQueries([{ query: "SELECT '$1', $1", values: ['value'] }], [], {
				nodeVersion: 2.9,
				queryBatching: mode,
			});

			const query = "SELECT '$1', 'value'";
			expect(nestedMulti).toHaveBeenCalledWith(query);
			expect(one).toHaveBeenCalledWith('SHOW standard_conforming_strings');
			expect(topLevelMulti).not.toHaveBeenCalled();
		});
	});

	it('should use the active string escaping mode', async () => {
		const pgp = pgPromise();
		const multi = jest.fn().mockResolvedValue([]);
		const task = {
			multi,
			one: jest.fn().mockResolvedValue({ standard_conforming_strings: 'off' }),
		};
		const db = {
			async task<T>(callback: (executor: typeof task) => Promise<T>) {
				return await callback(task);
			},
		} as unknown as PgpDatabase;
		const thisArg = mockDeep<IExecuteFunctions>();
		const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);
		const query = "SELECT 'text\\' $1'";

		await runQueries([{ query, values: ['value'] }], [], { nodeVersion: 2.9 });

		expect(multi).toHaveBeenCalledWith(query);
	});

	it('should retain legacy parameter formatting before v2.9', async () => {
		const pgp = pgPromise();
		const db = createMockDb([]);
		const dbMultiSpy = jest.spyOn(db, 'multi');
		const thisArg = mockDeep<IExecuteFunctions>();
		const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

		await runQueries([{ query: "SELECT '$1'", values: [42] }], [], { nodeVersion: 2.6 });

		expect(dbMultiSpy).toHaveBeenCalledWith("SELECT '42'");
	});
});

describe('formatPostgresQuery', () => {
	const pgp = pgPromise();

	it.each([
		['standard string', "SELECT '$1', $1", "SELECT '$1', 'value'"],
		['escape string', "SELECT E'$1', $1", "SELECT E'$1', 'value'"],
		['quoted identifier', 'SELECT "$1", $1', 'SELECT "$1", \'value\''],
		['dollar-quoted string', 'SELECT $$$1$$, $1', "SELECT $$$1$$, 'value'"],
		['tagged dollar-quoted string', 'SELECT $tag$$1$tag$, $1', "SELECT $tag$$1$tag$, 'value'"],
		['non-ASCII dollar-quoted string', 'SELECT $é$$1$é$, $1', "SELECT $é$$1$é$, 'value'"],
		['line comment', 'SELECT $1 -- $1', "SELECT 'value' -- $1"],
		['block comment', 'SELECT $1 /* $1 */', "SELECT 'value' /* $1 */"],
		[
			'nested block comment',
			'SELECT $1 /* outer /* $1 */ $1 */',
			"SELECT 'value' /* outer /* $1 */ $1 */",
		],
	])('should ignore parameters in a %s', (_label, query, expected) => {
		expect(
			formatPostgresQuery(pgp, { query, values: ['value'], options: { partial: true } }, true),
		).toBe(expected);
	});

	it('should not treat a dollar tag inside an identifier as quoted text', () => {
		expect(
			formatPostgresQuery(
				pgp,
				{
					query: 'SELECT foo$tag$bar, $1',
					values: ['value'],
				},
				true,
			),
		).toBe("SELECT foo$tag$bar, 'value'");
	});

	it.each(['foo$1', '_foo$1', 'é$1'])(
		'should not format a parameter inside the unquoted identifier %s',
		(identifier) => {
			expect(
				formatPostgresQuery(pgp, { query: `SELECT ${identifier}, $1`, values: ['value'] }, true),
			).toBe(`SELECT ${identifier}, 'value'`);
		},
	);

	it('should format a parameter after a standard string ending with a backslash', () => {
		expect(
			formatPostgresQuery(
				pgp,
				{
					query: "SELECT 'text\\' || $1",
					values: ['value'],
				},
				true,
			),
		).toBe("SELECT 'text\\' || 'value'");
	});

	it('should treat backslashes as escapes when standard strings are disabled', () => {
		expect(
			formatPostgresQuery(
				pgp,
				{
					query: "SELECT 'text\\' $1'",
					values: ['value'],
				},
				false,
			),
		).toBe("SELECT 'text\\' $1'");
	});

	it('should support parameter modifiers', () => {
		expect(
			formatPostgresQuery(
				pgp,
				{
					query: 'SELECT * FROM $1:name',
					values: ['user table'],
				},
				true,
			),
		).toBe('SELECT * FROM "user table"');
	});

	it.each(['$1:jsonSafe', '$1:rawValue', '$1foo', '$1é', '$1:jsoné'])(
		'should leave unsupported parameter token %s unchanged',
		(query) => {
			expect(formatPostgresQuery(pgp, { query, values: [{ value: 'test' }] }, true)).toBe(query);
		},
	);

	it('should preserve a PostgreSQL cast after a parameter', () => {
		expect(
			formatPostgresQuery(pgp, { query: '$1::jsonb', values: [{ value: 'test' }] }, true),
		).toBe('\'{"value":"test"}\'::jsonb');
	});

	it('should not format parameters in a bound value again', () => {
		expect(formatPostgresQuery(pgp, { query: 'SELECT $1', values: ['$2'] }, true)).toBe(
			"SELECT '$2'",
		);
	});

	it.each(['a$E', 'éE'])(
		'should treat a quote after the identifier %s as a standard string',
		(identifier) => {
			expect(
				formatPostgresQuery(
					pgp,
					{ query: `SELECT ${identifier}'\\', $1`, values: ['value'] },
					true,
				),
			).toBe(`SELECT ${identifier}'\\', 'value'`);
		},
	);

	it('should end a line comment at a carriage return', () => {
		expect(
			formatPostgresQuery(pgp, { query: 'SELECT $1 -- $1\rSELECT $1', values: ['value'] }, true),
		).toBe("SELECT 'value' -- $1\rSELECT 'value'");
	});
});
