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

		const result = await runQueries([{ query: 'SELECT * FROM table', values: [] }], {
			nodeVersion: 2.2,
		});

		expect(result).toBeDefined();
		expect(result).toHaveLength(1);
		expect(result).toEqual([{ json: { success: true }, pairedItem: [{ item: 0 }] }]);
		expect(dbMultiSpy).toHaveBeenCalledWith('SELECT * FROM table');
	});

	// GHC-5181: Postgres (v2) "Query Parameters" don't recognize above 5 parameters ($6, $7 and so on)
	it('should execute query with 6 parameters', async () => {
		const pgp = pgPromise();
		const db = createMockDb([{ id: 1 }]);

		const dbMultiSpy = jest.spyOn(db, 'multi');

		const thisArg = mock<IExecuteFunctions>();
		thisArg.helpers = {
			constructExecutionMetaData: jest.fn((data) => data),
		} as any;

		const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

		const result = await runQueries(
			[
				{
					query: 'INSERT INTO test_table VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
					values: ['1', '2', '3', '4', '5', '6'],
				},
			],
			{ nodeVersion: 2.6 },
		);

		expect(result).toBeDefined();
		expect(dbMultiSpy).toHaveBeenCalled();
		// Verify the concatenated query includes all 6 parameters
		const calledQuery = dbMultiSpy.mock.calls[0][0];
		expect(calledQuery).toContain('$1');
		expect(calledQuery).toContain('$6');
	});

	// GHC-5181: Postgres (v2) "Query Parameters" don't recognize above 5 parameters ($6, $7 and so on)
	it('should execute query with 13 parameters', async () => {
		const pgp = pgPromise();
		const db = createMockDb([{ id: 1 }]);

		const dbMultiSpy = jest.spyOn(db, 'multi');

		const thisArg = mock<IExecuteFunctions>();
		thisArg.helpers = {
			constructExecutionMetaData: jest.fn((data) => data),
		} as any;

		const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

		const result = await runQueries(
			[
				{
					query:
						'INSERT INTO financas (c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
					values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
				},
			],
			{ nodeVersion: 2.6 },
		);

		expect(result).toBeDefined();
		expect(dbMultiSpy).toHaveBeenCalled();
		// Verify the concatenated query includes all 13 parameters
		const calledQuery = dbMultiSpy.mock.calls[0][0];
		expect(calledQuery).toContain('$1');
		expect(calledQuery).toContain('$13');
	});
});
