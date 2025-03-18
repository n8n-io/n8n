/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Cosmos DB', () => {
	const workflows = ['nodes/Microsoft/CosmosDb/test/item/query.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should query items', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1',
				mocks: [
					{
						method: 'post',
						path: '/colls/container1/docs',
						statusCode: 200,
						requestBody: {
							query: 'SELECT * FROM c WHERE c.id = @param1',
							parameters: [
								{
									name: '@param1',
									value: 'item1',
								},
							],
						},
						responseBody: {
							_rid: '4PVyAMPuBto=',
							Documents: [
								{
									id: 'item1',
									_rid: '4PVyAMPuBtoFAAAAAAAAAA==',
									_self: 'dbs/4PVyAA==/colls/4PVyAMPuBto=/docs/4PVyAMPuBtoFAAAAAAAAAA==/',
									_etag: '"bb00c77c-0000-0300-0000-67d9a4330000"',
									_attachments: 'attachments/',
									_ts: 1742316595,
								},
							],
							_count: 1,
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
