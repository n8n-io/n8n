import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { Collection, MongoClient } from 'mongodb';
import type { INodeParameters, WorkflowTestData } from 'n8n-workflow';

MongoClient.connect = async function () {
	const driverInfo = {
		name: 'n8n_crud',
		version: '1.2',
	};
	const client = new MongoClient('mongodb://localhost:27017', { driverInfo });
	return client;
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
						name: 'When clicking "Execute Workflow"',
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
					'When clicking "Execute Workflow"': {
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

describe('MongoDB CRUD Node', () => {
	const testHarness = new NodeTestHarness();

	describe('createSearchIndex operation', () => {
		const spy: jest.SpyInstance = jest.spyOn(Collection.prototype, 'createSearchIndex');
		afterAll(() => jest.restoreAllMocks());
		beforeAll(() => {
			spy.mockResolvedValueOnce('my-index');
		});

		testHarness.setupTest(
			buildWorkflow({
				parameters: {
					operation: 'createSearchIndex',
					resource: 'searchIndexes',
					collection: 'foo',
					indexType: 'vectorSearch',
					indexDefinition: JSON.stringify({ mappings: {} }),
					indexNameRequired: 'my-index',
				},
				expectedResult: [{ json: { indexName: 'my-index' } }],
			}),
		);

		it('calls the spy with the expected arguments', function () {
			expect(spy).toBeCalledWith({ name: 'my-index', definition: { mappings: {} } });
		});
	});

	describe('listSearchIndexes operation', () => {
		describe('no index name provided', function () {
			let spy: jest.SpyInstance;
			beforeAll(() => {
				spy = jest.spyOn(Collection.prototype, 'listSearchIndexes');
				const mockCursor = {
					toArray: async () => [],
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
					toArray: async () => [],
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
						indexName: 'my-index',
					},
					expectedResult: [],
				}),
			);

			it('calls the spy with the expected arguments', function () {
				expect(spy).toHaveBeenCalledWith('my-index');
			});
		});

		describe('return values are transformed into the expected return type', function () {
			let spy: jest.SpyInstance;
			beforeAll(() => {
				spy = jest.spyOn(Collection.prototype, 'listSearchIndexes');
				const mockCursor = {
					toArray: async () => [{ name: 'my-index' }, { name: 'my-index-2' }],
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
						indexName: 'my-index',
					},
					expectedResult: [
						{
							json: { name: 'my-index' },
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
					indexNameRequired: 'my-index',
				},
				expectedResult: [{ json: { 'my-index': true } }],
			}),
		);

		it('calls the spy with the expected arguments', function () {
			expect(spy).toBeCalledWith('my-index');
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
					indexNameRequired: 'my-index',
					indexDefinition: JSON.stringify({
						mappings: {
							dynamic: true,
						},
					}),
				},
				expectedResult: [{ json: { 'my-index': true } }],
			}),
		);

		it('calls the spy with the expected arguments', function () {
			expect(spy).toBeCalledWith('my-index', { mappings: { dynamic: true } });
		});
	});
});
