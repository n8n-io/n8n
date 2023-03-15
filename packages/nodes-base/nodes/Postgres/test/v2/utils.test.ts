import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parsePostgresError, prepareErrorItem, wrapData } from '../../v2/helpers/utils';

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
