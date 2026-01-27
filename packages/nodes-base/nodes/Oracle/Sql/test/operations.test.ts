import get from 'lodash/get';
import {
	type IDataObject,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type INode,
	type INodeExecutionData,
	type INodeParameters,
} from 'n8n-workflow';
import * as oracleDBTypes from 'oracledb';

import * as deleteTable from '../actions/database/deleteTable.operation';
import * as executeSQL from '../actions/database/executeQuery.operation';
import * as insert from '../actions/database/insert.operation';
import * as select from '../actions/database/select.operation';
import * as update from '../actions/database/update.operation';
import * as upsert from '../actions/database/upsert.operation';
import type { OracleDBNodeCredentials, QueryWithValues } from '../helpers/interfaces';
import { configureQueryRunner } from '../helpers/utils';
import { configureOracleDB } from '../transport';

const mockConnection = {
	execute: jest.fn((_query = '') => {
		const result = {} as { rows: any[] };
		result.rows = [
			{
				COLUMN_NAME: 'AGE',
				DATA_TYPE: 'NUMBER',
				DATA_LENGTH: 22,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
				ROW_EXISTS: 1, // for letting update tests to go through in simulation mode
			},
			{
				COLUMN_NAME: 'EMBEDDING',
				DATA_TYPE: 'VECTOR',
				DATA_LENGTH: 8200,
				CHAR_LENGTH: 3,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'ID',
				DATA_TYPE: 'NUMBER',
				DATA_LENGTH: 22,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'N',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: 'C',
			},
			{
				COLUMN_NAME: 'IS_ACTIVE',
				DATA_TYPE: 'BOOLEAN',
				DATA_LENGTH: 1,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'JOIN_DATE',
				DATA_TYPE: 'DATE',
				DATA_LENGTH: 7,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'META_DATA',
				DATA_TYPE: 'JSON',
				DATA_LENGTH: 8200,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'NAME',
				DATA_TYPE: 'VARCHAR2',
				DATA_LENGTH: 100,
				CHAR_LENGTH: 100,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'PICTURE',
				DATA_TYPE: 'BLOB',
				DATA_LENGTH: 4000,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'PROFILE',
				DATA_TYPE: 'RAW',
				DATA_LENGTH: 2000,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
			{
				COLUMN_NAME: 'SALARY',
				DATA_TYPE: 'FLOAT',
				DATA_LENGTH: 22,
				CHAR_LENGTH: 0,
				DEFAULT_LENGTH: null,
				NULLABLE: 'Y',
				IDENTITY_COLUMN: 'NO',
				HAS_DEFAULT: 'NO',
				CONSTRAINT_TYPES: null,
			},
		];
		return result;
	}),
	close: jest.fn(),
	beginTransaction: jest.fn(),
	commit: jest.fn(),
	rollback: jest.fn(),
};

Object.defineProperty(mockConnection, 'oracleServerVersion', {
	get: () => 2305000000, // mimic server is 23ai
});

const createFakePool = (connection: IDataObject) => {
	return {
		getConnection() {
			return connection;
		},
	} as unknown as oracleDBTypes.Pool;
};

const node: INode = {
	id: '1',
	typeVersion: 1,
	name: 'Oracle Database node',
	type: 'n8n-nodes-starter-oracledb',
	position: [60, 760],
	parameters: {
		operation: 'execute',
	},
};

// Note: The password is read from environment just for testing purpose.
// In practice, it often uses some secure storage mechanism,
// such as Oracle Cloud Infrastructure (OCI) Vault or OCI Key Management Service (KMS),...
const CONFIG = {
	user: process.env.ORACLE_USER ?? 'VECTOR',
	password: process.env.ORACLE_PASSWORD ?? 'vector',
	connectionString: process.env.ORACLE_CONNECTSTRING ?? 'localhost:1521/freepdb1',
};

let continueOnFail = true;
let queries: QueryWithValues[] = [];
let queriesIndependent: QueryWithValues[] = [];
const integratedTests = process.env.ORACLE_INTEG_TESTS ?? false;

type RunQueriesFn = (
	queries: QueryWithValues[],
	inputItems: INodeExecutionData[],
	nodeOptions: IDataObject,
) => Promise<any>;

const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	const fakeExecuteFunction = {
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) {
			if (parameterName === 'columns.value') {
				const columns = nodeParameters.columns as IDataObject;
				const value = columns?.value;
				if (Array.isArray(value)) {
					return value[_itemIndex];
				}

				// fallback if not an array
				return value;
			}

			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			node.parameters = { ...node.parameters, ...(nodeParameters as INodeParameters) };
			return node;
		},
		getCredentials: () => {
			return CONFIG;
		},
		continueOnFail: () => {
			return continueOnFail;
		},
		helpers: {
			constructExecutionMetaData: jest.fn((data) => data),
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

export function getRunQueriesFn(
	mockThis: any,
	pool: oracleDBTypes.Pool,
): jest.Mock<ReturnType<RunQueriesFn>, Parameters<RunQueriesFn>> {
	if (integratedTests) {
		// Create the real query runner using the node context
		const realRunQueries: RunQueriesFn = configureQueryRunner.call(
			mockThis,
			mockThis.getNode(),
			mockThis.continueOnFail(),
			pool,
		);

		// Wrap the real one with a spy to track calls
		return jest.fn(async (...args: Parameters<RunQueriesFn>) => {
			return await realRunQueries(...args);
		});
	}

	// Default: return mock function with correct signature
	return jest.fn<ReturnType<RunQueriesFn>, Parameters<RunQueriesFn>>();
}

describe('Test All operations', () => {
	let pool: oracleDBTypes.Pool;
	const nodeParametersDef: IDataObject = {
		operation: 'execute',
	};
	const integratedTestsTimeOut = 200000; // connecting to DB and test it.
	const mockThisDef = createMockExecuteFunction(nodeParametersDef);
	const table = 'N8N_TEST_DEMO_TYPES';
	const deptTable = 'N8N_TEST_DEPT';
	const maxEmpName = 100;
	const createTbl = `CREATE TABLE if not exists ${table} (
    id           NUMBER          NOT NULL,
    name         VARCHAR2(${maxEmpName}),
    age          NUMBER(38),
    salary       FLOAT(126),
    join_date    DATE,
    is_active    BOOLEAN,
    meta_data    JSON,
    embedding    VECTOR(3, FLOAT32, DENSE),
		picture      BLOB,
		profile      RAW(2000)
)`;
	const dropTbl = `DROP TABLE if exists ${table}`;
	const truncateTbl = `TRUNCATE TABLE ${table}`;

	const createDeptTbl = `CREATE TABLE if not exists ${deptTable} (
  deptno NUMBER,
  empname VARCHAR2(100),
  location VARCHAR2(100))`;
	const truncateDeptTbl = `TRUNCATE TABLE ${deptTable}`;

	const insertSqls = [
		`INSERT INTO ${deptTable} (deptno, empname, location) VALUES (10, 'Alice', 'New York')`,
		`INSERT INTO ${deptTable} (deptno, empname, location) VALUES (10, 'Bob', 'New York')`,
		`INSERT INTO ${deptTable} (deptno, empname, location) VALUES (20, 'Charlie', 'Boston')`,
		`INSERT INTO ${table} (
  id, name, age, salary, join_date, is_active, meta_data, embedding, picture, profile
)
VALUES (
  1, 'Alice', 30, 75000.0, DATE '2020-01-15', TRUE,
  JSON_OBJECT('department' VALUE 'HR', 'location' VALUE 'New York' RETURNING JSON),
  VECTOR('[0.12, 0.34, 0.56]'), UTL_RAW.CAST_TO_RAW('binary_data_here for BLOB1'), UTL_RAW.CAST_TO_RAW('binary_data_here for RAW1')
)`,
		`INSERT INTO ${table} (
  id, name, age, salary, join_date, is_active, meta_data, embedding, picture, profile
)
VALUES (
  2, 'Bob', 45, 92000.5, DATE '2018-07-22', FALSE,
  JSON_OBJECT('department' VALUE 'Engineering', 'level' VALUE 3 RETURNING JSON),
  VECTOR('[0.78, 0.65, 0.43]'), UTL_RAW.CAST_TO_RAW('binary_data_here for BLOB2'), UTL_RAW.CAST_TO_RAW('binary_data_here for RAW2')
)`,
		`INSERT INTO ${table} (
  id, name, age, salary, join_date, is_active, meta_data, embedding, picture, profile
)
VALUES (
  3, 'Charlie', 28, 64000, DATE '2021-11-10', TRUE,
  JSON_OBJECT('department' VALUE 'Finance', 'location' VALUE 'Mumbai' RETURNING JSON),
  VECTOR('[0.5, 0.5, 0.5]'), UTL_RAW.CAST_TO_RAW('binary_data_here for BLOB3'), UTL_RAW.CAST_TO_RAW('binary_data_here for RAW3')
)`,
	];

	const dropDeptTbl = `DROP TABLE if exists ${deptTable}`;

	if (integratedTests) {
		jest.setTimeout(integratedTestsTimeOut);
	}

	async function populateRows(conn: oracleDBTypes.Connection) {
		if (conn) {
			for (const sql of insertSqls) {
				await conn.execute(sql, [], { autoCommit: true });
			}
		}
	}

	async function setup() {
		if (pool) {
			const conn = await pool.getConnection();
			await conn.execute(createTbl);
			await conn.execute(createDeptTbl);
			await populateRows(conn);
			await conn.close();
		}
	}

	/**
	 * Normalizes bind parameter maps by grouping and simplifying
	 * parameter names that share a common base but differ by unique suffixes (came from uuid).
	 *
	 * const input = {
	 *   Namese10bdb52_9f57_42c3_bfd4_ed880b94e186: { type: oracledb.STRING, val: "Alice" },
	 *   Names323b551b_0d6a_4657_8928_435f961554f1: { type: oracledb.STRING, val: "Bob" },
	 *   Dno: { type: oracledb.NUMBER, val: 10, dir: 3002 },
	 * };
	 *
	 * const output = normalizeParams(input);
	 * // output:
	 * // {
	 * //   Names: ["Alice", "Bob"],
	 * //   Dno: 10
	 * // }
	 */
	function normalizeParams(params: Record<string, any> | undefined) {
		if (!params) return params;

		const normalized: Record<string, any> = {};
		const groupMap: Record<string, any[]> = {};

		for (const [key, val] of Object.entries(params)) {
			const baseKey = key.replace(/[_\dA-Fa-f-]+$/, ''); // remove unique suffixes (UUID fragments,..)
			if (!groupMap[baseKey]) groupMap[baseKey] = [];
			groupMap[baseKey].push(val && typeof val === 'object' && 'val' in val ? val.val : val);
		}

		for (const [baseKey, values] of Object.entries(groupMap)) {
			// If there’s only one scalar value, store it directly
			normalized[baseKey] = values.length === 1 ? values[0] : [...values].sort();
		}

		return normalized;
	}

	const getInputItems = (items: any[]) => items.map((v) => ({ json: v }));

	const patchMockParams = (
		items: INodeExecutionData[],
		nodePars: IDataObject,
		mappingMode: 'defineBelow' | 'autoMapInputData' = 'defineBelow',
	) => {
		(nodePars.columns as any).value = structuredClone(items);
		(nodePars.columns as any).mappingMode = mappingMode;
		return createMockExecuteFunction(nodePars);
	};

	function verifyOutPutColumnsOptions(
		runQueries: jest.Mock<ReturnType<RunQueriesFn>, Parameters<RunQueriesFn>>,
		nodeOptions: IDataObject,
		inputItems: INodeExecutionData[],
		result: INodeExecutionData[],
	) {
		if (
			integratedTests &&
			Array.isArray(nodeOptions.outputColumns) &&
			((nodeOptions.outputColumns as string[]).includes('EMBEDDING') ||
				(nodeOptions.outputColumns as string[]).includes('*'))
		) {
			if (nodeOptions.stmtBatching === 'single') {
				expect(runQueries).toHaveBeenCalledWith(queries, inputItems, nodeOptions);
			} else {
				expect(runQueries).toHaveBeenCalledWith(queriesIndependent, inputItems, nodeOptions);
			}
			let actualEmbedding, actualID;
			if ((nodeOptions.outputColumns as string[]).includes('*')) {
				expect(
					result.map(({ json }) => {
						const { PICTURE, ...rest } = json; // skip comparing PICTURE column which is LOB

						return {
							...rest,
							EMBEDDING: new Float32Array(rest.EMBEDDING as number[]),
							PROFILE: Buffer.from(rest.PROFILE as Buffer),
						};
					}),
				).toEqual(
					inputItems.map(({ json }) => {
						const { PICTURE, ...rest } = json;

						return {
							...rest,
							EMBEDDING: new Float32Array(rest.EMBEDDING as number[]),
							PROFILE: Buffer.from(rest.PROFILE as Buffer),
						};
					}),
				);
			} else {
				for (let i = 0, j = 0; i < result.length; ) {
					const expectedEmbedding = inputItems[j].json.EMBEDDING;
					if (nodeOptions.stmtBatching === 'single') {
						actualEmbedding = result[i]?.json?.EMBEDDING;
						actualID = result[i]?.json?.ID;
					} else {
						actualEmbedding = result[i]?.json.EMBEDDING;
						actualID = result[i]?.json.ID;
					}
					expect(actualEmbedding).toEqual(new Float32Array(expectedEmbedding as number[]));
					const expectedID = inputItems[j].json.ID;
					expect(actualID).toEqual(expectedID as number);
					i = i + 2;
					j = j + 1;
				}
			}
		}
	}

	const runOperation = async ({
		operation = insert,
		items,
		nodePars,
		nodeOptions,
		continueOnFailValue,
		mappingMode = 'defineBelow',
		failedIndex = 1,
		errorPattern,
	}: {
		items: any[];
		continueOnFailValue: boolean;
		mappingMode?: 'defineBelow' | 'autoMapInputData';
		nodeOptions: IDataObject;
		errorPattern?: RegExp;
		failedIndex?: number;
		operation?: any;
		nodePars: IDataObject;
	}) => {
		const inputItems = getInputItems(items);
		const mock = patchMockParams(items, nodePars, mappingMode);
		continueOnFail = continueOnFailValue;
		const runQueries = getRunQueriesFn(mock, pool);

		if (errorPattern && !continueOnFailValue && integratedTests) {
			await expect(
				operation.execute.call(mock, runQueries, inputItems, nodeOptions, pool),
			).rejects.toThrow(errorPattern);
			return;
		}

		const result = await operation.execute.call(mock, runQueries, inputItems, nodeOptions, pool);
		expect(runQueries).toHaveBeenCalled();

		// check the arguments passed to runQueries are as expected.
		const [_, actualItems, actualOptions] = runQueries.mock.calls[0];
		actualItems.forEach((item, index) => {
			expect(item.json).toEqual(items[index]);
		});
		expect(actualOptions).toBe(nodeOptions);

		if (!errorPattern && Array.isArray(nodeOptions.outputColumns)) {
			if (nodeOptions.stmtBatching === 'single') {
				expect(runQueries).toHaveBeenCalledWith(queries, inputItems, nodeOptions);
			} else {
				expect(runQueries).toHaveBeenCalledWith(queriesIndependent, inputItems, nodeOptions);
			}

			// Validate outputColumns match for successful batch insert.
			verifyOutPutColumnsOptions(runQueries, nodeOptions, inputItems, result);
		}

		// Validate results based on stmtBatching
		if (integratedTests) {
			if (errorPattern && continueOnFailValue) {
				if (nodeOptions.stmtBatching === 'single') {
					// For single , we just show batch errors.
					expect(result[0].json.message).toMatch(errorPattern);
					expect(result[0].pairedItem.item).toBe(failedIndex);
				} else {
					// For independent, we return successful outbinds and also an
					// error message for failed items.
					let index = 0;
					if (nodeOptions.outputColumns) {
						// For outputcolumns option, we pass second item index with wrong values.
						index = 1;
					}
					expect(result[index].json.message).toMatch(errorPattern);
					expect(result[index].pairedItem.item).toBe(failedIndex);
				}
			}
		}
	};

	beforeEach(async function () {
		if (integratedTests) {
			if (pool) {
				const conn = await pool.getConnection();
				await conn.execute(truncateTbl);
				await conn.execute(truncateDeptTbl);
				await populateRows(conn);
				await conn.close();
			}
		}
	});

	beforeAll(async function () {
		if (integratedTests) {
			const credentials = await mockThisDef.getCredentials<OracleDBNodeCredentials>('oracleDBApi');
			pool = await configureOracleDB.call(mockThisDef, credentials, {});
			await setup();
		} else {
			pool = createFakePool(mockConnection);
		}
	});

	afterAll(async function () {
		if (integratedTests) {
			const conn = await pool.getConnection();
			await conn.execute(dropTbl);
			await conn.execute(dropDeptTbl);
			await conn.close();
			await pool?.close();
		}
	});

	it('should have all operations', () => {
		expect(deleteTable.execute).toBeDefined();
		expect(deleteTable.description).toBeDefined();
		expect(executeSQL.execute).toBeDefined();
		expect(executeSQL.description).toBeDefined();
		expect(insert.execute).toBeDefined();
		expect(insert.description).toBeDefined();
		expect(select.execute).toBeDefined();
		expect(select.description).toBeDefined();
		expect(update.execute).toBeDefined();
		expect(update.description).toBeDefined();
		expect(upsert.execute).toBeDefined();
		expect(upsert.description).toBeDefined();
	});

	describe('Test delete operation', () => {
		afterEach(() => {
			jest.clearAllMocks();
		});

		const docid = 1;
		const testCases = [
			{
				condition: 'LIKE',
				value: docid,
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" LIKE :0`,
				bindVal: { type: oracleDBTypes.NUMBER, val: docid },
			},
			{
				condition: '>',
				value: docid,
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" > :0`,
				bindVal: { type: oracleDBTypes.NUMBER, val: docid },
			},
			{
				condition: 'equal',
				value: docid,
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" = :0`,
				bindVal: { type: oracleDBTypes.NUMBER, val: docid },
			},
			{
				condition: 'IS NULL',
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" IS NULL`,
			},
			{
				condition: 'IS NOT NULL',
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" IS NOT NULL`,
			},
			{
				condition: 'IS NOT NULL',
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" IS NOT NULL`,
				options: {
					stmtBatching: 'transaction',
				},
			},
			{
				condition: 'equal',
				value: docid,
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" = :0`,
				executeManyValues: [[1]],
				options: {
					bindDefs: [{ type: oracleDBTypes.NUMBER }],
					stmtBatching: 'single',
				},
			},
			{
				condition: 'IS NOT NULL',
				expectedQuery: `DELETE FROM "${CONFIG.user}"."${table}" WHERE "ID" IS NOT NULL`,
				executeManyValues: [[undefined]],
				options: {
					bindDefs: [],
					stmtBatching: 'single',
				},
			},
		];

		it.each(testCases)(
			'should handle condition: %s',
			async ({
				condition,
				value,
				expectedQuery,
				bindVal,
				executeManyValues,
				options = {
					stmtBatching: 'independently',
				},
			}) => {
				const nodeParameters: IDataObject = {
					operation: 'deleteTable',
					schema: {
						__rl: true,
						mode: 'list',
						value: CONFIG.user,
					},
					table: {
						__rl: true,
						value: table,
						mode: 'list',
						cachedResultName: table,
					},
					options,
					deleteCommand: 'delete',
					where: {
						values: [
							{
								column: 'ID',
								condition,
								value,
							},
						],
					},
				};

				const nodeOptions = nodeParameters.options as IDataObject;

				const mockThis = createMockExecuteFunction(nodeParameters);
				const emptyInputItems = [{ json: {}, pairedItem: { item: 0, input: undefined } }];
				const runQueries = getRunQueriesFn(mockThis, pool);

				await deleteTable.execute.call(mockThis, runQueries, emptyInputItems, nodeOptions, pool);

				const queries = [];
				if (executeManyValues) {
					queries.push({
						query: expectedQuery,
						executeManyValues,
					});
				} else {
					queries.push({
						query: expectedQuery,
						values: [bindVal],
					});
				}
				expect(runQueries).toHaveBeenCalledWith(queries, emptyInputItems, nodeOptions);
			},
		);
	});

	describe('Test execute operation', () => {
		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should call runQueries with binds passed using bindInfo and single item', async () => {
			const expectedQuery = 'SELECT :en as name, dname from dept where deptno = :dno';
			const items = [
				{
					json: {
						DEPTNO: 10,
						EMPNAME: 'ALICE',
					},
					pairedItem: {
						item: 0,
						input: undefined,
					},
				},
			];
			const nodeParameters: IDataObject = {
				operation: 'execute',
				query: expectedQuery,
				isBindInfo: true,
				resource: 'database',
				options: {
					params: {
						values: [
							{
								name: 'Dno',
								// JSON Expression like value: "={{ $json.DEPTNO }}" needs
								// to mock getParameterValue, so giving value directly.
								valueNumber: 10,
								datatype: 'number',
								parseInStatement: false,
							},
							{
								name: 'En',
								valueString: 'ALICE',
								datatype: 'string',
								parseInStatement: false,
							},
						],
					},
				},
			};
			const mockThis = createMockExecuteFunction(nodeParameters);
			const runQueries = getRunQueriesFn(mockThis, pool);

			const nodeOptions = nodeParameters.options as IDataObject;

			await executeSQL.execute.call(mockThis, runQueries, items, nodeOptions, pool);

			// Assert that runQueries was called with expected query and bind values
			expect(runQueries).toHaveBeenCalledTimes(1);
			const callArgs = runQueries.mock.calls[0] as [QueryWithValues[], unknown, unknown];
			const [expectedArgs] = callArgs;
			const val = {
				Dno: {
					type: oracleDBTypes.NUMBER,
					val: 10,
					dir: 3002,
				},
				En: {
					type: oracleDBTypes.DB_TYPE_VARCHAR,
					val: 'ALICE',
					dir: 3002,
				},
			};

			expect(expectedArgs).toHaveLength(1);
			expect(expectedArgs[0].query).toBe(expectedQuery);
			expect(expectedArgs[0].values).toEqual(val);
		});

		it.each([
			{
				title: 'should call runQueries with binds passed using bindInfo with parseIn as true',
				queryTemplate: (deptTable: string) =>
					`SELECT * FROM ${deptTable} WHERE deptno = :Dno AND empname IN :Names`,
				bindValues: [
					{ name: 'Dno', valueNumber: 10, datatype: 'number', parseInStatement: false },
					{ name: 'Names', valueString: 'Alice,Bob', datatype: 'string', parseInStatement: true },
				],
				expectedVal: {
					Dno: { type: oracleDBTypes.NUMBER, val: 10, dir: 3002 },
					Names: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Alice', dir: 3002 },
					Names2: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Bob', dir: 3002 },
				},
				expectedRegex:
					/^SELECT \* FROM N8N_TEST_DEPT WHERE deptno = :Dno AND empname IN \(:Names[\w_]+(,:Names[\w_]+)*\)$/,
			},
			{
				title:
					'should call runQueries with binds passed using bindInfo with parseIn as true with _ in bindname',
				queryTemplate: (deptTable: string) =>
					`SELECT * FROM ${deptTable} WHERE deptno = :Dno AND empname IN :Names_`,
				bindValues: [
					{ name: 'Dno', valueNumber: 10, datatype: 'number', parseInStatement: false },
					{ name: 'Names_', valueString: 'Alice,Bob', datatype: 'string', parseInStatement: true },
				],
				expectedVal: {
					Dno: { type: oracleDBTypes.NUMBER, val: 10, dir: 3002 },
					Names_: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Alice', dir: 3002 },
					Names_2: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Bob', dir: 3002 },
				},
				expectedRegex:
					/^SELECT \* FROM N8N_TEST_DEPT WHERE deptno = :Dno AND empname IN \(:Names_[\w_]+(,:Names_[\w_]+)*\)$/,
			},
			{
				title:
					'should call runQueries with binds passed using bindInfo with parseIn as true with $ in bindname',
				queryTemplate: (deptTable: string) =>
					`SELECT * FROM ${deptTable} WHERE deptno = :Dno AND empname IN :Names_ex2$`,
				bindValues: [
					{ name: 'Dno', valueNumber: 10, datatype: 'number', parseInStatement: false },
					{
						name: 'Names_ex2$',
						valueString: 'Alice,Bob',
						datatype: 'string',
						parseInStatement: true,
					},
				],
				expectedVal: {
					Dno: { type: oracleDBTypes.NUMBER, val: 10, dir: 3002 },
					Names_ex2$1: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Alice', dir: 3002 },
					Names_ex2$2: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Bob', dir: 3002 },
				},
				expectedRegex:
					/^SELECT \* FROM N8N_TEST_DEPT WHERE deptno = :Dno AND empname IN \(:Names_ex2\$[\w_]+(,:Names_ex2\$[\w_]+)*\)$/,
			},
			{
				title:
					'should call runQueries with binds passed using partial matching bindInfo with parseIn as true',
				queryTemplate: (deptTable: string) =>
					`SELECT * FROM ${deptTable} WHERE deptno = :Names1 AND empname IN :Names`,
				bindValues: [
					{ name: 'Names1', valueNumber: 10, datatype: 'number', parseInStatement: false },
					{ name: 'Names', valueString: 'Alice,Bob', datatype: 'string', parseInStatement: true },
				],
				expectedVal: {
					Names1: { type: oracleDBTypes.NUMBER, val: 10, dir: 3002 },
					Names: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Alice', dir: 3002 },
					Names2: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Bob', dir: 3002 },
				},
				expectedRegex:
					/^SELECT \* FROM N8N_TEST_DEPT WHERE deptno = :Names1 AND empname IN \(:Names[\w_]+(,:Names[\w_]+)*\)$/,
			},
			{
				title:
					'should correctly expand IN clause for single scalar bind value (SELECT :param1 ...)',
				queryTemplate: () => 'SELECT :param1 FROM DUAL WHERE DUMMY IN :param1',
				bindValues: [
					{ name: 'param1', valueString: 'X', datatype: 'string', parseInStatement: true },
				],
				expectedVal: {
					param1: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'X', dir: 3002 },
				},
				expectedRegex:
					/^SELECT\s*\(?:param1[\w_]*\)?\s*FROM\s*DUAL\s*WHERE\s*DUMMY\s*IN\s*\(:param1[\w_]*\)$/,
			},
			{
				title: 'should correctly handle SELECT * FROM dual where DUMMY in :param1',
				queryTemplate: () => 'SELECT * FROM DUAL WHERE DUMMY IN :param1',
				bindValues: [
					{ name: 'param1', valueString: 'X,Y', datatype: 'string', parseInStatement: true },
				],
				expectedVal: {
					param1: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'X', dir: 3002 },
					param12: { type: oracleDBTypes.DB_TYPE_VARCHAR, val: 'Y', dir: 3002 },
				},
				expectedRegex: /^SELECT \* FROM DUAL WHERE DUMMY IN \(:param1[\w_]+(,:param1[\w_]+)*\)$/,
			},
		])('$title', async ({ queryTemplate, bindValues, expectedVal, expectedRegex }) => {
			const expectedQuery = queryTemplate(deptTable);

			const items = [
				{
					json: { DEPTNO: 10, EMPNAME: 'Alice, Bob' },
					pairedItem: { item: 0, input: undefined },
				},
			];

			const nodeParameters: IDataObject = {
				operation: 'execute',
				query: expectedQuery,
				isBindInfo: true,
				resource: 'database',
				options: {
					params: { values: bindValues },
				},
			};

			const mockThis = createMockExecuteFunction(nodeParameters);
			const nodeOptions = nodeParameters.options as IDataObject;
			const runQueries = getRunQueriesFn(mockThis, pool);
			const result = await executeSQL.execute.call(mockThis, runQueries, items, nodeOptions, pool);

			if (integratedTests && expectedQuery.includes('N8N_TEST_DEPT')) {
				// Only check DB data when using the department table.
				const normalize = (arr: any) =>
					arr
						.map((e: { json: any }) => e.json)
						.sort((a: { EMPNAME: string }, b: { EMPNAME: any }) =>
							a.EMPNAME.localeCompare(b.EMPNAME),
						);

				expect(normalize(result)).toEqual(
					normalize([
						{ json: { DEPTNO: 10, EMPNAME: 'Bob', LOCATION: 'New York' } },
						{ json: { DEPTNO: 10, EMPNAME: 'Alice', LOCATION: 'New York' } },
					]),
				);
			}

			expect(runQueries).toHaveBeenCalledTimes(1);

			const callArgs = runQueries.mock.calls[0] as [QueryWithValues[], unknown, unknown];
			const [expectedArgs] = callArgs;

			expect(expectedArgs).toHaveLength(1);
			expect(expectedArgs[0].query).toMatch(expectedRegex);
			expect(normalizeParams(expectedArgs[0].values)).toEqual(normalizeParams(expectedVal));
		});

		it('should call runQueries with out binds in plsql using bindInfo and multiple items', async () => {
			const expectedQuery = `
			BEGIN
				:out_value1 := :in_value * 2;
				:out_value2 := :in_value + 10;
				:out_value3 := :in_value * :in_value;
			END;`;
			const makeItem = (i: number) => ({
				json: { in_value: 10 },
				pairedItem: { item: i, input: undefined },
			});
			const items = [makeItem(0), makeItem(1)];
			const outParams = ['out_value1', 'out_value2', 'out_value3'];
			const nodeParameters: IDataObject = {
				operation: 'execute',
				query: expectedQuery,
				isBindInfo: true,
				resource: 'database',
				options: {
					params: {
						values: [
							{
								name: 'in_value',
								valueNumber: 10,
								datatype: 'number',
								parseInStatement: false,
							},
							...outParams.map((name) => ({
								name,
								datatype: 'number',
								parseInStatement: false,
								bindDirection: 'out',
							})),
						],
					},
				},
			};

			const mockThis = createMockExecuteFunction(nodeParameters);
			const runQueries = getRunQueriesFn(mockThis, pool);
			const nodeOptions = nodeParameters.options as IDataObject;
			const result = await executeSQL.execute.call(mockThis, runQueries, items, nodeOptions, pool);

			if (integratedTests) {
				for (const r of result) {
					expect(r.json).toMatchObject({
						out_value1: 20,
						out_value2: 20,
						out_value3: 100,
					});
				}
			}

			expect(runQueries).toHaveBeenCalledTimes(1);

			const [calls] = runQueries.mock.calls[0] as [QueryWithValues[], unknown, unknown];
			expect(calls).toHaveLength(2);

			const expectedValues = {
				in_value: { type: oracleDBTypes.NUMBER, val: 10, dir: 3002 },
				out_value1: { type: oracleDBTypes.NUMBER, dir: 3003 },
				out_value2: { type: oracleDBTypes.NUMBER, dir: 3003 },
				out_value3: { type: oracleDBTypes.NUMBER, dir: 3003 },
			};

			calls.forEach((arg) => {
				expect(arg.query).toBe(expectedQuery);
				expect(arg.values).toEqual(expectedValues);
			});
		});

		it('should call runQueries with binds passed in sql using bindInfo and single item', async () => {
			const expectedQuery = `INSERT INTO ${deptTable} (DEPTNO, EMPNAME) VALUES(:DNO, :ENAME) RETURNING EMPNAME INTO :OUTENAME`;
			const items = [
				{
					json: {
						DEPTNO: 100,
						EMPNAME: 'ALICE',
					},
					pairedItem: {
						item: 0,
						input: undefined,
					},
				},
			];
			const nodeParameters: IDataObject = {
				operation: 'execute',
				query: expectedQuery,
				isBindInfo: true,
				resource: 'database',
				options: {
					params: {
						values: [
							{
								name: 'DNO',
								valueNumber: 100,
								datatype: 'number',
								parseInStatement: false,
							},
							{
								name: 'ENAME',
								valueString: 'ALICE',
								datatype: 'string',
								parseInStatement: false,
							},
							{
								name: 'OUTENAME',
								datatype: 'string',
								bindDirection: 'out',
								parseInStatement: false,
							},
						],
					},
				},
			};
			const mockThis = createMockExecuteFunction(nodeParameters);
			const runQueries = getRunQueriesFn(mockThis, pool);

			const nodeOptions = nodeParameters.options as IDataObject;

			const result = await executeSQL.execute.call(mockThis, runQueries, items, nodeOptions, pool);
			if (integratedTests) {
				for (const r of result) {
					expect(r.json).toMatchObject({
						DNO: 100,
						ENAME: 'ALICE',
						OUTENAME: 'ALICE',
					});
				}
			}

			// Assert that runQueries was called with expected query and bind values
			expect(runQueries).toHaveBeenCalledTimes(1);
			const callArgs = runQueries.mock.calls[0] as [QueryWithValues[], unknown, unknown];
			const [expectedArgs] = callArgs;
			const val = {
				DNO: {
					type: oracleDBTypes.NUMBER,
					val: 100,
					dir: 3002,
				},
				ENAME: {
					type: oracleDBTypes.DB_TYPE_VARCHAR,
					val: 'ALICE',
					dir: 3002,
				},
				OUTENAME: {
					type: oracleDBTypes.STRING,
					dir: 3003,
					val: undefined,
				},
			};

			expect(expectedArgs).toHaveLength(1);
			expect(expectedArgs[0].query).toBe(expectedQuery);
			expect(expectedArgs[0].values).toEqual(val);
		});

		it('should bind NULL, valid, and mixed values correctly for all supported column types', async () => {
			const expectedQuery = `INSERT INTO ${table} (
		id, name, age, salary, join_date, is_active, meta_data, embedding, picture) VALUES (
		:ID, :NAME, :AGE, :SALARY, :JOIN_DATE, :IS_ACTIVE, :META_DATA, :EMBEDDING, :PICTURE)`;

			const DOJ = '2024-01-15T00:00:00.000Z';

			const inputs = [
				{
					label: 'non-null values',
					expectedId: 1,
					items: [
						{
							json: {
								ID: 1,
								NAME: 'Alice',
								AGE: 30,
								SALARY: 75000.5,
								JOIN_DATE: DOJ,
								IS_ACTIVE: true,
								META_DATA: { team: 'AI', level: 5 },
								EMBEDDING: [0.1, 0.2, 0.3],
								PICTURE: Buffer.from('hello world'),
							},
						},
					],
					params: [
						{ name: 'ID', valueNumber: 1, datatype: 'number' },
						{ name: 'NAME', valueString: 'Alice', datatype: 'string' },
						{ name: 'AGE', valueNumber: 30, datatype: 'number' },
						{ name: 'SALARY', valueNumber: 75000.5, datatype: 'number' },
						{ name: 'JOIN_DATE', valueDate: DOJ, datatype: 'date' },
						{ name: 'IS_ACTIVE', valueBoolean: true, datatype: 'boolean' },
						{ name: 'META_DATA', valueJson: { team: 'AI', level: 5 }, datatype: 'json' },
						{ name: 'EMBEDDING', valueVector: [0.1, 0.2, 0.3], datatype: 'vector' },
						{ name: 'PICTURE', valueBlob: Buffer.from('hello world'), datatype: 'blob' },
					],
				},
				{
					label: 'null values',
					expectedId: 2,
					items: [
						{
							json: {
								ID: 2,
								NAME: null,
								AGE: null,
								SALARY: null,
								JOIN_DATE: null,
								IS_ACTIVE: null,
								META_DATA: null,
								EMBEDDING: null,
								PICTURE: null,
							},
						},
					],
					params: [
						{ name: 'ID', valueNumber: 2, datatype: 'number' },
						{ name: 'NAME', valueString: null, datatype: 'string' },
						{ name: 'AGE', valueNumber: null, datatype: 'number' },
						{ name: 'SALARY', valueNumber: null, datatype: 'number' },
						{ name: 'JOIN_DATE', valueDate: null, datatype: 'date' },
						{ name: 'IS_ACTIVE', valueBoolean: null, datatype: 'boolean' },
						{ name: 'META_DATA', valueJson: null, datatype: 'json' },
						{ name: 'EMBEDDING', valueVector: null, datatype: 'vector' },
						{ name: 'PICTURE', valueBlob: null, datatype: 'blob' },
					],
				},
				{
					label: 'mixed values',
					expectedId: 3,
					items: [
						{
							json: {
								ID: 3,
								NAME: null, // mix of null + valid
								AGE: 45,
								SALARY: null,
								JOIN_DATE: DOJ,
								IS_ACTIVE: false,
								META_DATA: null,
								EMBEDDING: [0.5, 0.6, 3.4],
								PICTURE: { type: 'Buffer', data: [14, 15, 16] },
							},
						},
					],
					params: [
						{ name: 'ID', valueNumber: 3, datatype: 'number' },
						{ name: 'NAME', valueString: null, datatype: 'string' },
						{ name: 'AGE', valueNumber: 45, datatype: 'number' },
						{ name: 'SALARY', valueNumber: null, datatype: 'number' },
						{ name: 'JOIN_DATE', valueDate: DOJ, datatype: 'date' },
						{ name: 'IS_ACTIVE', valueBoolean: false, datatype: 'boolean' },
						{ name: 'META_DATA', valueJson: null, datatype: 'json' },
						{ name: 'EMBEDDING', valueVector: [0.5, 0.6, 3.4], datatype: 'vector' },
						{
							name: 'PICTURE',
							valueBlob: { type: 'Buffer', data: [14, 15, 16] },
							datatype: 'blob',
						},
					],
				},
			];

			for (const input of inputs) {
				const nodeParameters: IDataObject = {
					operation: 'execute',
					query: expectedQuery,
					isBindInfo: true,
					resource: 'database',
					options: {
						params: {
							values: input.params,
						},
					},
				};

				const mockThis = createMockExecuteFunction(nodeParameters);
				const runQueries = getRunQueriesFn(mockThis, pool);
				const nodeOptions = nodeParameters.options as IDataObject;

				const result = await executeSQL.execute.call(
					mockThis,
					runQueries,
					input.items,
					nodeOptions,
					pool,
				);

				expect(runQueries).toHaveBeenCalled();

				const [expectedArgs] = runQueries.mock.calls.pop() as [QueryWithValues[], unknown, unknown];
				expect(expectedArgs).toHaveLength(1);
				expect(expectedArgs[0].query).toBe(expectedQuery);

				const binds = expectedArgs[0].values;

				// Dynamic assertions per input type
				for (const [key, bind] of Object.entries(binds as Record<string, { val: any }>)) {
					if (key === 'ID') {
						expect(bind.val).toBe(input.expectedId);
					} else {
						const original = (input.items[0].json as Record<string, any>)[key];
						if (original === null || original === undefined) {
							expect(bind.val).toBeNull();
						} else if (key === 'JOIN_DATE') {
							expect(bind.val instanceof Date).toBe(true);
							expect((bind.val as Date).toISOString()).toBe(DOJ);
						} else if (key === 'PICTURE' && original.type === 'Buffer') {
							// serialized form
							expect(bind.val).toEqual(Buffer.from(original));
						} else {
							expect(bind.val).toEqual(original);
						}
					}
				}

				// Optional integrated check
				if (integratedTests) {
					const row = result[0].json;
					expect(row.ID).toBe(input.expectedId);
					for (const [key, val] of Object.entries(row)) {
						if (key === 'ID' || key === 'PICTURE') continue;
						const original = (input.items[0].json as Record<string, any>)[key];
						if (original === null || original === undefined) {
							expect(val === null || val === undefined).toBe(true);
						} else if (key === 'JOIN_DATE') {
							expect((val as Date).toISOString()).toBe(DOJ);
						} else if (key === 'META_DATA') {
							continue;
						} else if (key === 'EMBEDDING') {
							expect(Array.from(val as Float64Array)).toEqual(original);
						} else {
							expect(val).toEqual(original);
						}
					}
				}
			}
		});
	});

	describe('Test select operation', () => {
		const items = [{ json: {} }];

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('returnAll, should call runQueries with', async () => {
			const nodeParameters: IDataObject = {
				operation: 'select',
				schema: {
					__rl: true,
					mode: 'list',
					value: CONFIG.user,
				},
				table: {
					__rl: true,
					value: table,
					mode: 'list',
					cachedResultName: table,
				},
				returnAll: true,
				options: {},
			};
			const mockThis = createMockExecuteFunction(nodeParameters);
			const runQueries = getRunQueriesFn(mockThis, pool);
			const nodeOptions = nodeParameters.options as IDataObject;

			await select.execute.call(mockThis, runQueries, items, nodeOptions, pool);

			expect(runQueries).toHaveBeenCalledWith(
				[
					{
						query: `SELECT * FROM "${CONFIG.user}"."${table}"`,
						values: [],
					},
				],
				items,
				nodeOptions,
			);
		});

		const getWhereClause = (
			condition1: string = 'equal',
			val1: number = 2,
			condition2: string = 'equal',
			val2 = { department: 'Engineering', level: 3 },
		) => {
			const retObj: { values: any[] } = { values: [] };
			let inval1: any = val1;

			if (condition1 === 'IS NULL' || condition1 === 'IS NOT NULL') {
				inval1 = undefined;
			}

			retObj.values.push({
				column: 'ID',
				condition: condition1,
				value: inval1,
			});

			retObj.values.push({
				column: 'META_DATA',
				condition: condition2,
				value: val2,
			});

			return retObj;
		};
		const fixedValues = {
			bindVal: [
				{
					type: oracleDBTypes.NUMBER,
					val: 2,
				},
				{
					type: oracleDBTypes.DB_TYPE_JSON,
					val: {
						department: 'Engineering',
						level: 3,
					},
				},
			],
			inOptions: {
				stmtBatching: 'independently',
				outputColumns: ['META_DATA', 'EMBEDDING'],
			},
		};
		const testCases = [
			{
				...fixedValues,
				whereClause: getWhereClause('>='),
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" >= :0 AND "META_DATA" = :1 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: {
					department: 'Engineering',
					level: 3,
				},
			},
			{
				...fixedValues,
				whereClause: getWhereClause('!='),
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" != :0 AND "META_DATA" = :1 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: null,
			},
			{
				...fixedValues,
				whereClause: getWhereClause('equal', 2, 'LIKE'),
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" = :0 AND "META_DATA" LIKE :1 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: {
					department: 'Engineering',
					level: 3,
				},
			},
			{
				...fixedValues,
				whereClause: getWhereClause('>', 2, 'LIKE'),
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" > :0 AND "META_DATA" LIKE :1 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: null,
			},
			{
				...fixedValues,
				whereClause: getWhereClause('<', 2, 'LIKE'),
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" < :0 AND "META_DATA" LIKE :1 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: null,
			},
			{
				...fixedValues,
				whereClause: getWhereClause('IS NULL'),
				bindVal: [fixedValues.bindVal[1]],
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" IS NULL AND "META_DATA" = :0 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: null,
			},
			{
				...fixedValues,
				whereClause: getWhereClause('IS NOT NULL'),
				bindVal: [fixedValues.bindVal[1]],
				expectedQuery: `SELECT "META_DATA","EMBEDDING" FROM "${CONFIG.user}"."${table}" WHERE "ID" IS NOT NULL AND "META_DATA" = :0 ORDER BY "ID" ASC FETCH FIRST 5 ROWS ONLY`,
				expectedResultMetadata: {
					department: 'Engineering',
					level: 3,
				},
			},
		];

		it.each(testCases)(
			'should handle condition: %s',
			async ({ whereClause, expectedQuery, bindVal, inOptions, expectedResultMetadata }) => {
				const nodeParameters: IDataObject = {
					operation: 'select',
					schema: {
						__rl: true,
						mode: 'list',
						value: CONFIG.user,
					},
					table: {
						__rl: true,
						value: table,
						mode: 'list',
						cachedResultName: table,
					},
					limit: 5,
					where: whereClause,
					sort: {
						values: [
							{
								column: 'ID',
							},
						],
					},
					options: inOptions,
				};
				const nodeOptions = nodeParameters.options as IDataObject;
				const mockThis = createMockExecuteFunction(nodeParameters);
				const runQueries = getRunQueriesFn(mockThis, pool);
				const result = await select.execute.call(mockThis, runQueries, items, nodeOptions, pool);

				expect(runQueries).toHaveBeenCalledWith(
					[
						{
							query: expectedQuery,
							values: bindVal,
						},
					],
					items,
					nodeOptions,
				);

				if (integratedTests) {
					if (expectedResultMetadata) {
						expect(result).toHaveLength(1);
						expect(result[0].json.META_DATA).toEqual(expectedResultMetadata);
					} else {
						expect(result[0].json).toEqual({ success: true });
					}
				}
			},
		);
	});

	describe('Test insert operation', () => {
		const joinDate = new Date(2024, 0, 1, 14, 30, 0);
		const insertId = 129;

		const baseItems = [
			{
				ID: insertId,
				NAME: 'BOB',
				AGE: 39,
				SALARY: 4500,
				JOIN_DATE: joinDate,
				IS_ACTIVE: false,
				META_DATA: {
					address: 'BLR',
					pincode: 560126,
				},
				EMBEDDING: [3, 4, 9],
				PICTURE: [20, 30, 45],
				PROFILE: [32, 34, 55],
			},
			{
				ID: insertId + 1,
				NAME: 'Alice',
				AGE: 39,
				SALARY: 4500,
				JOIN_DATE: joinDate,
				IS_ACTIVE: false,
				META_DATA: {
					address: 'SVL',
					pincode: 560126,
				},
				EMBEDDING: [3, 5, 9],
				PICTURE: [22, 30, 55],
				PROFILE: [2, 35, 56],
			},
		];

		const expectedQuery = `INSERT INTO "${CONFIG.user}"."${table}" ("ID","NAME","AGE","SALARY","JOIN_DATE","IS_ACTIVE","META_DATA","EMBEDDING","PICTURE","PROFILE") VALUES (:0,:1,:2,:3,:4,:5,:6,:7,:8,:9) RETURNING "EMBEDDING", "ID" INTO :10, :11`;

		const expectedQueryAllOuts = `INSERT INTO "${CONFIG.user}"."${table}" ("ID","NAME","AGE","SALARY","JOIN_DATE","IS_ACTIVE","META_DATA","EMBEDDING","PICTURE","PROFILE") VALUES (:0,:1,:2,:3,:4,:5,:6,:7,:8,:9) RETURNING "AGE", "EMBEDDING", "ID", "IS_ACTIVE", "JOIN_DATE", "META_DATA", "NAME", "PICTURE", "PROFILE", "SALARY" INTO :10, :11, :12, :13, :14, :15, :16, :17, :18, :19`;

		const expectedValues = baseItems.map((v) => [
			v.ID,
			v.NAME,
			v.AGE,
			v.SALARY,
			v.JOIN_DATE,
			v.IS_ACTIVE,
			v.META_DATA,
			v.EMBEDDING,
			Buffer.from(v.PICTURE),
			Buffer.from(v.PROFILE),
		]);

		const expectedBindValuesForIndependent = baseItems.map((v) => [
			{ type: oracleDBTypes.NUMBER, val: v.ID },
			{ type: oracleDBTypes.DB_TYPE_VARCHAR, val: v.NAME },
			{ type: oracleDBTypes.NUMBER, val: v.AGE },
			{ type: oracleDBTypes.NUMBER, val: v.SALARY },
			{ type: oracleDBTypes.DB_TYPE_TIMESTAMP, val: v.JOIN_DATE },
			{ type: oracleDBTypes.DB_TYPE_BOOLEAN, val: v.IS_ACTIVE },
			{ type: oracleDBTypes.DB_TYPE_JSON, val: v.META_DATA },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, val: v.EMBEDDING },
			{ type: oracleDBTypes.DB_TYPE_BLOB, val: Buffer.from(v.PICTURE) },
			{ type: oracleDBTypes.DB_TYPE_RAW, val: Buffer.from(v.PROFILE) },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_NUMBER, dir: 3003 },
		]);

		const expectedBindValuesForIndependentAllOutputColumns = baseItems.map((v) => [
			{ type: oracleDBTypes.NUMBER, val: v.ID },
			{ type: oracleDBTypes.DB_TYPE_VARCHAR, val: v.NAME },
			{ type: oracleDBTypes.NUMBER, val: v.AGE },
			{ type: oracleDBTypes.NUMBER, val: v.SALARY },
			{ type: oracleDBTypes.DB_TYPE_TIMESTAMP, val: v.JOIN_DATE },
			{ type: oracleDBTypes.DB_TYPE_BOOLEAN, val: v.IS_ACTIVE },
			{ type: oracleDBTypes.DB_TYPE_JSON, val: v.META_DATA },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, val: v.EMBEDDING },
			{ type: oracleDBTypes.DB_TYPE_BLOB, val: Buffer.from(v.PICTURE) },
			{ type: oracleDBTypes.DB_TYPE_RAW, val: Buffer.from(v.PROFILE) },
			{ type: oracleDBTypes.NUMBER, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_NUMBER, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_BOOLEAN, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_TIMESTAMP, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_JSON, dir: 3003 },
			{ type: oracleDBTypes.STRING, dir: 3003, maxSize: 100 },
			{ type: oracleDBTypes.DB_TYPE_BLOB, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_RAW, dir: 3003, maxSize: 2000 },
			{ type: oracleDBTypes.NUMBER, dir: 3003 },
		]);

		beforeAll(function () {
			queries = [
				{
					query: expectedQuery,
					executeManyValues: expectedValues,
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
			queriesIndependent = [
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[0],
					outputColumns: ['EMBEDDING', 'ID'],
				},
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[1],
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
		});

		const nodeParameters: IDataObject = {
			operation: 'insert',
			schema: {
				__rl: true,
				mode: 'list',
				value: CONFIG.user,
			},
			table: {
				__rl: true,
				value: table,
				mode: 'list',
				cachedResultName: table,
			},
			options: {
				stmtBatching: 'single',
				outputColumns: ['EMBEDDING', 'ID'],
			},
			columns: {
				mappingMode: 'defineBelow',
				value: baseItems,
			},
		};

		let originalColumnsValue: any;
		beforeEach(() => {
			originalColumnsValue = structuredClone((nodeParameters.columns as any)?.value);
		});

		afterEach(() => {
			jest.clearAllMocks();
			continueOnFail = false;
			if (originalColumnsValue) {
				(nodeParameters.columns as any).value = originalColumnsValue;
			}
			queriesIndependent = [
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[0],
					outputColumns: ['EMBEDDING', 'ID'],
				},
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[1],
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
			queries = [
				{
					query: expectedQuery,
					executeManyValues: expectedValues,
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
		});

		it('should insert valid data (defineBelow) with select all outputcolumns independently batch mode', async () => {
			queriesIndependent[0].outputColumns = [
				'AGE',
				'EMBEDDING',
				'ID',
				'IS_ACTIVE',
				'JOIN_DATE',
				'META_DATA',
				'NAME',
				'PICTURE',
				'PROFILE',
				'SALARY',
			];
			queriesIndependent[1].outputColumns = queriesIndependent[0].outputColumns;
			queriesIndependent[0].query = expectedQueryAllOuts;
			queriesIndependent[0].values = expectedBindValuesForIndependentAllOutputColumns[0];
			queriesIndependent[1].query = expectedQueryAllOuts;
			queriesIndependent[1].values = expectedBindValuesForIndependentAllOutputColumns[1];

			const selectAlloutputs: IDataObject = {
				...(nodeParameters.options as Record<string, any>),
				outputColumns: ['*'],
				stmtBatching: 'independently',
			};

			const selectAlloutputsNodeParams: IDataObject = {
				...(nodeParameters as Record<string, any>),
				options: selectAlloutputs,
			};

			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: selectAlloutputsNodeParams,
				nodeOptions: selectAlloutputs,
			});
		});

		it('should insert valid data (defineBelow) with select all outputcolumns in single batch mode', async () => {
			queries[0].outputColumns = [
				'AGE',
				'EMBEDDING',
				'ID',
				'IS_ACTIVE',
				'JOIN_DATE',
				'META_DATA',
				'NAME',
				'PICTURE',
				'PROFILE',
				'SALARY',
			];
			queries[0].query = expectedQueryAllOuts;

			const selectAlloutputs: IDataObject = {
				...(nodeParameters.options as Record<string, any>),
				outputColumns: ['*'],
				stmtBatching: 'single',
			};

			const selectAlloutputsNodeParams: IDataObject = {
				...(nodeParameters as Record<string, any>),
				options: selectAlloutputs,
			};

			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: selectAlloutputsNodeParams,
				nodeOptions: selectAlloutputs,
			});
		});

		it('should insert valid data (defineBelow)', async () => {
			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should insert valid data (autoMap)', async () => {
			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (autoMap)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (autoMap)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should insert valid data (defineBelow) stmtBatching independent', async () => {
			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
			});
		});

		it('should insert valid data (autoMap) stmtBatching independent', async () => {
			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow) stmtBatching independent', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow) stmtBatching independent', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should insert valid data (defineBelow) stmtBatching transaction', async () => {
			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
			});
		});

		it('should insert valid data (autoMap) stmtBatching transaction', async () => {
			await runOperation({
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow) stmtBatching transaction', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow) stmtBatching transaction', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
				errorPattern: /ORA-51803/,
			});
		});
	});

	describe('Test update operation', () => {
		const joinDate = new Date(2024, 0, 1, 14, 30, 0);
		const insertId = 1;
		const baseItems = [
			{
				ID: insertId,
				NAME: 'BOB',
				AGE: 39,
				SALARY: 4500,
				JOIN_DATE: joinDate,
				IS_ACTIVE: false,
				META_DATA: {
					address: 'BLR',
					pincode: 560126,
				},
				EMBEDDING: [3, 4, 9],
			},
			{
				ID: insertId + 1,
				NAME: 'Alice',
				AGE: 39,
				SALARY: 4500,
				JOIN_DATE: joinDate,
				IS_ACTIVE: false,
				META_DATA: {
					address: 'SVL',
					pincode: 560126,
				},
				EMBEDDING: [3, 5, 9],
			},
		];
		const NonExistingItems = baseItems.map((item, index) => ({
			...item,
			ID: index + 100, // invalid ID
		}));

		const expectedQuery = `UPDATE "${CONFIG.user}"."${table}" SET "NAME"=:0,"AGE"=:1,"SALARY"=:2,"JOIN_DATE"=:3,"IS_ACTIVE"=:4,"META_DATA"=:5,"EMBEDDING"=:6 WHERE "ID"=:7 RETURNING "EMBEDDING", "ID" INTO :8, :9`;

		const expectedValues = baseItems.map((v) => [
			v.NAME,
			v.AGE,
			v.SALARY,
			v.JOIN_DATE,
			v.IS_ACTIVE,
			v.META_DATA,
			v.EMBEDDING,
			v.ID,
		]);

		const expectedBindValuesForIndependent = baseItems.map((v) => [
			{ type: oracleDBTypes.DB_TYPE_VARCHAR, val: v.NAME },
			{ type: oracleDBTypes.NUMBER, val: v.AGE },
			{ type: oracleDBTypes.NUMBER, val: v.SALARY },
			{ type: oracleDBTypes.DB_TYPE_TIMESTAMP, val: v.JOIN_DATE },
			{ type: oracleDBTypes.DB_TYPE_BOOLEAN, val: v.IS_ACTIVE },
			{ type: oracleDBTypes.DB_TYPE_JSON, val: v.META_DATA },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, val: v.EMBEDDING },
			{ type: oracleDBTypes.NUMBER, val: v.ID },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_NUMBER, dir: 3003 },
		]);

		beforeAll(function () {
			// initialize global variables to repective operation values.
			queries = [
				{
					query: expectedQuery,
					executeManyValues: expectedValues,
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
			queriesIndependent = [
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[0],
					outputColumns: ['EMBEDDING', 'ID'],
				},
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[1],
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
		});

		const nodeParameters: IDataObject = {
			operation: 'update',
			schema: {
				__rl: true,
				mode: 'list',
				value: CONFIG.user,
			},
			table: {
				__rl: true,
				value: table,
				mode: 'list',
				cachedResultName: table,
			},
			options: {
				stmtBatching: 'single',
				outputColumns: ['EMBEDDING', 'ID'],
			},
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['ID'],
			},
		};

		let originalColumnsValue: any;
		beforeEach(() => {
			originalColumnsValue = structuredClone((nodeParameters.columns as any)?.value);
		});

		afterEach(() => {
			jest.clearAllMocks();
			continueOnFail = false;
			if (originalColumnsValue) {
				(nodeParameters.columns as any).value = originalColumnsValue;
			}
		});

		it('should update valid data (defineBelow)', async () => {
			await runOperation({
				operation: update,
				items: baseItems,
				nodePars: nodeParameters,
				continueOnFailValue: true,
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should update valid data (autoMap)', async () => {
			await runOperation({
				operation: update,
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (autoMap)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: true,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (autoMap)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: false,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should update valid data (defineBelow) stmtBatching transaction', async () => {
			await runOperation({
				operation: update,
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
			});
		});

		it('should throw error on update for non existing row (defineBelow) stmtBatching transaction', async () => {
			await runOperation({
				operation: update,
				items: NonExistingItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
				errorPattern: /The row you are trying to update doesn't exist/,
			});
		});

		it('should insert valid data (autoMap) stmtBatching transaction', async () => {
			await runOperation({
				operation: update,
				items: baseItems,
				continueOnFailValue: true,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow) stmtBatching transaction', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow) stmtBatching transaction', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should update valid data (defineBelow) stmtBatching transaction', async () => {
			await runOperation({
				operation: update,
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'transaction',
				},
			});
		});

		it('should throw error on update for non existing row (defineBelow) stmtBatching independent', async () => {
			await runOperation({
				operation: update,
				items: NonExistingItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /The row you are trying to update doesn't exist/,
			});
		});

		it('should insert valid data (autoMap) stmtBatching independent', async () => {
			await runOperation({
				operation: update,
				items: baseItems,
				continueOnFailValue: true,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow) stmtBatching independent', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow) stmtBatching independent', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: update,
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /ORA-51803/,
			});
		});
	});

	describe('Test upsert operation', () => {
		const joinDate = new Date(2024, 0, 1, 14, 30, 0);
		const insertId = 1;
		const baseItems = [
			{
				ID: insertId,
				NAME: 'BOB',
				AGE: 39,
				SALARY: 4500,
				JOIN_DATE: joinDate,
				IS_ACTIVE: false,
				META_DATA: {
					address: 'BLR',
					pincode: 560126,
				},
				EMBEDDING: [3, 4, 9],
			},
			{
				ID: insertId + 1,
				NAME: 'Alice',
				AGE: 39,
				SALARY: 4500,
				JOIN_DATE: joinDate,
				IS_ACTIVE: false,
				META_DATA: {
					address: 'SVL',
					pincode: 560126,
				},
				EMBEDDING: [3, 5, 9],
			},
		];
		const NonExistingItems = baseItems.map((item, index) => ({
			...item,
			ID: index + 101, // invalid ID
		}));

		const expectedQuery = `MERGE INTO "${CONFIG.user}"."${table}" t
			USING (SELECT :0 as "ID" FROM dual) s
			ON (t."ID" = s."ID")
			WHEN MATCHED THEN
			UPDATE SET t."NAME" = :1, t."AGE" = :2, t."SALARY" = :3, t."JOIN_DATE" = :4, t."IS_ACTIVE" = :5, t."META_DATA" = :6, t."EMBEDDING" = :7
			WHEN NOT MATCHED THEN
			INSERT ("ID", "NAME", "AGE", "SALARY", "JOIN_DATE", "IS_ACTIVE", "META_DATA", "EMBEDDING") VALUES (:8, :9, :10, :11, :12, :13, :14, :15)
			 RETURNING "EMBEDDING", "ID" INTO :16, :17`;

		const expectedValues = baseItems.map((v) => [
			v.ID,
			v.NAME,
			v.AGE,
			v.SALARY,
			v.JOIN_DATE,
			v.IS_ACTIVE,
			v.META_DATA,
			v.EMBEDDING,
			v.ID,
			v.NAME,
			v.AGE,
			v.SALARY,
			v.JOIN_DATE,
			v.IS_ACTIVE,
			v.META_DATA,
			v.EMBEDDING,
		]);

		const expectedBindValuesForIndependent = baseItems.map((v) => [
			{ type: oracleDBTypes.NUMBER, val: v.ID },
			{ type: oracleDBTypes.DB_TYPE_VARCHAR, val: v.NAME },
			{ type: oracleDBTypes.NUMBER, val: v.AGE },
			{ type: oracleDBTypes.NUMBER, val: v.SALARY },
			{ type: oracleDBTypes.DB_TYPE_TIMESTAMP, val: v.JOIN_DATE },
			{ type: oracleDBTypes.DB_TYPE_BOOLEAN, val: v.IS_ACTIVE },
			{ type: oracleDBTypes.DB_TYPE_JSON, val: v.META_DATA },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, val: v.EMBEDDING },
			{ type: oracleDBTypes.NUMBER, val: v.ID },
			{ type: oracleDBTypes.DB_TYPE_VARCHAR, val: v.NAME },
			{ type: oracleDBTypes.NUMBER, val: v.AGE },
			{ type: oracleDBTypes.NUMBER, val: v.SALARY },
			{ type: oracleDBTypes.DB_TYPE_TIMESTAMP, val: v.JOIN_DATE },
			{ type: oracleDBTypes.DB_TYPE_BOOLEAN, val: v.IS_ACTIVE },
			{ type: oracleDBTypes.DB_TYPE_JSON, val: v.META_DATA },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, val: v.EMBEDDING },
			{ type: oracleDBTypes.DB_TYPE_VECTOR, dir: 3003 },
			{ type: oracleDBTypes.DB_TYPE_NUMBER, dir: 3003 },
		]);

		const expectedNonExistentBindValuesForIndependent = expectedBindValuesForIndependent.map(
			(bindValues) => {
				const modifiedValues = [...bindValues];

				// Modify only bindValues.ID at index 0 and 8
				if (typeof modifiedValues[0]?.val === 'number') {
					modifiedValues[0] = {
						...modifiedValues[0],
						val: modifiedValues[0].val + 100,
					};
				}
				if (typeof modifiedValues[8]?.val === 'number') {
					modifiedValues[8] = {
						...modifiedValues[8],
						val: modifiedValues[8].val + 100,
					};
				}
				return {
					values: modifiedValues,
				};
			},
		);

		const expectedNonExistentBindValues = structuredClone(expectedValues);
		for (let i = 0; i < expectedNonExistentBindValues.length; i++) {
			if (Array.isArray(expectedValues[i]) && Array.isArray(expectedNonExistentBindValues[i])) {
				const val0 = expectedValues[i][0];
				const val8 = expectedValues[i][8];

				if (typeof val0 === 'number') {
					expectedNonExistentBindValues[i][0] = val0 + 100;
				}

				if (typeof val8 === 'number') {
					expectedNonExistentBindValues[i][8] = val8 + 100;
				}
			}
		}

		beforeAll(function () {
			// initialize global variables to respective operation values.
			queries = [
				{
					query: expectedQuery,
					executeManyValues: expectedValues,
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
			queriesIndependent = [
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[0],
					outputColumns: ['EMBEDDING', 'ID'],
				},
				{
					query: expectedQuery,
					values: expectedBindValuesForIndependent[1],
					outputColumns: ['EMBEDDING', 'ID'],
				},
			];
		});

		const nodeParameters: IDataObject = {
			operation: 'upsert',
			schema: {
				__rl: true,
				mode: 'list',
				value: CONFIG.user,
			},
			table: {
				__rl: true,
				value: table,
				mode: 'list',
				cachedResultName: table,
			},
			options: {
				stmtBatching: 'single',
				operation: 'upsert',
				outputColumns: ['EMBEDDING', 'ID'],
			},
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['ID'],
			},
		};

		let originalColumnsValue: any;
		beforeEach(() => {
			originalColumnsValue = structuredClone((nodeParameters.columns as any)?.value);
		});

		afterEach(() => {
			jest.clearAllMocks();
			continueOnFail = false;

			// restore variables modified in tests.
			if (originalColumnsValue) {
				(nodeParameters.columns as any).value = originalColumnsValue;
			}
			queriesIndependent[0].values = expectedBindValuesForIndependent[0];
			queriesIndependent[1].values = expectedBindValuesForIndependent[1];
			queries[0].executeManyValues = expectedValues;
		});

		it('should upsert valid data (defineBelow)', async () => {
			await runOperation({
				operation: upsert,
				items: baseItems,
				nodePars: nodeParameters,
				continueOnFailValue: true,
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should upsert valid data (autoMap)', async () => {
			await runOperation({
				operation: upsert,
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				mappingMode: 'autoMapInputData',
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: upsert,
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: upsert,
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (autoMap)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: upsert,
				items: modifiedItems,
				continueOnFailValue: true,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (autoMap)', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: upsert,
				items: modifiedItems,
				continueOnFailValue: false,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
				errorPattern: /ORA-51803/,
			});
		});

		it('should update valid data (defineBelow) stmtBatching independent', async () => {
			await runOperation({
				operation: upsert,
				items: baseItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
			});
		});

		it('should do insert on upsert for non existing row (defineBelow)', async () => {
			queries[0].executeManyValues = expectedNonExistentBindValues;

			await runOperation({
				operation: upsert,
				items: NonExistingItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should do insert on upsert for non existing row (autoMap)', async () => {
			queries[0].executeManyValues = expectedNonExistentBindValues;

			await runOperation({
				operation: upsert,
				items: NonExistingItems,
				continueOnFailValue: false,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: nodeParameters.options as IDataObject,
			});
		});

		it('should do insert on upsert for non existing row (defineBelow) stmtBatching independent', async () => {
			queriesIndependent[0].values = expectedNonExistentBindValuesForIndependent[0].values;
			queriesIndependent[1].values = expectedNonExistentBindValuesForIndependent[1].values;

			await runOperation({
				operation: upsert,
				items: NonExistingItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
			});
		});

		it('should insert valid data (autoMap) stmtBatching independent', async () => {
			await runOperation({
				operation: upsert,
				items: baseItems,
				continueOnFailValue: true,
				mappingMode: 'autoMapInputData',
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=true (defineBelow) stmtBatching independent', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: upsert,
				items: modifiedItems,
				continueOnFailValue: true,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /ORA-51803/,
			});
		});

		it('should handle invalid EMBEDDING with continueOnFail=false (defineBelow) stmtBatching independent', async () => {
			const modifiedItems = structuredClone(baseItems);
			modifiedItems[1].EMBEDDING = [2, 3, 4, 6];
			await runOperation({
				operation: upsert,
				items: modifiedItems,
				continueOnFailValue: false,
				nodePars: nodeParameters,
				nodeOptions: {
					...((nodeParameters.options as IDataObject) ?? {}),
					stmtBatching: 'independently',
				},
				errorPattern: /ORA-51803/,
			});
		});
	});
});
