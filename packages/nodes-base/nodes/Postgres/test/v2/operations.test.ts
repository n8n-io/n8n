import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

import type { QueriesRunner } from '../../v2/helpers/interfaces';

import { get } from 'lodash';

import * as deleteTable from '../../v2/actions/database/deleteTable.operation';
// import * as executeQuery from '../../v2/actions/database/executeQuery.operation';
// import * as insert from '../../v2/actions/database/insert.operation';
// import * as select from '../../v2/actions/database/select.operation';
// import * as update from '../../v2/actions/database/update.operation';
// import * as upsert from '../../v2/actions/database/upsert.operation';

const runQueries: QueriesRunner = jest.fn();

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

const items = [{ json: {} }];

const createMockExecuteFunction = (nodeParameters: IDataObject[]) => {
	const fakeExecuteFunction = {
		getNodeParameter(
			parameterName: string,
			itemIndex: number,
			fallbackValue?: IDataObject | undefined,
			options?: IGetNodeParameterOptions | undefined,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters[itemIndex], parameter, fallbackValue);
		},
		getNode() {
			return node;
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

// if node parameters copied from canvas all default parameters has to be added manualy as JSON would not have them
describe('Test PostgresV2, deleteTable operation', () => {
	it('deleteCommand: delete, should call runQueries with', async () => {
		const nodeParameters: IDataObject[] = [
			{
				operation: 'deleteTable',
				schema: {
					__rl: true,
					mode: 'list',
					value: 'public',
				},
				table: {
					__rl: true,
					value: 'my_table',
					mode: 'list',
					cachedResultName: 'my_table',
				},
				deleteCommand: 'delete',
				where: {
					values: [
						{
							column: 'id',
							condition: 'LIKE',
							value: '1',
						},
					],
				},
				options: {},
			},
		];

		const nodeOptions = nodeParameters[0].options as IDataObject;

		await deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'DELETE FROM $1:name.$2:name WHERE $3:name LIKE $4',
					values: ['public', 'my_table', 'id', '1'],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('deleteCommand: truncate, should call runQueries with', async () => {
		const nodeParameters: IDataObject[] = [
			{
				operation: 'deleteTable',
				schema: {
					__rl: true,
					mode: 'list',
					value: 'public',
				},
				table: {
					__rl: true,
					value: 'my_table',
					mode: 'list',
					cachedResultName: 'my_table',
				},
				deleteCommand: 'truncate',
				restartSequences: true,
				options: {
					cascade: true,
				},
			},
		];

		const nodeOptions = nodeParameters[0].options as IDataObject;

		await deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'TRUNCATE TABLE $1:name.$2:name RESTART IDENTITY CASCADE',
					values: ['public', 'my_table'],
				},
			],
			items,
			nodeOptions,
		);
	});

	it('deleteCommand: drop, should call runQueries with', async () => {
		const nodeParameters: IDataObject[] = [
			{
				operation: 'deleteTable',
				schema: {
					__rl: true,
					mode: 'list',
					value: 'public',
				},
				table: {
					__rl: true,
					value: 'my_table',
					mode: 'list',
					cachedResultName: 'my_table',
				},
				deleteCommand: 'drop',
				options: {},
			},
		];

		const nodeOptions = nodeParameters[0].options as IDataObject;

		await deleteTable.execute.call(
			createMockExecuteFunction(nodeParameters),
			runQueries,
			items,
			nodeOptions,
		);

		expect(runQueries).toHaveBeenCalledWith(
			[
				{
					query: 'DROP TABLE IF EXISTS $1:name.$2:name',
					values: ['public', 'my_table'],
				},
			],
			items,
			nodeOptions,
		);
	});
});

// describe('Test PostgresV2, executeQuery operation', async () => {
// 	it('should call runQueries with', () => {});
// });

// describe('Test PostgresV2, insert operation', async () => {
// 	it('should call runQueries with', () => {});
// });

// describe('Test PostgresV2, select operation', async () => {
// 	it('should call runQueries with', async () => {});
// });

// describe('Test PostgresV2, update operation', async () => {
// 	it('should call runQueries with', () => {});
// });

// describe('Test PostgresV2, upsert operation', async () => {
// 	it('should call runQueries with', () => {});
// });
