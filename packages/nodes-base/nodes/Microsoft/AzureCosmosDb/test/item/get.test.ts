import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Get Item', () => {
	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

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
			.get('/colls/container1/docs/item1')
			.matchHeader('x-ms-documentdb-partitionkey', '["item1"]')
			.reply(200, {
				id: 'item1',
				_rid: '4PVyAMPuBtoEAAAAAAAAAA==',
				_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/docs/4PVyAMPuBtoEAAAAAAAAAA==/',
				_etag: '"bb000143-0000-0300-0000-67d9a2430000"',
				_attachments: 'attachments/',
				_ts: 1742316099,
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json'],
	});
});
