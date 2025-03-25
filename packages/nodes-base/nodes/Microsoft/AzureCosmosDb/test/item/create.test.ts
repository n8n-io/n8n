import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB', () => {
	const workflows = ['nodes/Microsoft/AzureCosmosDb/test/item/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create item', () => {
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
						method: 'post',
						path: '/colls/container1/docs',
						statusCode: 201,
						requestBody: {
							id: 'item1',
						},
						requestHeaders: {
							'x-ms-documentdb-partitionkey': '["item1"]',
						},
						responseBody: {
							id: 'item1',
							_rid: '4PVyAMPuBtoEAAAAAAAAAA==',
							_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/docs/4PVyAMPuBtoEAAAAAAAAAA==/',
							_etag: '"bb000143-0000-0300-0000-67d9a2430000"',
							_attachments: 'attachments/',
							_ts: 1742316099,
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
