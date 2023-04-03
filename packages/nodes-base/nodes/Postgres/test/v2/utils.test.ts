import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	addSortRules,
	addReturning,
	addWhereClauses,
	checkItemAgainstSchema,
	parsePostgresError,
	prepareErrorItem,
	prepareItem,
	replaceEmptyStringsByNulls,
	wrapData,
} from '../../v2/helpers/utils';

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

describe('Test PostgresV2, wrapData', () => {
	it('should wrap object in json', () => {
		const data = {
			id: 1,
			name: 'Name',
		};
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data }]);
	});
	it('should wrap each object in array in json', () => {
		const data = [
			{
				id: 1,
				name: 'Name',
			},
			{
				id: 2,
				name: 'Name 2',
			},
		];
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data[0] }, { json: data[1] }]);
	});
	it('json key from source should be inside json', () => {
		const data = {
			json: {
				id: 1,
				name: 'Name',
			},
		};
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data }]);
		expect(Object.keys(wrappedData[0].json)).toContain('json');
	});
});

describe('Test PostgresV2, prepareErrorItem', () => {
	it('should return error info item', () => {
		const items = [
			{
				json: {
					id: 1,
					name: 'Name 1',
				},
			},
			{
				json: {
					id: 2,
					name: 'Name 2',
				},
			},
		];

		const error = new Error('Test error');
		const item = prepareErrorItem(items, error, 1);
		expect(item).toBeDefined();

		expect((item.json.item as IDataObject)?.id).toEqual(2);
		expect(item.json.message).toEqual('Test error');
		expect(item.json.error).toBeDefined();
	});
});

describe('Test PostgresV2, parsePostgresError', () => {
	it('should return NodeOperationError', () => {
		const error = new Error('Test error');

		const parsedError = parsePostgresError(node, error, [], 1);
		expect(parsedError).toBeDefined();
		expect(parsedError.message).toEqual('Test error');
		expect(parsedError instanceof NodeOperationError).toEqual(true);
	});

	it('should update message that includes ECONNREFUSED', () => {
		const error = new Error('ECONNREFUSED');

		const parsedError = parsePostgresError(node, error, [], 1);
		expect(parsedError).toBeDefined();
		expect(parsedError.message).toEqual('Connection refused');
		expect(parsedError instanceof NodeOperationError).toEqual(true);
	});

	it('should update message with syntax error', () => {
		// eslint-disable-next-line n8n-local-rules/no-unneeded-backticks
		const errorMessage = String.raw`syntax error at or near "seelect"`;
		const error = new Error();
		error.message = errorMessage;

		const parsedError = parsePostgresError(node, error, [
			{ query: 'seelect * from my_table', values: [] },
		]);
		expect(parsedError).toBeDefined();
		expect(parsedError.message).toEqual('Syntax error at line 1 near "seelect"');
		expect(parsedError instanceof NodeOperationError).toEqual(true);
	});
});

describe('Test PostgresV2, addWhereClauses', () => {
	it('should add where clauses to query', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const whereClauses = [{ column: 'id', condition: 'equal', value: '1' }];

		const [updatedQuery, updatedValues] = addWhereClauses(
			node,
			0,
			query,
			whereClauses,
			values,
			'AND',
		);

		expect(updatedQuery).toEqual('SELECT * FROM $1:name.$2:name WHERE $3:name = $4');
		expect(updatedValues).toEqual(['public', 'my_table', 'id', '1']);
	});

	it('should combine where clauses by OR', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const whereClauses = [
			{ column: 'id', condition: 'equal', value: '1' },
			{ column: 'foo', condition: 'equal', value: 'select 2' },
		];

		const [updatedQuery, updatedValues] = addWhereClauses(
			node,
			0,
			query,
			whereClauses,
			values,
			'OR',
		);

		expect(updatedQuery).toEqual(
			'SELECT * FROM $1:name.$2:name WHERE $3:name = $4 OR $5:name = $6',
		);
		expect(updatedValues).toEqual(['public', 'my_table', 'id', '1', 'foo', 'select 2']);
	});

	it('should ignore incorect combine conition ad use AND', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const whereClauses = [
			{ column: 'id', condition: 'equal', value: '1' },
			{ column: 'foo', condition: 'equal', value: 'select 2' },
		];

		const [updatedQuery, updatedValues] = addWhereClauses(
			node,
			0,
			query,
			whereClauses,
			values,
			'SELECT * FROM my_table',
		);

		expect(updatedQuery).toEqual(
			'SELECT * FROM $1:name.$2:name WHERE $3:name = $4 AND $5:name = $6',
		);
		expect(updatedValues).toEqual(['public', 'my_table', 'id', '1', 'foo', 'select 2']);
	});
});

describe('Test PostgresV2, addSortRules', () => {
	it('should ORDER BY ASC', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const sortRules = [{ column: 'id', direction: 'ASC' }];

		const [updatedQuery, updatedValues] = addSortRules(query, sortRules, values);

		expect(updatedQuery).toEqual('SELECT * FROM $1:name.$2:name ORDER BY $3:name ASC');
		expect(updatedValues).toEqual(['public', 'my_table', 'id']);
	});
	it('should ORDER BY DESC', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const sortRules = [{ column: 'id', direction: 'DESC' }];

		const [updatedQuery, updatedValues] = addSortRules(query, sortRules, values);

		expect(updatedQuery).toEqual('SELECT * FROM $1:name.$2:name ORDER BY $3:name DESC');
		expect(updatedValues).toEqual(['public', 'my_table', 'id']);
	});
	it('should ignore incorect direction', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const sortRules = [{ column: 'id', direction: 'SELECT * FROM my_table' }];

		const [updatedQuery, updatedValues] = addSortRules(query, sortRules, values);

		expect(updatedQuery).toEqual('SELECT * FROM $1:name.$2:name ORDER BY $3:name ASC');
		expect(updatedValues).toEqual(['public', 'my_table', 'id']);
	});
	it('should add multiple sort rules', () => {
		const query = 'SELECT * FROM $1:name.$2:name';
		const values = ['public', 'my_table'];
		const sortRules = [
			{ column: 'id', direction: 'ASC' },
			{ column: 'foo', direction: 'DESC' },
		];

		const [updatedQuery, updatedValues] = addSortRules(query, sortRules, values);

		expect(updatedQuery).toEqual(
			'SELECT * FROM $1:name.$2:name ORDER BY $3:name ASC, $4:name DESC',
		);
		expect(updatedValues).toEqual(['public', 'my_table', 'id', 'foo']);
	});
});

describe('Test PostgresV2, addReturning', () => {
	it('should add RETURNING', () => {
		const query = 'UPDATE $1:name.$2:name SET $5:name = $6 WHERE $3:name = $4';
		const values = ['public', 'my_table', 'id', '1', 'foo', 'updated'];
		const outputColumns = ['id', 'foo'];

		const [updatedQuery, updatedValues] = addReturning(query, outputColumns, values);

		expect(updatedQuery).toEqual(
			'UPDATE $1:name.$2:name SET $5:name = $6 WHERE $3:name = $4 RETURNING $7:name',
		);
		expect(updatedValues).toEqual([
			'public',
			'my_table',
			'id',
			'1',
			'foo',
			'updated',
			['id', 'foo'],
		]);
	});
	it('should add RETURNING *', () => {
		const query = 'UPDATE $1:name.$2:name SET $5:name = $6 WHERE $3:name = $4';
		const values = ['public', 'my_table', 'id', '1', 'foo', 'updated'];
		const outputColumns = ['id', 'foo', '*'];

		const [updatedQuery, updatedValues] = addReturning(query, outputColumns, values);

		expect(updatedQuery).toEqual(
			'UPDATE $1:name.$2:name SET $5:name = $6 WHERE $3:name = $4 RETURNING *',
		);
		expect(updatedValues).toEqual(['public', 'my_table', 'id', '1', 'foo', 'updated']);
	});
});

describe('Test PostgresV2, replaceEmptyStringsByNulls', () => {
	it('should replace empty string by null', () => {
		const items = [
			{ json: { foo: 'bar', bar: '', spam: undefined } },
			{ json: { foo: '', bar: '', spam: '' } },
			{ json: { foo: 0, bar: NaN, spam: false } },
		];

		const updatedItems = replaceEmptyStringsByNulls(items, true);

		expect(updatedItems).toBeDefined();
		expect(updatedItems).toEqual([
			{ json: { foo: 'bar', bar: null, spam: undefined } },
			{ json: { foo: null, bar: null, spam: null } },
			{ json: { foo: 0, bar: NaN, spam: false } },
		]);
	});
	it('should do nothing', () => {
		const items = [
			{ json: { foo: 'bar', bar: '', spam: undefined } },
			{ json: { foo: '', bar: '', spam: '' } },
			{ json: { foo: 0, bar: NaN, spam: false } },
		];

		const updatedItems = replaceEmptyStringsByNulls(items);

		expect(updatedItems).toBeDefined();
		expect(updatedItems).toEqual(items);
	});
});

describe('Test PostgresV2, prepareItem', () => {
	it('should convert fixedColections values to object', () => {
		const values = [
			{
				column: 'id',
				value: '1',
			},
			{
				column: 'foo',
				value: 'bar',
			},
			{
				column: 'bar',
				value: 'foo',
			},
		];

		const item = prepareItem(values);

		expect(item).toBeDefined();
		expect(item).toEqual({
			id: '1',
			foo: 'bar',
			bar: 'foo',
		});
	});
});

describe('Test PostgresV2, checkItemAgainstSchema', () => {
	it('should not throw error', () => {
		const item = { foo: 'updated', id: 2 };
		const columnsInfo = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
		];

		const result = checkItemAgainstSchema(node, item, columnsInfo, 0);

		expect(result).toBeDefined();
		expect(result).toEqual(item);
	});
	it('should throw error on not existing column', () => {
		const item = { foo: 'updated', bar: 'updated' };
		const columnsInfo = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'json', data_type: 'json', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
		];

		try {
			checkItemAgainstSchema(node, item, columnsInfo, 0);
		} catch (error) {
			expect(error.message).toEqual("Column 'bar' does not exist in selected table");
		}
	});
	it('should throw error on not nullable column', () => {
		const item = { foo: null };
		const columnsInfo = [
			{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
			{ column_name: 'foo', data_type: 'text', is_nullable: 'NO' },
		];

		try {
			checkItemAgainstSchema(node, item, columnsInfo, 0);
		} catch (error) {
			expect(error.message).toEqual("Column 'foo' is not nullable");
		}
	});
});
