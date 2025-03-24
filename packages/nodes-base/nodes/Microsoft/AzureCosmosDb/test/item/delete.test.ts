import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';
import nock from 'nock';

describe('Azure Cosmos DB', () => {
	const workflows = ['nodes/Microsoft/CosmosDb/test/item/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should delete item', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1',
				mocks: [
					{
						method: 'get',
						path: '/colls/container1',
						statusCode: 200,
						responseBody: {
							id: 'containerFromSDK',
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
						},
					},
					{
						method: 'delete',
						path: '/colls/container1/docs/item1',
						statusCode: 204,
						requestHeaders: {
							'x-ms-documentdb-partitionkey': '["item1"]',
						},
						responseBody: '',
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
