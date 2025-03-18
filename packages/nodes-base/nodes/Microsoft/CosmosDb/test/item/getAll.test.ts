import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Cosmos DB', () => {
	const workflows = ['nodes/Microsoft/CosmosDb/test/item/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get all items', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1',
				mocks: [
					{
						method: 'get',
						path: '/colls/container1/docs',
						statusCode: 200,
						responseBody: {
							_rid: '4PVyAMPuBto=',
							Documents: [
								{
									id: 'item1',
									_rid: '4PVyAMPuBtoCAAAAAAAAAA==',
									_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/docs/4PVyAMPuBtoCAAAAAAAAAA==/',
									_etag: '"b60042f6-0000-0300-0000-67d982dc0000"',
									_attachments: 'attachments/',
									_ts: 1742308060,
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
						path: '/colls/container1/docs',
						statusCode: 200,
						requestHeaders: {
							'x-ms-continuation': '4PVyAKoVaBQ=',
						},
						responseBody: {
							_rid: '4PVyAMPuBto=',
							Documents: [
								{
									id: 'item2',
									_rid: '4PVyAMPuBtoCAAAAAAAAAA==',
									_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/docs/4PVyAMPuBtoCAAAAAAAAAA==/',
									_etag: '"b60042f6-0000-0300-0000-67d982dc0000"',
									_attachments: 'attachments/',
									_ts: 1742308060,
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
