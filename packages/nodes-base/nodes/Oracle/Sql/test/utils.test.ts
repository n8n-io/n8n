import { DateTime } from 'luxon';
import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import * as oracleDBTypes from 'oracledb';
import { mock } from 'vitest-mock-extended';

import type { ColumnMap, ExecuteOpBindParam } from '../helpers/interfaces';
import {
	addSortRules,
	addWhereClauses,
	configureQueryRunner,
	escapeSqlStringLiteral,
	getBindParameters,
	getCompatibleValue,
	getOutBindDefsForExecute,
	quoteSqlIdentifier,
} from '../helpers/utils';

describe('Test addWhereClauses', () => {
	const schema: ColumnMap = { ID: { type: 'NUMBER', nullable: true, maxSize: 0 } };
	const node = mock<INode>();

	const build = (condition: string, value: unknown = 1) =>
		addWhereClauses(
			'DELETE FROM "T"',
			[{ column: 'ID', condition, value }],
			'AND',
			schema,
			node,
			0,
		);

	it('should normalise the "equal" operator to =', () => {
		const [query] = build('equal');
		expect(query).toEqual('DELETE FROM "T" WHERE "ID" = :0');
	});

	it('should keep the column and value out of the concatenated SQL', () => {
		const [query, binds] = build('>', 5);
		expect(query).toEqual('DELETE FROM "T" WHERE "ID" > :0');
		expect(binds).toHaveLength(1);
	});

	it('should build value-less clauses for IS NULL / IS NOT NULL', () => {
		const [query, binds] = build('IS NULL', undefined);
		expect(query).toEqual('DELETE FROM "T" WHERE "ID" IS NULL');
		expect(binds).toHaveLength(0);
	});

	it.each(['<>', '^=', 'NOT LIKE'])('should accept the %s operator synonym', (condition) => {
		const [query] = build(condition);
		expect(query).toEqual(`DELETE FROM "T" WHERE "ID" ${condition} :0`);
	});

	it('should accept a lowercase operator, normalising it to uppercase', () => {
		const [query] = build('like');
		expect(query).toEqual('DELETE FROM "T" WHERE "ID" LIKE :0');
	});

	it('should accept a lowercase "is null" and build a value-less clause', () => {
		const [query, binds] = build('is null', undefined);
		expect(query).toEqual('DELETE FROM "T" WHERE "ID" IS NULL');
		expect(binds).toHaveLength(0);
	});

	it('should tolerate surrounding whitespace in the operator', () => {
		const [query] = build('  =  ');
		expect(query).toEqual('DELETE FROM "T" WHERE "ID" = :0');
	});

	it('should reject an operator outside the allowed set', () => {
		expect(() => build("= 'x' OR 1=1 --")).toThrow('is not valid');
	});

	it('should reject an empty operator', () => {
		expect(() => build('')).toThrow('is not valid');
	});

	it.each([5, null, { op: '=' }])(
		'should reject the non-string operator %o with the operator error',
		(condition) => {
			expect(() => build(condition as unknown as string)).toThrow('is not valid');
		},
	);
});

describe('Test quoteSqlIdentifier', () => {
	it('should wrap a simple identifier in double quotes', () => {
		expect(quoteSqlIdentifier('employees')).toEqual('"employees"');
	});

	it('should quote each part of a dot-separated identifier', () => {
		expect(quoteSqlIdentifier('scott.employees')).toEqual('"scott"."employees"');
	});

	it('should preserve an already-quoted identifier', () => {
		expect(quoteSqlIdentifier('"My Table"')).toEqual('"My Table"');
	});

	it('should trim surrounding whitespace before quoting', () => {
		expect(quoteSqlIdentifier('  employees  ')).toEqual('"employees"');
	});

	it('should reject an identifier containing a double quote', () => {
		expect(() => quoteSqlIdentifier('my"table')).toThrow('is not valid');
	});

	it('should accept a single quote, which is legal in an Oracle identifier', () => {
		expect(quoteSqlIdentifier("O'Brien")).toEqual('"O\'Brien"');
	});

	it('should preserve a single quote inside an already-quoted identifier', () => {
		expect(quoteSqlIdentifier('"O\'Brien"')).toEqual('"O\'Brien"');
	});

	it('should quote (not reject) a value crafted to close a string literal', () => {
		// The literal-context safety comes from escapeSqlStringLiteral, not from rejection here.
		expect(quoteSqlIdentifier("X') PURGE; EXECUTE IMMEDIATE 'DROP TABLE SENSITIVE_DATA")).toEqual(
			'"X\') PURGE; EXECUTE IMMEDIATE \'DROP TABLE SENSITIVE_DATA"',
		);
	});

	it('should reject a double-dot identifier', () => {
		expect(() => quoteSqlIdentifier('my..column')).toThrow('is not valid');
	});
});

describe('Test escapeSqlStringLiteral', () => {
	it('should double a single quote so it cannot terminate a literal', () => {
		expect(escapeSqlStringLiteral('"O\'Brien"')).toEqual('"O\'\'Brien"');
	});

	it('should leave a value without single quotes unchanged', () => {
		expect(escapeSqlStringLiteral('"scott"."employees"')).toEqual('"scott"."employees"');
	});

	it('should neutralise an identifier crafted to close the DROP literal', () => {
		const quoted = quoteSqlIdentifier("X') PURGE; EXECUTE IMMEDIATE 'DROP TABLE SENSITIVE_DATA");
		expect(escapeSqlStringLiteral(quoted)).toEqual(
			"\"X'') PURGE; EXECUTE IMMEDIATE ''DROP TABLE SENSITIVE_DATA\"",
		);
	});
});

describe('Test addSortRules', () => {
	it('should ORDER BY ASC', () => {
		const query = 'SELECT * FROM "scott"."employees"';
		const sortRules = [{ column: 'id', direction: 'ASC' }];

		const updatedQuery = addSortRules(query, sortRules);

		expect(updatedQuery).toEqual(`${query} ORDER BY "id" ASC`);
	});

	it('should ORDER BY DESC', () => {
		const query = 'SELECT * FROM "scott"."employees"';
		const sortRules = [{ column: 'id', direction: 'DESC' }];

		const updatedQuery = addSortRules(query, sortRules);

		expect(updatedQuery).toEqual(`${query} ORDER BY "id" DESC`);
	});

	it('should handle multiple sort rules', () => {
		const query = 'SELECT * FROM "scott"."employees"';
		const sortRules = [
			{ column: 'id', direction: 'ASC' },
			{ column: 'name', direction: 'DESC' },
		];

		const updatedQuery = addSortRules(query, sortRules);

		expect(updatedQuery).toEqual(`${query} ORDER BY "id" ASC, "name" DESC`);
	});

	it('should ignore incorrect direction', () => {
		const query = 'SELECT * FROM "scott"."employees"';
		const sortRules = [{ column: 'id', direction: 'SELECT * ' }];

		const updatedQuery = addSortRules(query, sortRules);

		expect(updatedQuery).toEqual(`${query} ORDER BY "id" ASC`); // by default we just use ASC
	});
});

describe('Test returning Clause', () => {
	it('should add RETURNING clause', () => {
		const query =
			'INSERT INTO "VECTOR"."FRUITS" ("FRUIT_ID","PRICE_PER_KG","FRUIT_NAME") VALUES (:0,:1,:2)';
		const metaData = {
			COLOR: {
				type: 'VARCHAR2',
				nullable: true,
				maxSize: 256,
			},
			FRUIT_ID: {
				type: 'NUMBER',
				nullable: false,
				maxSize: 22,
			},
			FRUIT_NAME: {
				type: 'VARCHAR2',
				nullable: false,
				maxSize: 256,
			},
			PRICE_PER_KG: {
				type: 'NUMBER',
				nullable: true,
				maxSize: 22,
			},
		};
		const outputColumns = ['FRUIT_NAME'];
		const bindInfo = [
			{
				type: oracleDBTypes.NUMBER,
			},
			{
				type: oracleDBTypes.NUMBER,
			},
			{
				type: oracleDBTypes.STRING,
				maxSize: 10000000,
			},
		];
		const bindIndex = 3;
		const expectedQuery = `${query} RETURNING "FRUIT_NAME" INTO :3`;

		const updatedQuery = getOutBindDefsForExecute(
			query,
			metaData,
			outputColumns,
			bindInfo,
			bindIndex,
		);

		expect(updatedQuery).toEqual(expectedQuery);
	});
});

describe('Test getCompatibleValue ', () => {
	it('Verify DateTime object is accepted', () => {
		const jsDate = new Date(2024, 0, 1, 14, 30, 0);
		const dtUTC = DateTime.fromJSDate(jsDate, { zone: 'utc' });
		const result = getCompatibleValue('DATE', dtUTC);

		expect(result).toBeInstanceOf(Date);
	});
});

describe('Test getBindParameters ', () => {
	it('Verify different types are accepted', () => {
		const query = `INSERT INTO demo_all_types (id, col_number, col_varchar, col_char, col_date, col_timestamp, col_blob, col_json, col_bool, col_vector)
		VALUES (:pid, 12345.67, 'Hello World', 'ABC', DATE '2024-05-01', TIMESTAMP '2024-05-01 10:15:30', :pblob, :pjs, TRUE, :pvecsp)`;
		const paramList: ExecuteOpBindParam[] = [
			{
				name: 'pblob',
				bindDirection: 'in',
				datatype: 'blob',
				valueBlob: Buffer.from([
					98, 105, 110, 97, 114, 121, 95, 100, 97, 116, 97, 95, 104, 101, 114, 101, 32, 102, 111,
					114, 32, 66, 76, 79, 66,
				]),
				parseInStatement: false,
			},
			{
				name: 'pjs',
				bindDirection: 'in',
				datatype: 'json',
				valueJson: {
					user: 'John',
					active: true,
					roles: ['admin', 'developer'],
				},
				parseInStatement: false,
			},
			{
				name: 'pvecsp',
				bindDirection: 'in',
				datatype: 'sparse',
				valueSparse: {
					dimensions: 4,
					indices: [0, 2],
					values: [3, 4],
				},
				parseInStatement: false,
			},
			{
				name: 'pid',
				bindDirection: 'in',
				datatype: 'number',
				valueNumber: 2471,
				parseInStatement: false,
			},
		];

		const expectedBindParams: any = {
			pblob: {
				type: oracleDBTypes.BLOB,
				val: Buffer.from([
					98, 105, 110, 97, 114, 121, 95, 100, 97, 116, 97, 95, 104, 101, 114, 101, 32, 102, 111,
					114, 32, 66, 76, 79, 66,
				]),
				dir: 3001,
			},
			pjs: {
				type: oracleDBTypes.DB_TYPE_JSON,
				val: {
					user: 'John',
					active: true,
					roles: ['admin', 'developer'],
				},
				dir: 3001,
			},
			pvecsp: {
				type: oracleDBTypes.DB_TYPE_VECTOR,
				val: new oracleDBTypes.SparseVector({
					indices: new Uint32Array([0, 2]),
					values: new Float64Array([3, 4]),
					numDimensions: 4,
				}),
				dir: 3001,
			},
			pid: {
				type: oracleDBTypes.NUMBER,
				val: 2471,
				dir: 3001,
			},
		};
		let updatedQuery: string;
		let bindParameters: oracleDBTypes.BindParameters;

		// test Sparse Vector
		({ updatedQuery, bindParameters } = getBindParameters(query, paramList));
		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual(expectedBindParams);

		// test VECTOR type
		paramList[2] = {
			name: 'pvecsp',
			bindDirection: 'in',
			datatype: 'vector',
			valueVector: [3, 4, 5, 6, 78],
			parseInStatement: false,
		};
		expectedBindParams.pvecsp = {
			type: oracleDBTypes.DB_TYPE_VECTOR,
			val: [3, 4, 5, 6, 78],
			dir: 3001,
		};
		({ updatedQuery, bindParameters } = getBindParameters(query, paramList));
		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual(expectedBindParams);

		//  test null value
		paramList[2] = {
			name: 'pvecsp',
			bindDirection: 'in',
			datatype: 'vector',
			valueVector: null,
			parseInStatement: false,
		};
		expectedBindParams.pvecsp = {
			type: oracleDBTypes.DB_TYPE_VECTOR,
			val: null,
			dir: 3001,
		};
		({ updatedQuery, bindParameters } = getBindParameters(query, paramList));
		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual(expectedBindParams);
	});

	it('should configure out bind parameters without input values', () => {
		const query = 'BEGIN demo(:out_string, :inout_string, :out_number); END;';
		const paramList = [
			{
				name: 'out_string',
				bindDirection: 'out',
				datatype: 'string',
				valueString: '',
				parseInStatement: false,
			},
			{
				name: 'inout_string',
				bindDirection: 'inout',
				datatype: 'string',
				valueString: 'input',
				parseInStatement: false,
			},
			{
				name: 'out_number',
				bindDirection: 'out',
				datatype: 'number',
				valueNumber: 0,
				parseInStatement: false,
			},
		] as ExecuteOpBindParam[];

		const { updatedQuery, bindParameters } = getBindParameters(query, paramList);

		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual({
			out_string: {
				type: oracleDBTypes.STRING,
				dir: oracleDBTypes.BIND_OUT,
				maxSize: 4000,
			},
			inout_string: {
				type: oracleDBTypes.STRING,
				val: 'input',
				dir: oracleDBTypes.BIND_INOUT,
				maxSize: 4000,
			},
			out_number: {
				type: oracleDBTypes.NUMBER,
				dir: oracleDBTypes.BIND_OUT,
			},
		});
	});

	it('should use a custom max size for string out bind parameters', () => {
		const query = 'BEGIN demo(:out_string, :inout_string); END;';
		const paramList = [
			{
				name: 'out_string',
				bindDirection: 'out',
				datatype: 'string',
				valueString: '',
				parseInStatement: false,
			},
			{
				name: 'inout_string',
				bindDirection: 'inout',
				datatype: 'string',
				valueString: 'input',
				parseInStatement: false,
			},
		] as ExecuteOpBindParam[];

		const { updatedQuery, bindParameters } = getBindParameters(query, paramList, {
			stringOutBindMaxSize: 1024,
		});

		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual({
			out_string: {
				type: oracleDBTypes.STRING,
				dir: oracleDBTypes.BIND_OUT,
				maxSize: 1024,
			},
			inout_string: {
				type: oracleDBTypes.STRING,
				val: 'input',
				dir: oracleDBTypes.BIND_INOUT,
				maxSize: 1024,
			},
		});
	});

	it('should use the default string type for out bind parameters when the data type is missing', () => {
		const query = 'BEGIN demo(:out_string); END;';
		const paramList = [
			{
				name: 'out_string',
				bindDirection: 'out',
				parseInStatement: false,
			},
		] as unknown as ExecuteOpBindParam[];

		const { updatedQuery, bindParameters } = getBindParameters(query, paramList);

		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual({
			out_string: {
				type: oracleDBTypes.STRING,
				dir: oracleDBTypes.BIND_OUT,
				maxSize: 4000,
			},
		});
	});

	it('should use the default string type for out bind parameters when the data type is empty', () => {
		const query = 'BEGIN demo(:out_string); END;';
		const paramList = [
			{
				name: 'out_string',
				bindDirection: 'out',
				datatype: '',
				parseInStatement: false,
			},
		] as unknown as ExecuteOpBindParam[];

		const { updatedQuery, bindParameters } = getBindParameters(query, paramList);

		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual({
			out_string: {
				type: oracleDBTypes.STRING,
				dir: oracleDBTypes.BIND_OUT,
				maxSize: 4000,
			},
		});
	});

	it('should skip value parsing for out bind parameters', () => {
		const query = 'BEGIN demo(:out_blob); END;';
		const paramList = [
			{
				name: 'out_blob',
				bindDirection: 'out',
				datatype: 'blob',
				parseInStatement: false,
			},
		] as unknown as ExecuteOpBindParam[];

		const { updatedQuery, bindParameters } = getBindParameters(query, paramList);

		expect(updatedQuery).toEqual(query);
		expect(bindParameters).toEqual({
			out_blob: {
				type: oracleDBTypes.BLOB,
				dir: oracleDBTypes.BIND_OUT,
			},
		});
	});
});

describe('Test configureQueryRunner', () => {
	it('should return object out bind values from execute operations', async () => {
		const execute = vi.fn().mockResolvedValue({ outBinds: { ret: 'registered' } });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const context = {
			helpers: {
				constructExecutionMetaData,
			},
		} as unknown as IExecuteFunctions;
		const node = {} as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const result = await queryRunner(
			[
				{
					query: 'BEGIN demo(:ret); END;',
					values: {
						ret: {
							type: oracleDBTypes.STRING,
							dir: oracleDBTypes.BIND_OUT,
							maxSize: 4000,
						},
					},
				},
			],
			[],
			{
				operation: 'execute',
				stmtBatching: 'independently',
			},
		);

		expect(result).toEqual([{ json: { ret: 'registered' } }]);
		expect(result).not.toEqual([{ json: { success: true } }]);
		expect(constructExecutionMetaData).toHaveBeenCalledWith([{ json: { ret: 'registered' } }], {
			itemData: { item: 0 },
		});
		expect(getConnection).toHaveBeenCalledTimes(1);
		expect(execute).toHaveBeenCalledWith(
			'BEGIN demo(:ret); END;',
			{
				ret: {
					type: oracleDBTypes.STRING,
					dir: oracleDBTypes.BIND_OUT,
					maxSize: 4000,
				},
			},
			expect.objectContaining({
				outFormat: oracleDBTypes.OUT_FORMAT_OBJECT,
			}),
		);
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('should return RETURNING date out binds as ISO strings on version 1.1', async () => {
		const date = new Date('2020-01-01T12:00:00.000Z');
		const execute = vi.fn().mockResolvedValue({ outBinds: { created: date } });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const context = {
			helpers: { constructExecutionMetaData },
		} as unknown as IExecuteFunctions;
		const node = { typeVersion: 1.1 } as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const result = await queryRunner(
			[{ query: 'INSERT ... RETURNING created INTO :created', values: {} }],
			[],
			{ operation: 'execute', stmtBatching: 'independently' },
		);

		expect(result).toEqual([{ json: { created: '2020-01-01T12:00:00.000Z' } }]);
	});

	it('should keep RETURNING date out binds as Date objects before version 1.1', async () => {
		const date = new Date('2020-01-01T12:00:00.000Z');
		const execute = vi.fn().mockResolvedValue({ outBinds: { created: date } });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const context = {
			helpers: { constructExecutionMetaData },
		} as unknown as IExecuteFunctions;
		const node = { typeVersion: 1 } as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const result = await queryRunner(
			[{ query: 'INSERT ... RETURNING created INTO :created', values: {} }],
			[],
			{ operation: 'execute', stmtBatching: 'independently' },
		);

		expect((result[0].json as IDataObject).created).toBeInstanceOf(Date);
	});

	it('should move RETURNING binary out binds to the binary output on version 1.1', async () => {
		const blob = Buffer.from('file-bytes');
		const execute = vi.fn().mockResolvedValue({ outBinds: { doc: blob } });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const prepareBinaryData = vi.fn(async (buffer: Buffer, fileName?: string) => ({
			data: buffer.toString('base64'),
			fileName,
			mimeType: 'application/octet-stream',
		}));
		const context = {
			helpers: { constructExecutionMetaData, prepareBinaryData },
		} as unknown as IExecuteFunctions;
		const node = { typeVersion: 1.1 } as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const result = await queryRunner(
			[{ query: 'INSERT ... RETURNING doc INTO :doc', values: {} }],
			[],
			{ operation: 'execute', stmtBatching: 'independently' },
		);

		expect(result[0].json).not.toHaveProperty('doc');
		expect(prepareBinaryData).toHaveBeenCalledWith(blob, 'doc');
		expect((result[0] as INodeExecutionData).binary?.doc).toBeDefined();
	});

	it('should move fetched binary columns to the binary output on version 1.1', async () => {
		const blob = Buffer.from('file-bytes');
		const execute = vi.fn().mockResolvedValue({ rows: [{ ID: 1, DOC: blob }] });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const prepareBinaryData = vi.fn(async (buffer: Buffer, fileName?: string) => ({
			data: buffer.toString('base64'),
			fileName,
			mimeType: 'application/octet-stream',
		}));
		const context = {
			helpers: { constructExecutionMetaData, prepareBinaryData },
		} as unknown as IExecuteFunctions;
		const node = { typeVersion: 1.1 } as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const result = await queryRunner([{ query: 'SELECT id, doc FROM docs', values: {} }], [], {
			operation: 'select',
			stmtBatching: 'independently',
		});

		expect(result[0].json).toEqual({ ID: 1 });
		expect(prepareBinaryData).toHaveBeenCalledWith(blob, 'DOC');
		expect((result[0] as INodeExecutionData).binary?.DOC).toBeDefined();
	});

	it('should keep fetched binary columns in json before version 1.1', async () => {
		const blob = Buffer.from('file-bytes');
		const execute = vi.fn().mockResolvedValue({ rows: [{ ID: 1, DOC: blob }] });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const context = {
			helpers: { constructExecutionMetaData },
		} as unknown as IExecuteFunctions;
		const node = { typeVersion: 1 } as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const result = await queryRunner([{ query: 'SELECT id, doc FROM docs', values: {} }], [], {
			operation: 'select',
			stmtBatching: 'independently',
		});

		expect((result[0].json as IDataObject).DOC).toBe(blob);
		expect((result[0] as INodeExecutionData).binary).toBeUndefined();
	});

	it('should append out-bind execution data one item at a time without spread push', async () => {
		// Manually patch Array.prototype.push instead of vi.spyOn — vitest records spy calls
		// via array push internally, so spying on push itself recurses infinitely. Record via
		// index assignment to avoid that.
		const originalPush = Array.prototype.push;
		const pushCalls: unknown[][] = [];
		Array.prototype.push = function (...args: unknown[]) {
			pushCalls[pushCalls.length] = args;
			return originalPush.apply(this, args);
		};
		const outBinds = [
			[[1], ['Alice']],
			[[2], ['Bob']],
			[[3], ['Charlie']],
		];
		const executeMany = vi.fn().mockResolvedValue({ outBinds });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { executeMany, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const expectedEntries: INodeExecutionData[] = [];
		const constructExecutionMetaData = vi.fn().mockImplementation((data: INodeExecutionData[]) => {
			const item = data[0];
			if (item) expectedEntries[expectedEntries.length] = item;
			return item ? [item, item, item] : [];
		});
		const context = {
			helpers: {
				constructExecutionMetaData,
			},
		} as unknown as IExecuteFunctions;
		const node = {} as unknown as INode;

		let result: INodeExecutionData[] = [];
		let executionDataPushCalls: unknown[][] = [];
		try {
			const queryRunner = configureQueryRunner.call(context, node, false, pool);

			result = await queryRunner(
				[
					{
						query: 'INSERT INTO "TEST" ("COL1", "COL2") VALUES (:0, :1)',
						executeManyValues: [{}, {}, {}],
						outputColumns: ['COL1', 'COL2'],
					},
				],
				[],
				{
					operation: 'insert',
					stmtBatching: 'single',
				},
			);
			executionDataPushCalls = pushCalls.filter(
				([entry]) => entry && expectedEntries.includes(entry as INodeExecutionData),
			);
		} finally {
			Array.prototype.push = originalPush;
		}

		expect(result).toHaveLength(9);
		expect(result[0]?.json).toMatchObject({ COL1: 1, COL2: 'Alice' });
		expect(result[8]?.json).toMatchObject({ COL1: 3, COL2: 'Charlie' });
		expect(executionDataPushCalls).toHaveLength(9);
		expect(executionDataPushCalls.every((call) => call.length === 1)).toBe(true);
		expect(constructExecutionMetaData).toHaveBeenCalledTimes(3);
		expect(getConnection).toHaveBeenCalledTimes(1);
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('should return select execution data from the concat path', async () => {
		const concatSpy = vi.spyOn(Array.prototype, 'concat');
		const rows = [{ COL1: 1 }, { COL1: 2 }, { COL1: 3 }];
		const executionData = rows.map((row) => ({ json: row }));
		const execute = vi.fn().mockResolvedValue({ rows });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi.fn().mockImplementation(() => executionData);
		const context = {
			helpers: {
				constructExecutionMetaData,
			},
		} as unknown as IExecuteFunctions;
		const node = {} as unknown as INode;

		let result: INodeExecutionData[] = [];
		try {
			const queryRunner = configureQueryRunner.call(context, node, false, pool);

			result = await queryRunner(
				[
					{
						query: 'SELECT COL1 FROM TEST',
					},
				],
				[],
				{
					operation: 'select',
					stmtBatching: 'independently',
				},
			);
			expect(concatSpy).toHaveBeenCalledWith(executionData);
		} finally {
			concatSpy.mockRestore();
		}

		expect(result).toHaveLength(3);
		expect(result[0]?.json).toMatchObject({ COL1: 1 });
		expect(result[2]?.json).toMatchObject({ COL1: 3 });
		expect(constructExecutionMetaData).toHaveBeenCalledTimes(1);
		expect(getConnection).toHaveBeenCalledTimes(1);
		expect(close).toHaveBeenCalledTimes(1);
	});
});

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('configureQueryRunner stack overflow regression', () => {
	it('should handle large out bind datasets without stack overflow', async () => {
		const chunkSize = 250_000;
		const outBinds = [[[42]]];
		const executeMany = vi.fn().mockResolvedValue({ outBinds });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { executeMany, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) =>
				Array.from({ length: chunkSize }, () => data[0]),
			);
		const context = {
			helpers: {
				constructExecutionMetaData,
			},
		} as unknown as IExecuteFunctions;
		const node = {} as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const queries = [
			{
				query: 'INSERT INTO "TEST" ("COL1") VALUES (:0)',
				executeManyValues: [{}],
				outputColumns: ['COL1'],
			},
		];

		const result = await queryRunner(queries as any, [], {
			operation: 'insert',
			stmtBatching: 'single',
		});

		expect(result).toHaveLength(chunkSize);
		expect(result[0]?.json).toMatchObject({ COL1: 42 });
		expect(result[chunkSize - 1]?.json).toMatchObject({ COL1: 42 });
		expect(constructExecutionMetaData).toHaveBeenCalledTimes(1);
		expect(getConnection).toHaveBeenCalledTimes(1);
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('should handle large select result sets without stack overflow', async () => {
		const chunkSize = 250_000;
		const rows = Array.from({ length: chunkSize }, (_, index) => ({ COL1: index }));
		const execute = vi.fn().mockResolvedValue({ rows });
		const close = vi.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = vi.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = vi
			.fn()
			.mockImplementation((data: INodeExecutionData[]) => data);
		const context = {
			helpers: {
				constructExecutionMetaData,
			},
		} as unknown as IExecuteFunctions;
		const node = {} as unknown as INode;
		const queryRunner = configureQueryRunner.call(context, node, false, pool);

		const queries = [
			{
				query: 'SELECT COL1 FROM TEST',
			},
		];

		const result = await queryRunner(queries as any, [], {
			operation: 'select',
			stmtBatching: 'independently',
		});

		expect(result).toHaveLength(chunkSize);
		expect(result[0]?.json).toMatchObject({ COL1: 0 });
		expect(result[chunkSize - 1]?.json).toMatchObject({ COL1: chunkSize - 1 });
		expect(constructExecutionMetaData).toHaveBeenCalledTimes(1);
		expect(getConnection).toHaveBeenCalledTimes(1);
		expect(close).toHaveBeenCalledTimes(1);
	});
});
