import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mockDeep } from 'jest-mock-extended';
import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type {
	IExecuteFunctions,
	INode,
	INodeParameters,
	NodeParameterValueType,
	WorkflowTestData,
} from 'n8n-workflow';

import { MongoDb } from '../MongoDb.node';

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

function collectionNames(collectionSpy: jest.SpyInstance): string[] {
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

	describe('document operations in version 1.3', () => {
		let collectionSpy: jest.SpyInstance;
		const node = new MongoDb();

		beforeEach(() => {
			collectionSpy = jest.spyOn(Db.prototype, 'collection');
		});

		afterEach(() => {
			collectionSpy.mockRestore();
			jest.clearAllMocks();
		});

		it('resolves insert collections against each input item', async () => {
			const insertOneSpy = jest.spyOn(Collection.prototype, 'insertOne');
			insertOneSpy
				.mockResolvedValueOnce({ acknowledged: true, insertedId: new ObjectId() })
				.mockResolvedValueOnce({ acknowledged: true, insertedId: new ObjectId() })
				.mockResolvedValueOnce({ acknowledged: true, insertedId: new ObjectId() });

			await node.execute.call(mockExecuteFunctions(1.3, 'insert'));

			expect(collectionNames(collectionSpy)).toEqual([
				'collection-1',
				'collection-2',
				'collection-3',
			]);
			expect(insertOneSpy).toHaveBeenCalledTimes(3);
		});

		it('pairs each insert output item to its input item', async () => {
			const insertOneSpy = jest.spyOn(Collection.prototype, 'insertOne');
			insertOneSpy
				.mockResolvedValueOnce({ acknowledged: true, insertedId: new ObjectId() })
				.mockResolvedValueOnce({ acknowledged: true, insertedId: new ObjectId() })
				.mockResolvedValueOnce({ acknowledged: true, insertedId: new ObjectId() });

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'insert'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		it('resolves update collections against each input item', async () => {
			const updateOneSpy = jest.spyOn(Collection.prototype, 'updateOne');
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
			const updateOneSpy = jest.spyOn(Collection.prototype, 'updateOne');
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
			const findOneAndUpdateSpy = jest.spyOn(Collection.prototype, 'findOneAndUpdate');
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
			const findOneAndUpdateSpy = jest.spyOn(Collection.prototype, 'findOneAndUpdate');
			findOneAndUpdateSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'findOneAndUpdate'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});

		it('resolves find-and-replace collections against each input item', async () => {
			const findOneAndReplaceSpy = jest.spyOn(Collection.prototype, 'findOneAndReplace');
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
			const findOneAndReplaceSpy = jest.spyOn(Collection.prototype, 'findOneAndReplace');
			findOneAndReplaceSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.3, 'findOneAndReplace'));

			expect(items[0].pairedItem).toEqual({ item: 0 });
			expect(items[1].pairedItem).toEqual({ item: 1 });
			expect(items[2].pairedItem).toEqual({ item: 2 });
		});
	});

	describe('document operations in version 1.2', () => {
		let collectionSpy: jest.SpyInstance;
		const node = new MongoDb();

		beforeEach(() => {
			collectionSpy = jest.spyOn(Db.prototype, 'collection');
		});

		afterEach(() => {
			collectionSpy.mockRestore();
			jest.clearAllMocks();
		});

		it('keeps insert using the first item collection', async () => {
			const insertOneSpy = jest.spyOn(Collection.prototype, 'insertOne');
			const insertManySpy = jest.spyOn(Collection.prototype, 'insertMany');
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
			const insertManySpy = jest.spyOn(Collection.prototype, 'insertMany');
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
			const updateOneSpy = jest.spyOn(Collection.prototype, 'updateOne');
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
			const updateOneSpy = jest.spyOn(Collection.prototype, 'updateOne');
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
			const findOneAndUpdateSpy = jest.spyOn(Collection.prototype, 'findOneAndUpdate');
			findOneAndUpdateSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.2, 'findOneAndUpdate'));

			const fallbackPairedItems = [{ item: 0 }, { item: 1 }, { item: 2 }];
			expect(items[0].pairedItem).toEqual(fallbackPairedItems);
			expect(items[1].pairedItem).toEqual(fallbackPairedItems);
			expect(items[2].pairedItem).toEqual(fallbackPairedItems);
		});

		it('pairs all find-and-replace output items to all input items as fallback', async () => {
			const findOneAndReplaceSpy = jest.spyOn(Collection.prototype, 'findOneAndReplace');
			findOneAndReplaceSpy.mockResolvedValue(null);

			const [items] = await node.execute.call(mockExecuteFunctions(1.2, 'findOneAndReplace'));

			const fallbackPairedItems = [{ item: 0 }, { item: 1 }, { item: 2 }];
			expect(items[0].pairedItem).toEqual(fallbackPairedItems);
			expect(items[1].pairedItem).toEqual(fallbackPairedItems);
			expect(items[2].pairedItem).toEqual(fallbackPairedItems);
		});
	});

	describe('createSearchIndex operation', () => {
		const spy: jest.SpyInstance = jest.spyOn(Collection.prototype, 'createSearchIndex');
		afterAll(() => jest.restoreAllMocks());
		beforeAll(() => {
			spy.mockResolvedValueOnce(searchIndexName);
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
			expect(spy).toBeCalledWith({
				name: searchIndexName,
				definition: { mappings: {} },
				type: 'vectorSearch',
			});
		});
	});

	describe('listSearchIndexes operation', () => {
		describe('no index name provided', function () {
			let spy: jest.SpyInstance;
			beforeAll(() => {
				spy = jest.spyOn(Collection.prototype, 'listSearchIndexes');
				const mockCursor = {
					toArray: async () => await Promise.resolve([]),
				};
				spy.mockReturnValue(mockCursor);
			});

			afterAll(() => jest.restoreAllMocks());

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
				expect(spy).toHaveBeenCalledWith();
			});
		});

		describe('index name provided', function () {
			let spy: jest.SpyInstance;
			beforeAll(() => {
				spy = jest.spyOn(Collection.prototype, 'listSearchIndexes');
				const mockCursor = {
					toArray: async () => await Promise.resolve([]),
				};
				spy.mockReturnValue(mockCursor);
			});

			afterAll(() => jest.restoreAllMocks());

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
				expect(spy).toHaveBeenCalledWith(searchIndexName);
			});
		});

		describe('return values are transformed into the expected return type', function () {
			let spy: jest.SpyInstance;
			beforeAll(() => {
				spy = jest.spyOn(Collection.prototype, 'listSearchIndexes');
				const mockCursor = {
					toArray: async () =>
						await Promise.resolve([{ name: searchIndexName }, { name: 'my-index-2' }]),
				};
				spy.mockReturnValue(mockCursor);
			});

			afterAll(() => jest.restoreAllMocks());

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
		let spy: jest.SpyInstance;
		afterAll(() => jest.restoreAllMocks());
		beforeAll(() => {
			spy = jest.spyOn(Collection.prototype, 'dropSearchIndex');
			spy.mockResolvedValueOnce(undefined);
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
			expect(spy).toBeCalledWith(searchIndexName);
		});
	});

	describe('updateSearchIndex operation', () => {
		let spy: jest.SpyInstance;
		afterAll(() => jest.restoreAllMocks());
		beforeAll(() => {
			spy = jest.spyOn(Collection.prototype, 'updateSearchIndex');
			spy.mockResolvedValueOnce(undefined);
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
			expect(spy).toBeCalledWith(searchIndexName, { mappings: { dynamic: true } });
		});
	});
});
