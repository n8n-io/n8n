import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB - Create Container', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('create.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

		const baseUrl = 'https://n8n-us-east-account.documents.azure.com/dbs/database_1';

		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.post('/colls', {
				id: 'container1',
				partitionKey: {
					paths: ['/id'],
					kind: 'Hash',
					version: 2,
				},
				indexingPolicy: {
					indexingMode: 'consistent',
					automatic: true,
					includedPaths: [
						{
							path: '/*',
						},
					],
					excludedPaths: [],
				},
			})
			.matchHeader('x-ms-offer-throughput', '400')
			.reply(201, {
				id: 'container1',
				indexingPolicy: {
					indexingMode: 'consistent',
					automatic: true,
					includedPaths: [
						{
							path: '/*',
						},
					],
					excludedPaths: [
						{
							path: '/"_etag"/?',
						},
					],
				},
				partitionKey: {
					paths: ['/id'],
					kind: 'Hash',
					version: 2,
				},
				conflictResolutionPolicy: {
					mode: 'LastWriterWins',
					conflictResolutionPath: '/_ts',
					conflictResolutionProcedure: '',
				},
				geospatialConfig: {
					type: 'Geography',
				},
				_rid: '4PVyAOKH+8U=',
				_ts: 1742313299,
				_self: 'dbs/4PVyAA==/colls/4PVyAOKH+8U=/',
				_etag: '"00005702-0000-0300-0000-67d997530000"',
				_docs: 'docs/',
				_sprocs: 'sprocs/',
				_triggers: 'triggers/',
				_udfs: 'udfs/',
				_conflicts: 'conflicts/',
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
