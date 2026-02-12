import { mock } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import type { PgpDatabase, QueryWithValues } from '../../v2/helpers/interfaces';
import { configureQueryRunner, validateReturningResults } from '../../v2/helpers/utils';

const node: INode = {
	id: '1',
	name: 'Postgres node',
	typeVersion: 2.6,
	type: 'n8n-nodes-base.postgres',
	position: [60, 760],
	parameters: {
		operation: 'insert',
	},
};

const createMockDb = (multiReturnData: IDataObject[][]) => {
	return {
		async any() {
			return [];
		},
		async multi() {
			return multiReturnData;
		},
		async tx(callback: (t: unknown) => Promise<unknown>) {
			return callback({
				async any() {
					return [];
				},
				async multi() {
					return multiReturnData.length > 0 ? [multiReturnData[0]] : [[]];
				},
			});
		},
		async task(callback: (t: unknown) => Promise<unknown>) {
			let callIndex = 0;
			return callback({
				async any() {
					return [];
				},
				async multi() {
					const result = multiReturnData[callIndex] ?? [];
					callIndex++;
					return [result];
				},
			});
		},
	} as unknown as PgpDatabase;
};

describe('validateReturningResults', () => {
	it('should return null when no queries have hasReturning', () => {
		const queries: QueryWithValues[] = [
			{ query: 'DELETE FROM test WHERE id=1', values: [] },
		];
		const results: unknown[][] = [[]];

		expect(validateReturningResults(node, queries, results)).toBeNull();
	});

	it('should return null when all RETURNING queries got data back', () => {
		const queries: QueryWithValues[] = [
			{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
		];
		const results: unknown[][] = [[{ id: 1 }], [{ id: 2 }]];

		expect(validateReturningResults(node, queries, results)).toBeNull();
	});

	it('should return error when ALL RETURNING queries got empty results', () => {
		const queries: QueryWithValues[] = [
			{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
			{ query: 'INSERT INTO test(id) VALUES(3) RETURNING *', values: [], hasReturning: true },
		];
		const results: unknown[][] = [[], [], []];

		const error = validateReturningResults(node, queries, results);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error?.message).toContain('None of the 3 executed queries returned data');
	});

	it('should return null when SOME RETURNING queries got data (partial success)', () => {
		const queries: QueryWithValues[] = [
			{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
		];
		// First query succeeded, second returned empty (e.g. ON CONFLICT scenario)
		const results: unknown[][] = [[{ id: 1 }], []];

		expect(validateReturningResults(node, queries, results)).toBeNull();
	});

	it('should return error when results are truncated (fewer results than queries)', () => {
		const queries: QueryWithValues[] = [
			{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
			{ query: 'INSERT INTO test(id) VALUES(3) RETURNING *', values: [], hasReturning: true },
		];
		// Only one empty result returned - response was truncated
		const results: unknown[][] = [[]];

		const error = validateReturningResults(node, queries, results);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error?.message).toContain('None of the 3 executed queries returned data');
	});

	it('should skip validation for mixed queries (some with hasReturning, some without)', () => {
		const queries: QueryWithValues[] = [
			{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			{ query: 'DELETE FROM test WHERE id=99', values: [] }, // no hasReturning
		];
		const results: unknown[][] = [[{ id: 1 }], []];

		expect(validateReturningResults(node, queries, results)).toBeNull();
	});

	it('should handle large batch (17000 items) with all empty results', () => {
		const queries: QueryWithValues[] = Array.from({ length: 17000 }, (_, i) => ({
			query: `INSERT INTO test(id) VALUES(${i}) RETURNING *`,
			values: [] as IDataObject[],
			hasReturning: true,
		}));
		const results: unknown[][] = new Array(17000).fill([]);

		const error = validateReturningResults(node, queries, results);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error?.message).toContain('None of the 17000 executed queries returned data');
	});
});

describe('configureQueryRunner - persistence validation', () => {
	describe('single mode (default)', () => {
		it('should throw when queries with hasReturning return no data', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[], [], []]);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
				{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
				{ query: 'INSERT INTO test(id) VALUES(3) RETURNING *', values: [], hasReturning: true },
			];

			await expect(
				runQueries(queries, { nodeVersion: 2.6, operation: 'insert' }),
			).rejects.toThrow(
				'None of the 3 executed queries returned data despite having a RETURNING clause',
			);
		});

		it('should return error item with continueOnFail when RETURNING returns no data', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[], []]);

			const thisArg = mock<IExecuteFunctions>();
			// continueOnFail = true
			const runQueries = configureQueryRunner.call(thisArg, node, true, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
				{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
			];

			const result = await runQueries(queries, { nodeVersion: 2.6, operation: 'insert' });

			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('message');
			expect((result[0].json as IDataObject).message).toContain(
				'None of the 2 executed queries returned data',
			);
		});

		it('should return success:true when queries WITHOUT hasReturning return no data (backward compat)', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[], []]);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			// Queries without hasReturning - existing behavior preserved
			const queries: QueryWithValues[] = [
				{ query: 'DELETE FROM test WHERE id=1', values: [] },
				{ query: 'DELETE FROM test WHERE id=2', values: [] },
			];

			const result = await runQueries(queries, { nodeVersion: 2.6, operation: 'deleteTable' });

			expect(result).toEqual([
				{ json: { success: true }, pairedItem: [{ item: 0 }, { item: 1 }] },
			]);
		});

		it('should process results normally when RETURNING queries get data back', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[{ id: 1, name: 'a' }], [{ id: 2, name: 'b' }]]);

			const thisArg = mock<IExecuteFunctions>();
			thisArg.helpers.constructExecutionMetaData.mockImplementation((items, meta) =>
				items.map((item) => ({ ...item, pairedItem: meta.itemData })),
			);
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id, name) VALUES(1, \'a\') RETURNING *', values: [], hasReturning: true },
				{ query: 'INSERT INTO test(id, name) VALUES(2, \'b\') RETURNING *', values: [], hasReturning: true },
			];

			const result = await runQueries(queries, { nodeVersion: 2.6, operation: 'insert' });

			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual({ id: 1, name: 'a' });
			expect(result[1].json).toEqual({ id: 2, name: 'b' });
		});

		it('should simulate large batch (17000 items) empty RETURNING failure', async () => {
			const pgp = pgPromise();
			const emptyResults = new Array(17000).fill([]);
			const db = createMockDb(emptyResults);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			const queries: QueryWithValues[] = Array.from({ length: 17000 }, (_, i) => ({
				query: `INSERT INTO test(id) VALUES(${i}) RETURNING *`,
				values: [] as IDataObject[],
				hasReturning: true,
			}));

			await expect(
				runQueries(queries, { nodeVersion: 2.6, operation: 'insert' }),
			).rejects.toThrow(
				'None of the 17000 executed queries returned data despite having a RETURNING clause',
			);
		});
	});

	describe('transaction mode', () => {
		it('should throw when a query with hasReturning returns no data', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[]]);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			];

			await expect(
				runQueries(queries, {
					nodeVersion: 2.6,
					queryBatching: 'transaction',
					operation: 'insert',
				}),
			).rejects.toThrow('RETURNING clause');
		});

		it('should return error item with continueOnFail in transaction mode', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[]]);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, true, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			];

			const result = await runQueries(queries, {
				nodeVersion: 2.6,
				queryBatching: 'transaction',
				operation: 'insert',
			});

			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('error');
		});
	});

	describe('independently mode', () => {
		it('should throw when a query with hasReturning returns no data', async () => {
			const pgp = pgPromise();
			const db = createMockDb([[]]);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, false, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
			];

			await expect(
				runQueries(queries, {
					nodeVersion: 2.6,
					queryBatching: 'independently',
					operation: 'insert',
				}),
			).rejects.toThrow('RETURNING clause');
		});

		it('should report per-item failures with continueOnFail in independently mode', async () => {
			const pgp = pgPromise();
			// Both queries return empty
			const db = createMockDb([[], []]);

			const thisArg = mock<IExecuteFunctions>();
			const runQueries = configureQueryRunner.call(thisArg, node, true, pgp, db);

			const queries: QueryWithValues[] = [
				{ query: 'INSERT INTO test(id) VALUES(1) RETURNING *', values: [], hasReturning: true },
				{ query: 'INSERT INTO test(id) VALUES(2) RETURNING *', values: [], hasReturning: true },
			];

			const result = await runQueries(queries, {
				nodeVersion: 2.6,
				queryBatching: 'independently',
				operation: 'insert',
			});

			// Each failed query produces its own error item
			expect(result).toHaveLength(2);
			expect(result[0].json).toHaveProperty('error');
			expect(result[1].json).toHaveProperty('error');
			expect(result[0].pairedItem).toEqual({ item: 0 });
			expect(result[1].pairedItem).toEqual({ item: 1 });
		});
	});
});
