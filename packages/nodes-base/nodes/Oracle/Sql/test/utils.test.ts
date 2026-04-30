import { DateTime } from 'luxon';
import * as oracleDBTypes from 'oracledb';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import type { ExecuteOpBindParam } from '../helpers/interfaces';
import {
	addSortRules,
	configureQueryRunner,
	getBindParameters,
	getCompatibleValue,
	getOutBindDefsForExecute,
} from '../helpers/utils';

const integratedTests = process.env.ORACLE_INTEG_TESTS ?? false;

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
});

// Regression coverage for https://github.com/n8n-io/n8n/issues/26985 needs enough items to
// fail if the implementation appends with push.apply(...) or push(...largeArray).
const describeStackOverflowRegression = integratedTests ? describe : describe.skip;

describeStackOverflowRegression('configureQueryRunner stack overflow regression', () => {
	it('should handle large out bind datasets without stack overflow', async () => {
		const chunkSize = 250_000;
		const outBinds = [[[42]]];
		const executeMany = jest.fn().mockResolvedValue({ outBinds });
		const close = jest.fn().mockResolvedValue(undefined);
		const connection = { executeMany, close };
		const getConnection = jest.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = jest
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
		const execute = jest.fn().mockResolvedValue({ rows });
		const close = jest.fn().mockResolvedValue(undefined);
		const connection = { execute, close };
		const getConnection = jest.fn().mockResolvedValue(connection);
		const pool = { getConnection } as unknown as oracleDBTypes.Pool;
		const constructExecutionMetaData = jest
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
