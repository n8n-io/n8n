import nock from 'nock';

import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Get Container', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('get.workflow.json'),
	);

	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.get('/colls/container1')
			.reply(200, {
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
				_rid: '4PVyAMPuBto=',
				_ts: 1742298418,
				_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/',
				_etag: '"00004402-0000-0300-0000-67d95d320000"',
				_docs: 'docs/',
				_sprocs: 'sprocs/',
				_triggers: 'triggers/',
				_udfs: 'udfs/',
				_conflicts: 'conflicts/',
			});
	});

	testWorkflows(workflows, credentials);
});
