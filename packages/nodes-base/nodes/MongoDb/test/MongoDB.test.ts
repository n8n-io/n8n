import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mockDeep } from 'vitest-mock-extended';
import type { AnyBulkWriteOperation } from 'mongodb';
import { BSON, Collection, Db, MongoBulkWriteError, MongoClient, ObjectId } from 'mongodb';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import { NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	NodeParameterValueType,
	WorkflowTestData,
} from 'n8n-workflow';

import { MongoDb } from '../MongoDb.node';
import type { MockInstance } from 'vitest';

const manualTriggerName = 'When clicking "Execute Workflow"';
const searchIndexName = 'my-index';

MongoClient.connect = async function () {
	const driverInfo = {
		name: 'n8n_crud',
		version: '1.2',
	};
	const client = new MongoClient('mongodb://localhost:27017', { driverInfo });
	return await Promise.resolve(client);
};

function buildWorkflow({
	parameters,
	expectedResult,
}: { parameters: INodeParameters; expectedResult: unknown[] }) {
	const test: WorkflowTestData = {
		description: 'should pass test',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {},
						id: '8b7bb389-e4ef-424a-bca1-e7ead60e43eb',
						name: manualTriggerName,
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [740, 380],
					},
					{
						parameters,
						id: '8b7bb389-e4ef-424a-bca1-e7ead60e43ec',
						name: 'mongoDb',
						type: 'n8n-nodes-base.mongoDb',
						typeVersion: 1.2,
						position: [1260, 360],
						credentials: {
							mongoDb: {
								id: 'mongodb://localhost:27017',
								name: 'Connection String',
							},
						},
					},
				],
				connections: {
					[manualTriggerName]: {
						main: [
							[
								{
									node: 'mongoDb',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			assertBinaryData: true,
			nodeData: {
				mongoDb: [expectedResult],
			},
		},
	};

	return test;
}

const inputItems = [
	{ json: { id: '1', value: 'first', collection: 'collection-1' } },
	{ json: { id: '2', value: 'second', collection: 'collection-2' } },
	{ json: { id: '3', value: 'third', collection: 'collection-3' } },
];

function mockExecuteFunctions(typeVersion: number, operation: string) {
	const executeFunctions = mockDeep<IExecuteFunctions>();

	executeFunctions.getCredentials.mockResolvedValue({
		configurationType: 'connectionString',
		connectionString: 'mongodb://localhost:27017',
		database: 'test',
	});
	executeFunctions.getNode.mockReturnValue({ typeVersion } as INode);
	executeFunctions.getInputData.mockReturnValue(inputItems);
	executeFunctions.continueOnFail.mockReturnValue(false);
	executeFunctions.helpers.returnJsonArray.mockImplementation(returnJsonArray);
	executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
		constructExecutionMetaData,
	);
	executeFunctions.getNodeParameter.mockImplementation(
		(parameterName: string, itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
			switch (parameterName) {
				case 'operation':
					return operation;
				case 'collection':
					return inputItems[itemIndex].json.collection;
				case 'fields':
					return 'id,value';
				case 'updateKey':
					return 'id';
				case 'upsert':
					return false;
				case 'options.useDotNotation':
					return false;
				case 'options.dateFields':
					return '';
				default:
					return fallbackValue;
			}
		},
	);

	return executeFunctions;
}

function mockQueryOperation(operation: 'aggregate' | 'delete' | 'find', options: IDataObject = {}) {
	const executeFunctions = mockExecuteFunctions(1.3, operation);
	executeFunctions.getInputData.mockReturnValue([inputItems[0]]);
	executeFunctions.getNodeParameter.mockImplementation(
		(parameterName: string, _itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
			switch (parameterName) {
				case 'operation':
					return operation;
				case 'collection':
					return 'users';
				case 'query':
					return operation === 'aggregate'
						? '[{ "$match": { "name": "$1", "age": { "$gte": "$2" } } }]'
						: '{ "name": "$1", "age": { "$gte": "$2" } }';
				case 'queryParameters':
					return ['Alice', 30];
				case 'options':
					return options;
				default:
					return fallbackValue;
			}
		},
	);

	return executeFunctions;
}

function mockFindCursor() {
	const applied: { sort?: unknown; project?: unknown } = {};
	const cursor = {
		skip: () => cursor,
		limit: () => cursor,
		sort: (value: unknown) => {
			applied.sort = value;
			return cursor;
		},
		project: (value: unknown) => {
			applied.project = value;
			return cursor;
		},
		toArray: async () => [],
	};
	vi.spyOn(Collection.prototype, 'find').mockReturnValue(cursor as never);

	return applied;
}

function collectionNames(collectionSpy: MockInstance): string[] {
	return collectionSpy.mock.calls.reduce<string[]>((names, call) => {
		const [collectionName] = call as unknown[];

		if (typeof collectionName === 'string') {
			names.push(collectionName);
		}

		return names;
	}, []);
}

function searchIndexOperationResult(indexName: string) {
	return { json: { [indexName]: true } };
}

describe('MongoDB CRUD Node', () => {
	const testHarness = new NodeTestHarness();

	describe('document operations in version 1.5', () => {
		let collectionSpy: MockInstance;
		const node = new MongoDb();

		function bulkWriteError(
			writeErrors: Array<{ index: number; errmsg: string }>,
			message = 'bulk write failed',
		) {
			const error = Object.create(MongoBulkWriteError.prototype) as MongoBulkWriteError;
			Object.assign(error, { message, writeErrors });
			return error;
		}

		function mockBulkExecuteFunctions(
			operation: string,
			{
				continueOnFail = false,
				params = {},
			}: {
				continueOnFail?: boolean;
				params?: Record<
					string,
					NodeParameterValueType | ((itemIndex: number) => NodeParameterValueType)
				>;
			} = {},
		) {
			const executeFunctions = mockExecuteFunctions(1.5, operation);
			executeFunctions.continueOnFail.mockReturnValue(continueOnFail);
			const merged = new Map<
				string,
				NodeParameterValueType | ((itemIndex: number) => NodeParameterValueType)
			>([
				['operation', operation],
				['collection', 'users'],
				['fields', 'id,value'],
				['updateKey', 'id'],
				['upsert', false],
				['options.useDotNotation', false],
				['options.dateFields', ''],
				...Object.entries(params),
			]);
			executeFunctions.getNodeParameter.mockImplementation(
				(parameterName: string, itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
					if (!merged.has(parameterName)) return fallbackValue as never;
					const value = merged.get(parameterName);
					return (typeof value === 'function' ? value(itemIndex) : value) as never;
				},
			);
			return executeFunctions;
		}

		beforeEach(() => {
			collectionSpy = vi.spyOn(Db.prototype, 'collection');
		});

		afterEach(() => {
			collectionSpy.mockRestore();
			vi.clearAllMocks();
		});

		it.each(['update', 'findOneAndUpdate'])(
			'batches %s items into a single ordered bulkWrite per collection',
			async (operation) => {
				const updateOneSpy = vi.spyOn(Collection.prototype, 'updateOne');
				const findOneAndUpdateSpy = vi.spyOn(Collection.prototype, 'findOneAndUpdate');
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);

				const [items] = await node.execute.call(mockBulkExecuteFunctions(operation));

				expect(bulkWriteSpy).toHaveBeenCalledTimes(1);
				expect(bulkWriteSpy).toHaveBeenCalledWith(
					[
						{ updateOne: { filter: { id: '1' }, update: { $set: { id: '1', value: 'first' } } } },
						{ updateOne: { filter: { id: '2' }, update: { $set: { id: '2', value: 'second' } } } },
						{ updateOne: { filter: { id: '3' }, update: { $set: { id: '3', value: 'third' } } } },
					],
					{ ordered: true },
				);
				expect(updateOneSpy).not.toHaveBeenCalled();
				expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
				expect(items).toEqual([
					{ json: { id: '1', value: 'first' }, pairedItem: { item: 0 } },
					{ json: { id: '2', value: 'second' }, pairedItem: { item: 1 } },
					{ json: { id: '3', value: 'third' }, pairedItem: { item: 2 } },
				]);
			},
		);

		it('resolves the collection per item and issues one bulkWrite per group', async () => {
			const bulkWriteSpy = vi
				.spyOn(Collection.prototype, 'bulkWrite')
				.mockResolvedValue({} as never);

			await node.execute.call(mockExecuteFunctions(1.5, 'update'));

			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-2',
				'collection-3',
			]);
			expect(bulkWriteSpy).toHaveBeenCalledTimes(3);
		});

		it('restores input order when grouping interleaves collections', async () => {
			const bulkWriteSpy = vi
				.spyOn(Collection.prototype, 'bulkWrite')
				.mockResolvedValue({} as never);
			const executeFunctions = mockBulkExecuteFunctions('update', {
				params: { collection: (itemIndex: number) => ['a', 'b', 'a'][itemIndex] },
			});

			const [items] = await node.execute.call(executeFunctions);

			expect(bulkWriteSpy).toHaveBeenCalledTimes(2);
			expect(items.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }, { item: 2 }]);
		});

		// The string case pins the pre-1.5 truthy coercion for expression-driven values
		it.each([true, 'true'])(
			'sends upsert per operation when the parameter is truthy (%j)',
			async (upsert) => {
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);

				await node.execute.call(mockBulkExecuteFunctions('update', { params: { upsert } }));

				expect(bulkWriteSpy).toHaveBeenCalledWith(
					[
						{
							updateOne: {
								filter: { id: '1' },
								update: { $set: { id: '1', value: 'first' } },
								upsert: true,
							},
						},
						{
							updateOne: {
								filter: { id: '2' },
								update: { $set: { id: '2', value: 'second' } },
								upsert: true,
							},
						},
						{
							updateOne: {
								filter: { id: '3' },
								update: { $set: { id: '3', value: 'third' } },
								upsert: true,
							},
						},
					],
					{ ordered: true },
				);
			},
		);

		it('filters by ObjectId and strips _id from the update when the update key is _id', async () => {
			const bulkWriteSpy = vi
				.spyOn(Collection.prototype, 'bulkWrite')
				.mockResolvedValue({} as never);
			const documentId = '662a2b1a2f8b9c0d1e2f3a4b';
			const executeFunctions = mockBulkExecuteFunctions('update', {
				params: { updateKey: '_id', fields: '_id,value' },
			});
			executeFunctions.getInputData.mockReturnValue([
				{ json: { _id: documentId, value: 'renamed' } },
			]);

			const [items] = await node.execute.call(executeFunctions);

			expect(bulkWriteSpy).toHaveBeenCalledWith(
				[
					{
						updateOne: {
							filter: { _id: new ObjectId(documentId) },
							update: { $set: { value: 'renamed' } },
						},
					},
				],
				{ ordered: true },
			);
			expect(items).toEqual([{ json: { value: 'renamed' }, pairedItem: { item: 0 } }]);
		});

		it('uses an unordered bulkWrite and maps write errors to items when continue-on-fail is on', async () => {
			const bulkWriteSpy = vi
				.spyOn(Collection.prototype, 'bulkWrite')
				.mockRejectedValue(bulkWriteError([{ index: 1, errmsg: 'E11000 duplicate key' }]));

			const [items] = await node.execute.call(
				mockBulkExecuteFunctions('update', { continueOnFail: true }),
			);

			expect(bulkWriteSpy).toHaveBeenCalledWith(expect.any(Array), { ordered: false });
			expect(items).toEqual([
				{ json: { id: '1', value: 'first' }, pairedItem: { item: 0 } },
				{ json: { error: 'E11000 duplicate key' }, pairedItem: { item: 1 } },
				{ json: { id: '3', value: 'third' }, pairedItem: { item: 2 } },
			]);
		});

		it('maps write errors by op position when a prepare failure shifts the indexes', async () => {
			const bulkWriteSpy = vi
				.spyOn(Collection.prototype, 'bulkWrite')
				.mockRejectedValue(bulkWriteError([{ index: 1, errmsg: 'E11000 duplicate key' }]));
			const executeFunctions = mockBulkExecuteFunctions('update', { continueOnFail: true });
			executeFunctions.getInputData.mockReturnValue([
				inputItems[0],
				{ json: { value: 'missing-key' } },
				inputItems[2],
			]);

			const [items] = await node.execute.call(executeFunctions);

			// Item 1 never reached the bulkWrite, so write-error index 1 is original item 2
			expect(bulkWriteSpy).toHaveBeenCalledWith(
				[
					{ updateOne: { filter: { id: '1' }, update: { $set: { id: '1', value: 'first' } } } },
					{ updateOne: { filter: { id: '3' }, update: { $set: { id: '3', value: 'third' } } } },
				],
				{ ordered: false },
			);
			expect(items).toEqual([
				{ json: { id: '1', value: 'first' }, pairedItem: { item: 0 } },
				{ json: { error: 'Item is missing the updateKey field' }, pairedItem: { item: 1 } },
				{ json: { error: 'E11000 duplicate key' }, pairedItem: { item: 2 } },
			]);
		});

		it('fails the whole group when the error carries no per-operation verdicts', async () => {
			vi.spyOn(Collection.prototype, 'bulkWrite').mockRejectedValue(new Error('connection lost'));

			const [items] = await node.execute.call(
				mockBulkExecuteFunctions('update', { continueOnFail: true }),
			);

			expect(items).toEqual([
				{ json: { error: 'connection lost' }, pairedItem: { item: 0 } },
				{ json: { error: 'connection lost' }, pairedItem: { item: 1 } },
				{ json: { error: 'connection lost' }, pairedItem: { item: 2 } },
			]);
		});

		it('throws the bulk failure when continue-on-fail is off', async () => {
			vi.spyOn(Collection.prototype, 'bulkWrite').mockRejectedValue(new Error('boom'));

			await expect(node.execute.call(mockBulkExecuteFunctions('update'))).rejects.toThrow('boom');
		});

		it.each([
			['update', 'updateOne'],
			['findOneAndUpdate', 'findOneAndUpdate'],
		] as const)('keeps per-item %s calls in version 1.4', async (operation, driverMethod) => {
			const driverSpy = vi.spyOn(Collection.prototype, driverMethod).mockResolvedValue({} as never);
			const bulkWriteSpy = vi.spyOn(Collection.prototype, 'bulkWrite');

			await node.execute.call(mockExecuteFunctions(1.4, operation));

			expect(driverSpy).toHaveBeenCalledTimes(3);
			expect(bulkWriteSpy).not.toHaveBeenCalled();
		});

		describe('parallel writes', () => {
			type BulkParams = NonNullable<Parameters<typeof mockBulkExecuteFunctions>[1]>['params'];
			type Ops = readonly AnyBulkWriteOperation[];
			const parallelWritesParam = 'options.parallelWrites';
			type BulkWriteHooks = {
				onStart?: (ops: Ops, callIndex: number) => void;
				handle?: (ops: Ops, callIndex: number) => unknown;
				onSettled?: (ops: Ops) => void;
			};

			function inputRows(
				count: number,
				build: (index: number) => IDataObject = (index) => ({ id: `k${index}`, value: index }),
			): INodeExecutionData[] {
				return Array.from({ length: count }, (_, index) => ({ json: build(index) }));
			}

			function mockParallelExecuteFunctions(
				rows: INodeExecutionData[],
				parallelWrites: NodeParameterValueType,
				{
					continueOnFail = false,
					params = {},
				}: { continueOnFail?: boolean; params?: BulkParams } = {},
			) {
				const executeFunctions = mockBulkExecuteFunctions('update', {
					continueOnFail,
					params: { [parallelWritesParam]: parallelWrites, ...params },
				});
				executeFunctions.getInputData.mockReturnValue(rows);
				return executeFunctions;
			}

			function mockListCollections(collections: unknown[] | Error) {
				return vi.spyOn(Db.prototype, 'listCollections').mockReturnValue({
					toArray: async () => {
						if (collections instanceof Error) throw collections;
						return await Promise.resolve(collections);
					},
				} as never);
			}

			function deferredBulkWrite({
				onStart = () => {},
				handle = () => ({}),
				onSettled = () => {},
			}: BulkWriteHooks = {}) {
				let inFlight = 0;
				let peak = 0;
				let callCount = 0;
				const spy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockImplementation(async (ops: Ops) => {
						const callIndex = callCount++;
						inFlight++;
						peak = Math.max(peak, inFlight);
						onStart(ops, callIndex);
						try {
							await new Promise((resolve) => setTimeout(resolve, 2));
							return handle(ops, callIndex) as never;
						} finally {
							inFlight--;
							onSettled(ops);
						}
					});
				return { spy, peakInFlight: () => peak };
			}

			function idsOf(ops: Ops): string[] {
				return ops.map(
					(op) => (op as unknown as { updateOne: { filter: { id: string } } }).updateOne.filter.id,
				);
			}

			function valuesOf(ops: Ops): unknown[] {
				return ops.map(
					(op) =>
						(op as unknown as { updateOne: { update: { $set: { value: unknown } } } }).updateOne
							.update.$set.value,
				);
			}

			function callsOf(spy: MockInstance): Ops[] {
				return spy.mock.calls.map(([ops]) => ops as Ops);
			}

			it('keeps one bulkWrite per collection when Parallel Writes is 1', async () => {
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);
				const listCollectionsSpy = mockListCollections([]);

				const [items] = await node.execute.call(mockParallelExecuteFunctions(inputRows(3000), 1));

				expect(bulkWriteSpy).toHaveBeenCalledTimes(1);
				expect(bulkWriteSpy).toHaveBeenCalledWith(expect.any(Array), { ordered: true });
				expect(callsOf(bulkWriteSpy)[0]).toHaveLength(3000);
				expect(listCollectionsSpy).not.toHaveBeenCalled();
				expect(items.map((item) => item.pairedItem)).toEqual(
					Array.from({ length: 3000 }, (_, index) => ({ item: index })),
				);
			});

			it.each([0, 'abc', undefined])(
				'treats an unusable Parallel Writes value (%j) as 1',
				async (value) => {
					const bulkWriteSpy = vi
						.spyOn(Collection.prototype, 'bulkWrite')
						.mockResolvedValue({} as never);

					await node.execute.call(mockParallelExecuteFunctions(inputRows(3000), value));

					expect(bulkWriteSpy).toHaveBeenCalledTimes(1);
				},
			);

			it('splits a collection into lanes of bounded chunks when Parallel Writes is above 1', async () => {
				const { spy, peakInFlight } = deferredBulkWrite();
				mockListCollections([]);

				const [items] = await node.execute.call(mockParallelExecuteFunctions(inputRows(8000), 4));

				const calls = callsOf(spy);
				expect(calls.length).toBeGreaterThanOrEqual(8);
				expect(peakInFlight()).toBe(4);
				for (const ops of calls) expect(ops.length).toBeLessThanOrEqual(1000);
				expect(calls.reduce((max, ops) => Math.max(max, ops.length), 0)).toBe(1000);
				expect(calls.flatMap(idsOf).sort()).toEqual(
					Array.from({ length: 8000 }, (_, index) => `k${index}`).sort(),
				);
				expect(spy).toHaveBeenCalledWith(expect.any(Array), { ordered: true });
				expect(items.map((item) => item.pairedItem)).toEqual(
					Array.from({ length: 8000 }, (_, index) => ({ item: index })),
				);
				expect(items[4242]).toEqual({
					json: { id: 'k4242', value: 4242 },
					pairedItem: { item: 4242 },
				});
			});

			it('keeps items that share an Update Key value in one lane in input order', async () => {
				const duplicates = new Map([
					[10, 'first'],
					[3010, 'second'],
					[7990, 'third'],
				]);
				const rows = inputRows(8000, (index) =>
					duplicates.has(index)
						? { id: 'dup', value: duplicates.get(index) }
						: { id: `k${index}`, value: index },
				);
				const hasDuplicate = (ops: Ops) => idsOf(ops).includes('dup');
				const seen: unknown[] = [];
				let inFlightWithDuplicate = 0;
				let overlapped = false;
				deferredBulkWrite({
					onStart: (ops) => {
						if (!hasDuplicate(ops)) return;
						if (inFlightWithDuplicate > 0) overlapped = true;
						inFlightWithDuplicate++;
						const ids = idsOf(ops);
						for (const value of valuesOf(ops).filter((_, index) => ids[index] === 'dup'))
							seen.push(value);
					},
					onSettled: (ops) => {
						if (hasDuplicate(ops)) inFlightWithDuplicate--;
					},
				});
				mockListCollections([]);

				await node.execute.call(mockParallelExecuteFunctions(rows, 8));

				expect(overlapped).toBe(false);
				expect(seen).toEqual(['first', 'second', 'third']);
			});

			it('falls back to one bulkWrite when items resolve different Update Key fields', async () => {
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);
				const listCollectionsSpy = mockListCollections([]);
				const rows = inputRows(4000, (index) => ({
					id: `k${index}`,
					email: `k${index}@example.com`,
					value: index,
				}));

				await node.execute.call(
					mockParallelExecuteFunctions(rows, 4, {
						params: {
							fields: 'id,email,value',
							updateKey: (index: number) => (index % 2 === 0 ? 'id' : 'email'),
						},
					}),
				);

				expect(bulkWriteSpy).toHaveBeenCalledTimes(1);
				expect(listCollectionsSpy).not.toHaveBeenCalled();
			});

			it.each([
				[
					'the collection has a default collation',
					[{ name: 'users', options: { collation: { locale: 'en', strength: 2 } } }],
				],
				['the collection list cannot be read', new Error('not authorized on users')],
			])('falls back to one bulkWrite when %s', async (_label, collections) => {
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);
				const listCollectionsSpy = mockListCollections(collections);

				await node.execute.call(mockParallelExecuteFunctions(inputRows(4000), 4));

				expect(listCollectionsSpy).toHaveBeenCalledWith({ name: 'users' }, { nameOnly: false });
				expect(bulkWriteSpy).toHaveBeenCalledTimes(1);
			});

			it('closes a chunk before it reaches the driver batch size limit', async () => {
				const { spy } = deferredBulkWrite();
				mockListCollections([]);
				const padding = 'x'.repeat(20 * 1024);
				const rows = inputRows(2000, (index) => ({ id: `k${index}`, value: padding }));

				await node.execute.call(mockParallelExecuteFunctions(rows, 2));

				const calls = callsOf(spy);
				expect(calls.length).toBeGreaterThanOrEqual(4);
				for (const ops of calls) {
					const bytes = ops.reduce((sum, op) => sum + BSON.calculateObjectSize(op), 0);
					expect(bytes).toBeLessThan(16 * 1024 * 1024);
				}
			});

			it('caps lanes at the client pool size', async () => {
				const connectSpy = vi
					.spyOn(MongoClient, 'connect')
					.mockImplementation(
						async () =>
							await Promise.resolve(
								new MongoClient('mongodb://localhost:27017', { maxPoolSize: 2 }),
							),
					);
				try {
					const { spy, peakInFlight } = deferredBulkWrite();
					mockListCollections([]);

					await node.execute.call(mockParallelExecuteFunctions(inputRows(8000), 8));

					expect(peakInFlight()).toBe(2);
					expect(callsOf(spy).length).toBeGreaterThanOrEqual(8);
				} finally {
					connectSpy.mockRestore();
				}
			});

			it('caps Parallel Writes at 16', async () => {
				const { peakInFlight } = deferredBulkWrite();
				mockListCollections([]);

				await node.execute.call(mockParallelExecuteFunctions(inputRows(20000), 64));

				expect(peakInFlight()).toBe(16);
			});

			it('stops dispatching after the first failure when continue-on-fail is off', async () => {
				const { spy } = deferredBulkWrite({
					handle: (_ops, callIndex) => {
						if (callIndex === 0)
							throw bulkWriteError([{ index: 2, errmsg: 'E11000 duplicate key' }]);
						return {};
					},
				});
				mockListCollections([]);

				const error: unknown = await node.execute
					.call(mockParallelExecuteFunctions(inputRows(8000), 4))
					.catch((caught: unknown) => caught);

				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).message).toBe('E11000 duplicate key');
				const failingId = idsOf(callsOf(spy)[0])[2];
				expect((error as NodeOperationError).context.itemIndex).toBe(Number(failingId.slice(1)));
				expect(spy).toHaveBeenCalledTimes(4);
			});

			it('rethrows the raw driver error when a single lane fails and continue-on-fail is off', async () => {
				vi.spyOn(Collection.prototype, 'bulkWrite').mockRejectedValue(
					bulkWriteError([{ index: 1, errmsg: 'E11000 duplicate key' }], 'bulk write failed'),
				);

				await expect(
					node.execute.call(mockParallelExecuteFunctions(inputRows(3000), 1)),
				).rejects.toThrow('bulk write failed');
			});

			it('keeps per-chunk verdicts and stops a collection after a chunk fails without them when continue-on-fail is on', async () => {
				const { spy } = deferredBulkWrite({
					handle: (_ops, callIndex) => {
						if (callIndex === 0) throw new Error('connection lost');
						if (callIndex === 1)
							throw bulkWriteError([{ index: 0, errmsg: 'E11000 duplicate key' }]);
						return {};
					},
				});
				mockListCollections([]);

				const [items] = await node.execute.call(
					mockParallelExecuteFunctions(inputRows(4000), 2, { continueOnFail: true }),
				);

				expect(spy).toHaveBeenCalledTimes(2);
				expect(spy).toHaveBeenCalledWith(expect.any(Array), { ordered: false });
				const [lostIds, [duplicateId, ...writtenIds]] = callsOf(spy).map(idsOf);
				const written = new Set(writtenIds);
				expect(lostIds.length).toBeGreaterThan(0);
				expect(items).toHaveLength(4000);
				for (const [index, item] of items.entries()) {
					const id = `k${index}`;
					expect(item.pairedItem).toEqual({ item: index });
					if (id === duplicateId) expect(item.json).toEqual({ error: 'E11000 duplicate key' });
					else if (written.has(id)) expect(item.json).toEqual({ id, value: index });
					else expect(item.json).toEqual({ error: 'connection lost' });
				}
			});

			it('stops dispatching once the execution is cancelled', async () => {
				const controller = new AbortController();
				const { spy } = deferredBulkWrite({
					onStart: (_ops, callIndex) => {
						if (callIndex === 1) controller.abort();
					},
				});
				mockListCollections([]);
				const executeFunctions = mockParallelExecuteFunctions(inputRows(4000), 2);
				executeFunctions.getExecutionCancelSignal.mockReturnValue(controller.signal);

				await expect(node.execute.call(executeFunctions)).rejects.toThrow(
					'The execution was cancelled',
				);
				expect(spy).toHaveBeenCalledTimes(2);
			});

			it('issues no bulkWrite when an item fails to prepare and continue-on-fail is off', async () => {
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);
				const rows = inputRows(3000, (index) =>
					index === 1500 ? { value: index } : { id: `k${index}`, value: index },
				);

				await expect(node.execute.call(mockParallelExecuteFunctions(rows, 4))).rejects.toThrow(
					'Item is missing the updateKey field',
				);
				expect(bulkWriteSpy).not.toHaveBeenCalled();
			});

			it('caps the lane count by the number of chunks', async () => {
				const { spy, peakInFlight } = deferredBulkWrite();
				mockListCollections([]);

				await node.execute.call(mockParallelExecuteFunctions(inputRows(1500), 4));

				expect(peakInFlight()).toBe(2);
				expect(callsOf(spy).length).toBeGreaterThanOrEqual(2);
			});

			it('routes ObjectId keys that differ only in hex case to the same lane', async () => {
				const sharedId = '507f1f77bcf86cd799439011';
				const rows = inputRows(4000, (index) => ({
					_id:
						index === 10
							? sharedId.toUpperCase()
							: index === 3010
								? sharedId
								: index.toString(16).padStart(24, '0'),
					value: index,
				}));
				const sharedOps = (ops: Ops) =>
					ops.filter(
						(op) =>
							String(
								(op as unknown as { updateOne: { filter: { _id: unknown } } }).updateOne.filter._id,
							) === sharedId,
					);
				const seen: unknown[] = [];
				let inFlightWithShared = 0;
				let overlapped = false;
				deferredBulkWrite({
					onStart: (ops) => {
						const shared = sharedOps(ops);
						if (shared.length === 0) return;
						if (inFlightWithShared > 0) overlapped = true;
						inFlightWithShared++;
						for (const value of valuesOf(shared)) seen.push(value);
					},
					onSettled: (ops) => {
						if (sharedOps(ops).length > 0) inFlightWithShared--;
					},
				});
				mockListCollections([]);

				await node.execute.call(
					mockParallelExecuteFunctions(rows, 8, {
						params: { updateKey: '_id', fields: '_id,value' },
					}),
				);

				expect(overlapped).toBe(false);
				expect(seen).toEqual([10, 3010]);
			});

			it('writes collection groups one after another', async () => {
				deferredBulkWrite();
				mockListCollections([]);
				const executeFunctions = mockParallelExecuteFunctions(inputRows(4000), 4, {
					params: { collection: (index: number) => (index % 2 === 0 ? 'a' : 'b') },
				});

				const [items] = await node.execute.call(executeFunctions);

				const names = collectionNames(collectionSpy);
				expect(names.length).toBeGreaterThanOrEqual(4);
				expect(names).toEqual([...names].sort());
				expect(items.map((item) => item.pairedItem)).toEqual(
					Array.from({ length: 4000 }, (_, index) => ({ item: index })),
				);
			});

			it('leaves later collection groups untouched after a failure when continue-on-fail is off', async () => {
				const { spy } = deferredBulkWrite({
					handle: (_ops, callIndex) => {
						if (callIndex === 0) throw new Error('boom');
						return {};
					},
				});
				mockListCollections([]);
				const executeFunctions = mockParallelExecuteFunctions(inputRows(4000), 4, {
					params: { collection: (index: number) => (index % 2 === 0 ? 'a' : 'b') },
				});

				await expect(node.execute.call(executeFunctions)).rejects.toThrow('boom');
				expect(collectionNames(collectionSpy)).toEqual(['a', 'a']);
				expect(spy).toHaveBeenCalledTimes(2);
			});

			it('throws the failure of the earliest item when several chunks fail at once', async () => {
				const { spy } = deferredBulkWrite({
					handle: (ops, callIndex) => {
						if (callIndex <= 1)
							throw bulkWriteError([{ index: 0, errmsg: `failed ${idsOf(ops)[0]}` }]);
						return {};
					},
				});
				mockListCollections([]);

				const error: unknown = await node.execute
					.call(mockParallelExecuteFunctions(inputRows(4000), 2))
					.catch((caught: unknown) => caught);

				const earliest = [0, 1]
					.map((callIndex) => Number(idsOf(callsOf(spy)[callIndex])[0].slice(1)))
					.reduce((a, b) => Math.min(a, b));
				expect((error as NodeOperationError).message).toBe(`failed k${earliest}`);
				expect((error as NodeOperationError).context.itemIndex).toBe(earliest);
			});

			it('stops preparing items once the execution is cancelled', async () => {
				const bulkWriteSpy = vi
					.spyOn(Collection.prototype, 'bulkWrite')
					.mockResolvedValue({} as never);
				const controller = new AbortController();
				controller.abort();
				const executeFunctions = mockParallelExecuteFunctions(inputRows(3000), 1);
				executeFunctions.getExecutionCancelSignal.mockReturnValue(controller.signal);

				await expect(node.execute.call(executeFunctions)).rejects.toThrow(
					'The execution was cancelled',
				);
				expect(bulkWriteSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('document operations in version 1.3', () => {
		let collectionSpy: MockInstance;
		const node = new MongoDb();

		beforeEach(() => {
			collectionSpy = vi.spyOn(Db.prototype, 'collection');
		});

		afterEach(() => {
			collectionSpy.mockRestore();
			vi.clearAllMocks();
		});

		describe('query parameters', () => {
			const expectedQuery = { name: 'Alice', age: { $gte: 30 } };

			it('passes the resolved query to find', async () => {
				const findSpy = vi.spyOn(Collection.prototype, 'find').mockReturnValue({
					toArray: async () => [],
				} as never);

				await node.execute.call(mockQueryOperation('find'));

				expect(findSpy).toHaveBeenCalledWith(expectedQuery);
			});

			it('passes the resolved query to deleteMany', async () => {
				const deleteManySpy = vi.spyOn(Collection.prototype, 'deleteMany').mockResolvedValue({
					acknowledged: true,
					deletedCount: 0,
				});

				await node.execute.call(mockQueryOperation('delete'));

				expect(deleteManySpy).toHaveBeenCalledWith(expectedQuery);
			});

			it('passes the resolved query to aggregate', async () => {
				const aggregateSpy = vi.spyOn(Collection.prototype, 'aggregate').mockReturnValue({
					toArray: async () => [],
				} as never);

				await node.execute.call(mockQueryOperation('aggregate'));

				expect(aggregateSpy).toHaveBeenCalledWith([{ $match: expectedQuery }]);
			});

			it('resolves sort parameters into the sort field name', async () => {
				const applied = mockFindCursor();

				await node.execute.call(
					mockQueryOperation('find', { sort: '{ "$1": -1 }', sortParameters: ['name'] }),
				);

				expect(applied.sort).toEqual({ name: -1 });
			});

			it('resolves projection parameters into the projected field name', async () => {
				const applied = mockFindCursor();

				await node.execute.call(
					mockQueryOperation('find', {
						projection: '{ "_id": 0, "$1": 1 }',
						projectionParameters: ['name'],
					}),
				);

				expect(applied.project).toEqual({ _id: 0, name: 1 });
			});

			it.each([
				{
					field: 'sort',
					options: { sort: '{ "$1": -1 }', sortParameters: ['name":-1,"_id'] },
					expected: { 'name":-1,"_id': -1 },
				},
				{
					field: 'projection',
					options: {
						projection: '{ "_id": 0, "$1": 1 }',
						projectionParameters: ['name":1,"password_hash'],
					},
					expected: { _id: 0, 'name":1,"password_hash': 1 },
				},
			])('keeps a $field parameter to a single field', async ({ field, options, expected }) => {
				const applied = mockFindCursor();

				await node.execute.call(mockQueryOperation('find', options));

				expect(field === 'sort' ? applied.sort : applied.project).toEqual(expected);
			});

			it.each(['sort', 'projection'])(
				'rejects a %s parameter that collides with a configured field',
				async (field) => {
					mockFindCursor();

					await expect(
						node.execute.call(
							mockQueryOperation('find', {
								[field]: '{ "_id": 0, "$1": 1 }',
								[`${field}Parameters`]: ['_id'],
							}),
						),
					).rejects.toThrow('"_id" is used more than once');
				},
			);

			it.each([
				{ field: 'sort', parameter: '$where' },
				{ field: 'sort', parameter: 'constructor' },
				{ field: 'projection', parameter: '$where' },
				{ field: 'projection', parameter: 'constructor' },
			])('rejects $parameter bound to a $field field name', async ({ field, parameter }) => {
				mockFindCursor();

				await expect(
					node.execute.call(
						mockQueryOperation('find', {
							[field]: '{ "$1": 1 }',
							[`${field}Parameters`]: [parameter],
						}),
					),
				).rejects.toThrow('is not a valid field name');
			});
		});

		it('groups insert items by collection and uses insertMany per group', async () => {
			const insertOneSpy = vi.spyOn(Collection.prototype, 'insertOne');
			const insertManySpy = vi.spyOn(Collection.prototype, 'insertMany');
			insertManySpy.mockResolvedValue({
				acknowledged: true,
				insertedCount: 1,
				insertedIds: { 0: new ObjectId() },
			});

			await node.execute.call(mockExecuteFunctions(1.3, 'insert'));

			// Each item goes to a different collection → 3 groups → 3 insertMany calls
			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-2',
				'collection-3',
			]);
			expect(insertManySpy).toHaveBeenCalledTimes(3);
			expect(insertOneSpy).not.toHaveBeenCalled();
		});

		it('uses a single insertMany when all items share the same collection', async () => {
			const insertManySpy = vi.spyOn(Collection.prototype, 'insertMany');
			insertManySpy.mockResolvedValue({
				acknowledged: true,
				insertedCount: 3,
				insertedIds: Object.fromEntries(
					[new ObjectId(), new ObjectId(), new ObjectId()].map((id, index) => [index, id]),
				),
			});

			const sameCollectionMock = mockExecuteFunctions(1.3, 'insert');
			sameCollectionMock.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
					switch (parameterName) {
						case 'operation':
							return 'insert';
						case 'collection':
							return 'shared-collection';
						case 'fields':
							return 'id,value';
						case 'options.useDotNotation':
							return false;
						case 'options.dateFields':
							return '';
						default:
							return fallbackValue;
					}
				},
			);

			await node.execute.call(sameCollectionMock);

			expect(insertManySpy).toHaveBeenCalledTimes(1);
			expect(insertManySpy).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Object)]));
		});

		it('pairs each insert output item to its input item', async () => {
			const insertManySpy = vi.spyOn(Collection.prototype, 'insertMany');
			insertManySpy.mockResolvedValue({
				acknowledged: true,
				insertedCount: 1,
				insertedIds: { 0: new ObjectId() },
			});

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'insert'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		it('preserves input order when insert items span multiple collections', async () => {
			// items[0] → col1, items[1] → col2, items[2] → col1
			// groups: {col1: [0,2], col2: [1]} — without sort output would be [0,2,1]
			const interleavedItems = [
				{ json: { id: '1', value: 'first', collection: 'col1' } },
				{ json: { id: '2', value: 'second', collection: 'col2' } },
				{ json: { id: '3', value: 'third', collection: 'col1' } },
			];

			const insertManySpy = vi.spyOn(Collection.prototype, 'insertMany');
			insertManySpy
				.mockResolvedValueOnce({
					acknowledged: true,
					insertedCount: 2,
					insertedIds: { 0: new ObjectId(), 1: new ObjectId() },
				})
				.mockResolvedValueOnce({
					acknowledged: true,
					insertedCount: 1,
					insertedIds: { 0: new ObjectId() },
				});

			const mock = mockExecuteFunctions(1.3, 'insert');
			mock.getInputData.mockReturnValue(interleavedItems);
			mock.getNodeParameter.mockImplementation(
				(parameterName: string, itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
					switch (parameterName) {
						case 'operation':
							return 'insert';
						case 'collection':
							return interleavedItems[itemIndex].json.collection;
						case 'fields':
							return 'id,value';
						case 'options.useDotNotation':
							return false;
						case 'options.dateFields':
							return '';
						default:
							return fallbackValue;
					}
				},
			);

			const [items] = await node.execute.call(mock);

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		it('resolves update collections against each input item', async () => {
			const updateOneSpy = vi.spyOn(Collection.prototype, 'updateOne');
			updateOneSpy.mockResolvedValue({
				acknowledged: true,
				matchedCount: 1,
				modifiedCount: 1,
				upsertedCount: 0,
				upsertedId: null,
			});

			await node.execute.call(mockExecuteFunctions(1.3, 'update'));

			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-2',
				'collection-3',
			]);
			expect(updateOneSpy).toHaveBeenCalledTimes(3);
		});

		it('pairs each update output item to its input item', async () => {
			const updateOneSpy = vi.spyOn(Collection.prototype, 'updateOne');
			updateOneSpy.mockResolvedValue({
				acknowledged: true,
				matchedCount: 1,
				modifiedCount: 1,
				upsertedCount: 0,
				upsertedId: null,
			});

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'update'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		it('resolves find-and-update collections against each input item', async () => {
			const findOneAndUpdateSpy = vi.spyOn(Collection.prototype, 'findOneAndUpdate');
			findOneAndUpdateSpy.mockResolvedValue(null);

			await node.execute.call(mockExecuteFunctions(1.3, 'findOneAndUpdate'));

			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-2',
				'collection-3',
			]);
			expect(findOneAndUpdateSpy).toHaveBeenCalledTimes(3);
		});

		it('pairs each find-and-update output item to its input item', async () => {
			const findOneAndUpdateSpy = vi.spyOn(Collection.prototype, 'findOneAndUpdate');
			findOneAndUpdateSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'findOneAndUpdate'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		it('resolves find-and-replace collections against each input item', async () => {
			const findOneAndReplaceSpy = vi.spyOn(Collection.prototype, 'findOneAndReplace');
			findOneAndReplaceSpy.mockResolvedValue(null);

			await node.execute.call(mockExecuteFunctions(1.3, 'findOneAndReplace'));

			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-2',
				'collection-3',
			]);
			expect(findOneAndReplaceSpy).toHaveBeenCalledTimes(3);
		});

		it('pairs each find-and-replace output item to its input item', async () => {
			const findOneAndReplaceSpy = vi.spyOn(Collection.prototype, 'findOneAndReplace');
			findOneAndReplaceSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'findOneAndReplace'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		describe.each(['findOneAndReplace', 'findOneAndUpdate', 'update'])(
			'%s: non-scalar updateKey value',
			(operation) => {
				const itemsWithObjectKey = [
					{ json: { id: { $regex: '^a' }, value: 'x', collection: 'col1' } },
				];

				function mockObjectKey(continueOnFail: boolean) {
					const mock = mockExecuteFunctions(1.3, operation);
					mock.getInputData.mockReturnValue(itemsWithObjectKey);
					mock.continueOnFail.mockReturnValue(continueOnFail);
					mock.getNodeParameter.mockImplementation(
						(parameterName: string, _itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
							switch (parameterName) {
								case 'operation':
									return operation;
								case 'collection':
									return 'col1';
								case 'fields':
									return 'value';
								case 'updateKey':
									return 'id';
								case 'upsert':
									return false;
								case 'options.useDotNotation':
									return false;
								case 'options.dateFields':
									return '';
								default:
									return fallbackValue;
							}
						},
					);
					return mock;
				}

				it('throws NodeOperationError when continueOnFail is off', async () => {
					await expect(node.execute.call(mockObjectKey(false))).rejects.toThrow(
						/must be a string, number, boolean, or date/,
					);
				});

				it('pushes error item with pairedItem when continueOnFail is on', async () => {
					const [items] = await node.execute.call(mockObjectKey(true));
					expect(items).toHaveLength(1);
					expect(items[0].json.error).toMatch(/must be a string, number, boolean, or date/);
					expect(items[0].pairedItem).toEqual({ item: 0 });
				});

				it('does not invoke the driver for the affected item', async () => {
					const findOneAndReplaceSpy = vi.spyOn(Collection.prototype, 'findOneAndReplace');
					const findOneAndUpdateSpy = vi.spyOn(Collection.prototype, 'findOneAndUpdate');
					const updateOneSpy = vi.spyOn(Collection.prototype, 'updateOne');
					findOneAndReplaceSpy.mockResolvedValue(null);
					findOneAndUpdateSpy.mockResolvedValue(null);
					updateOneSpy.mockResolvedValue({
						acknowledged: true,
						matchedCount: 0,
						modifiedCount: 0,
						upsertedCount: 0,
						upsertedId: null,
					});

					await node.execute.call(mockObjectKey(true));

					expect(findOneAndReplaceSpy).not.toHaveBeenCalled();
					expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
					expect(updateOneSpy).not.toHaveBeenCalled();
				});
			},
		);

		describe.each(['findOneAndReplace', 'findOneAndUpdate', 'update'])(
			'%s: item missing the updateKey field',
			(operation) => {
				const itemsMissingKey = [{ json: { value: 'no-id-field', collection: 'col1' } }];

				function mockMissingKey(continueOnFail: boolean) {
					const mock = mockExecuteFunctions(1.3, operation);
					mock.getInputData.mockReturnValue(itemsMissingKey);
					mock.continueOnFail.mockReturnValue(continueOnFail);
					mock.getNodeParameter.mockImplementation(
						(parameterName: string, _itemIndex = 0, fallbackValue?: NodeParameterValueType) => {
							switch (parameterName) {
								case 'operation':
									return operation;
								case 'collection':
									return 'col1';
								case 'fields':
									return 'value';
								case 'updateKey':
									return 'id';
								case 'upsert':
									return false;
								case 'options.useDotNotation':
									return false;
								case 'options.dateFields':
									return '';
								default:
									return fallbackValue;
							}
						},
					);
					return mock;
				}

				// The !item check fires before any DB call, so no collection spy is needed
				it('throws NodeOperationError when continueOnFail is off', async () => {
					await expect(node.execute.call(mockMissingKey(false))).rejects.toThrow(
						'Item is missing the updateKey field',
					);
				});

				it('pushes error item with pairedItem when continueOnFail is on', async () => {
					const [items] = await node.execute.call(mockMissingKey(true));
					expect(items).toHaveLength(1);
					expect(items[0].json.error).toBe('Item is missing the updateKey field');
					expect(items[0].pairedItem).toEqual({ item: 0 });
				});
			},
		);
	});

	describe('document operations in version 1.2', () => {
		let collectionSpy: MockInstance;
		const node = new MongoDb();

		beforeEach(() => {
			collectionSpy = vi.spyOn(Db.prototype, 'collection');
		});

		afterEach(() => {
			collectionSpy.mockRestore();
			vi.clearAllMocks();
		});

		it('keeps insert using the first item collection', async () => {
			const insertOneSpy = vi.spyOn(Collection.prototype, 'insertOne');
			const insertManySpy = vi.spyOn(Collection.prototype, 'insertMany');
			insertManySpy.mockResolvedValue({
				acknowledged: true,
				insertedCount: 3,
				insertedIds: Object.fromEntries(
					[new ObjectId(), new ObjectId(), new ObjectId()].map((id, index) => [index, id]),
				),
			});

			await node.execute.call(mockExecuteFunctions(1.2, 'insert'));

			expect(collectionNames(collectionSpy)).toEqual(['collection-1']);
			expect(insertManySpy).toHaveBeenCalledTimes(1);
			expect(insertOneSpy).not.toHaveBeenCalled();
		});

		it('pairs all insert output items to all input items as fallback', async () => {
			const insertManySpy = vi.spyOn(Collection.prototype, 'insertMany');
			insertManySpy.mockResolvedValue({
				acknowledged: true,
				insertedCount: 3,
				insertedIds: Object.fromEntries(
					[new ObjectId(), new ObjectId(), new ObjectId()].map((id, index) => [index, id]),
				),
			});

			const [items] = await node.execute.call(mockExecuteFunctions(1.2, 'insert'));

			const fallbackPairedItems = [{ item: 0 }, { item: 1 }, { item: 2 }];
			expect(items[0].pairedItem).toEqual(fallbackPairedItems);
			expect(items[1].pairedItem).toEqual(fallbackPairedItems);
			expect(items[2].pairedItem).toEqual(fallbackPairedItems);
		});

		it('keeps update using the first item collection', async () => {
			const updateOneSpy = vi.spyOn(Collection.prototype, 'updateOne');
			updateOneSpy.mockResolvedValue({
				acknowledged: true,
				matchedCount: 1,
				modifiedCount: 1,
				upsertedCount: 0,
				upsertedId: null,
			});

			await node.execute.call(mockExecuteFunctions(1.2, 'update'));

			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-1',
				'collection-1',
			]);
			expect(updateOneSpy).toHaveBeenCalledTimes(3);
		});

		it('pairs all update output items to all input items as fallback', async () => {
			const updateOneSpy = vi.spyOn(Collection.prototype, 'updateOne');
			updateOneSpy.mockResolvedValue({
				acknowledged: true,
				matchedCount: 1,
				modifiedCount: 1,
				upsertedCount: 0,
				upsertedId: null,
			});

			const [items] = await node.execute.call(mockExecuteFunctions(1.2, 'update'));

			const fallbackPairedItems = [{ item: 0 }, { item: 1 }, { item: 2 }];
			expect(items[0].pairedItem).toEqual(fallbackPairedItems);
			expect(items[1].pairedItem).toEqual(fallbackPairedItems);
			expect(items[2].pairedItem).toEqual(fallbackPairedItems);
		});

		it('pairs all find-and-update output items to all input items as fallback', async () => {
			const findOneAndUpdateSpy = vi.spyOn(Collection.prototype, 'findOneAndUpdate');
			findOneAndUpdateSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.2, 'findOneAndUpdate'));

			const fallbackPairedItems = [{ item: 0 }, { item: 1 }, { item: 2 }];
			expect(items[0].pairedItem).toEqual(fallbackPairedItems);
			expect(items[1].pairedItem).toEqual(fallbackPairedItems);
			expect(items[2].pairedItem).toEqual(fallbackPairedItems);
		});

		it('pairs all find-and-replace output items to all input items as fallback', async () => {
			const findOneAndReplaceSpy = vi.spyOn(Collection.prototype, 'findOneAndReplace');
			findOneAndReplaceSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.2, 'findOneAndReplace'));

			const fallbackPairedItems = [{ item: 0 }, { item: 1 }, { item: 2 }];
			expect(items[0].pairedItem).toEqual(fallbackPairedItems);
			expect(items[1].pairedItem).toEqual(fallbackPairedItems);
			expect(items[2].pairedItem).toEqual(fallbackPairedItems);
		});
	});

	describe('createSearchIndex operation', () => {
		// Direct method replacement (not vi.spyOn) so the recorded calls survive
		// the per-test `restoreMocks` reset in the vitest config.
		const calls: unknown[][] = [];
		const original = Collection.prototype.createSearchIndex;
		beforeAll(() => {
			Collection.prototype.createSearchIndex = async function (...args: unknown[]) {
				calls.push(args);
				return searchIndexName;
			} as typeof Collection.prototype.createSearchIndex;
		});
		afterAll(() => {
			Collection.prototype.createSearchIndex = original;
		});

		testHarness.setupTest(
			buildWorkflow({
				parameters: {
					operation: 'createSearchIndex',
					resource: 'searchIndexes',
					collection: 'foo',
					indexType: 'vectorSearch',
					indexDefinition: JSON.stringify({ mappings: {} }),
					indexNameRequired: searchIndexName,
				},
				expectedResult: [{ json: { indexName: searchIndexName } }],
			}),
		);

		it('calls the spy with the expected arguments', function () {
			expect(calls[0]).toEqual([
				{
					name: searchIndexName,
					definition: { mappings: {} },
					type: 'vectorSearch',
				},
			]);
		});
	});

	describe('listSearchIndexes operation', () => {
		describe('no index name provided', function () {
			const calls: unknown[][] = [];
			const original = Collection.prototype.listSearchIndexes;
			beforeAll(() => {
				Collection.prototype.listSearchIndexes = function (...args: unknown[]) {
					calls.push(args);
					return { toArray: async () => await Promise.resolve([]) } as never;
				} as typeof Collection.prototype.listSearchIndexes;
			});
			afterAll(() => {
				Collection.prototype.listSearchIndexes = original;
			});

			testHarness.setupTest(
				buildWorkflow({
					parameters: {
						resource: 'searchIndexes',
						operation: 'listSearchIndexes',
						collection: 'foo',
					},
					expectedResult: [],
				}),
			);

			it('calls the spy with the expected arguments', function () {
				expect(calls[0]).toEqual([]);
			});
		});

		describe('index name provided', function () {
			const calls: unknown[][] = [];
			const original = Collection.prototype.listSearchIndexes;
			beforeAll(() => {
				Collection.prototype.listSearchIndexes = function (...args: unknown[]) {
					calls.push(args);
					return { toArray: async () => await Promise.resolve([]) } as never;
				} as typeof Collection.prototype.listSearchIndexes;
			});
			afterAll(() => {
				Collection.prototype.listSearchIndexes = original;
			});

			testHarness.setupTest(
				buildWorkflow({
					parameters: {
						resource: 'searchIndexes',
						operation: 'listSearchIndexes',
						collection: 'foo',
						indexName: searchIndexName,
					},
					expectedResult: [],
				}),
			);

			it('calls the spy with the expected arguments', function () {
				expect(calls[0]).toEqual([searchIndexName]);
			});
		});

		describe('return values are transformed into the expected return type', function () {
			const original = Collection.prototype.listSearchIndexes;
			beforeAll(() => {
				Collection.prototype.listSearchIndexes = function () {
					return {
						toArray: async () =>
							await Promise.resolve([{ name: searchIndexName }, { name: 'my-index-2' }]),
					} as never;
				} as typeof Collection.prototype.listSearchIndexes;
			});
			afterAll(() => {
				Collection.prototype.listSearchIndexes = original;
			});

			testHarness.setupTest(
				buildWorkflow({
					parameters: {
						operation: 'listSearchIndexes',
						resource: 'searchIndexes',
						collection: 'foo',
						indexName: searchIndexName,
					},
					expectedResult: [
						{
							json: { name: searchIndexName },
						},
						{
							json: { name: 'my-index-2' },
						},
					],
				}),
			);
		});
	});

	describe('dropSearchIndex operation', () => {
		const calls: unknown[][] = [];
		const original = Collection.prototype.dropSearchIndex;
		beforeAll(() => {
			Collection.prototype.dropSearchIndex = async function (...args: unknown[]) {
				calls.push(args);
				return undefined;
			} as typeof Collection.prototype.dropSearchIndex;
		});
		afterAll(() => {
			Collection.prototype.dropSearchIndex = original;
		});

		testHarness.setupTest(
			buildWorkflow({
				parameters: {
					operation: 'dropSearchIndex',
					resource: 'searchIndexes',
					collection: 'foo',
					indexNameRequired: searchIndexName,
				},
				expectedResult: [searchIndexOperationResult(searchIndexName)],
			}),
		);

		it('calls the spy with the expected arguments', function () {
			expect(calls[0]).toEqual([searchIndexName]);
		});
	});

	describe('updateSearchIndex operation', () => {
		const calls: unknown[][] = [];
		const original = Collection.prototype.updateSearchIndex;
		beforeAll(() => {
			Collection.prototype.updateSearchIndex = async function (...args: unknown[]) {
				calls.push(args);
				return undefined;
			} as typeof Collection.prototype.updateSearchIndex;
		});
		afterAll(() => {
			Collection.prototype.updateSearchIndex = original;
		});

		testHarness.setupTest(
			buildWorkflow({
				parameters: {
					operation: 'updateSearchIndex',
					resource: 'searchIndexes',
					collection: 'foo',
					indexNameRequired: searchIndexName,
					indexDefinition: JSON.stringify({
						mappings: {
							dynamic: true,
						},
					}),
				},
				expectedResult: [searchIndexOperationResult(searchIndexName)],
			}),
		);

		it('calls the spy with the expected arguments', function () {
			expect(calls[0]).toEqual([searchIndexName, { mappings: { dynamic: true } }]);
		});
	});
});
