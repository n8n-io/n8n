import { mock } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import type { PgpDatabase } from '../../v2/helpers/interfaces';
import { configureQueryRunner } from '../../v2/helpers/utils';

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
});
