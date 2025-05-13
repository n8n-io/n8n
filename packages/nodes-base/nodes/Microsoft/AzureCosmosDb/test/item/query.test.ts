import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Query Items', () => {
	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.post('/colls/newId/docs', {
				query: 'SELECT * FROM c WHERE c.id = @Param1',
				parameters: [
					{
						name: '@Param1',
						value: 'User1',
					},
				],
			})
			.reply(200, {
				Documents: [
					{
						id: 'User1',
						key1: 'value',
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['query.workflow.json'],
	});
});
