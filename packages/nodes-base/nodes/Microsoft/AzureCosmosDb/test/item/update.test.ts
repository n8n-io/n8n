import nock from 'nock';

import {
	initBinaryDataService,
	testWorkflows,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB - Update Item', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('update.workflow.json'),
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
			.get('/colls/container1')
			.reply(200, {
				id: 'containerFromSDK',
				indexingPolicy: {
					indexingMode: 'consistent',
					automatic: true,
					includedPaths: [{ path: '/*' }],
					excludedPaths: [{ path: '/"_etag"/?' }],
				},
				partitionKey: {
					paths: ['/id'],
					kind: 'Hash',
				},
				conflictResolutionPolicy: {
					mode: 'LastWriterWins',
					conflictResolutionPath: '/_ts',
					conflictResolutionProcedure: '',
				},
				geospatialConfig: {
					type: 'Geography',
				},
				_rid: '4PVyAMLVz0c=',
				_ts: 1739178329,
				_self: 'dbs/4PVyAA==/colls/4PVyAMLVz0c=/',
				_etag: '"0000f905-0000-0300-0000-67a9c1590000"',
				_docs: 'docs/',
				_sprocs: 'sprocs/',
				_triggers: 'triggers/',
				_udfs: 'udfs/',
				_conflicts: 'conflicts/',
			})
			.put('/colls/container1/docs/item1', {
				id: 'item1',
				key1: 'value1',
			})
			.matchHeader('x-ms-documentdb-partitionkey', '["item1"]')
			.reply(200, {
				id: 'item1',
				key1: 'value1',
				_rid: '4PVyAMPuBtoEAAAAAAAAAA==',
				_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/docs/4PVyAMPuBtoEAAAAAAAAAA==/',
				_etag: '"bb002b70-0000-0300-0000-67d9a3c70000"',
				_attachments: 'attachments/',
				_ts: 1742316487,
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
