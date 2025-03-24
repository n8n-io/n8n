import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Cosmos DB', () => {
	const workflows = ['nodes/Microsoft/CosmosDb/test/container/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create container', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1',
				mocks: [
					{
						method: 'post',
						path: '/colls',
						statusCode: 201,
						requestBody: {
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
						},
						requestHeaders: {
							'x-ms-offer-throughput': '400',
						},
						responseBody: {
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
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
