import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { INode } from 'n8n-workflow';
import * as oracleDBTypes from 'oracledb';

import type { ColumnMap, ExecuteOpBindParam } from '../helpers/interfaces';
import {
	addSortRules,
	addWhereClauses,
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
});
