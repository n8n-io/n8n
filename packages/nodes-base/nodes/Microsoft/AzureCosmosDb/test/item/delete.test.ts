import nock from 'nock';

import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Delete Item', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('delete.workflow.json'),
	);

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
			.delete('/colls/container1/docs/item1')
			.reply(204, '');
	});

	testWorkflows(workflows, credentials);
});
