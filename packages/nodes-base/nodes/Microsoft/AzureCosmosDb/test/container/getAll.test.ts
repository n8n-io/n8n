import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB', () => {
	const workflows = ['nodes/Microsoft/AzureCosmosDb/test/container/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get all containers', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1',
				mocks: [
					{
						method: 'get',
						path: '/colls',
						statusCode: 200,
						responseBody: {
							_rid: '4PVyAA==',
							DocumentCollections: [
								{
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
									_rid: '4PVyAKoVaBQ=',
									_ts: 1738759686,
									_self: 'dbs/4PVyAA==/colls/4PVyAKoVaBQ=/',
									_etag: '"0000d72f-0000-0300-0000-67a35e060000"',
									_docs: 'docs/',
									_sprocs: 'sprocs/',
									_triggers: 'triggers/',
									_udfs: 'udfs/',
									_conflicts: 'conflicts/',
								},
							],
							_count: 1,
						},
						responseHeaders: {
							'x-ms-continuation': '4PVyAKoVaBQ=',
						},
					},
					{
						method: 'get',
						path: '/colls',
						statusCode: 200,
						requestHeaders: {
							'x-ms-continuation': '4PVyAKoVaBQ=',
						},
						responseBody: {
							_rid: '4PVyAA==',
							DocumentCollections: [
								{
									id: 'container2',
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
									_rid: '4PVyAKoVaBQ=',
									_ts: 1738759686,
									_self: 'dbs/4PVyAA==/colls/4PVyAKoVaBQ=/',
									_etag: '"0000d72f-0000-0300-0000-67a35e060000"',
									_docs: 'docs/',
									_sprocs: 'sprocs/',
									_triggers: 'triggers/',
									_udfs: 'udfs/',
									_conflicts: 'conflicts/',
								},
							],
							_count: 1,
						},
						responseHeaders: {},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
