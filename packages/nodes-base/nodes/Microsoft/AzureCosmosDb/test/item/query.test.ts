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

describe('Azure Cosmos DB - Query Items with Numeric Parameters', () => {
	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.post('/colls/newId/docs', {
				query: 'SELECT * FROM c WHERE c.projectId = @Param1 AND c.startDate = @Param2',
				parameters: [
					{
						name: '@Param1',
						value: 'P12223',
					},
					{
						name: '@Param2',
						value: 1737062400000,
					},
				],
			})
			.reply(200, {
				Documents: [
					{
						id: 'User1',
						projectId: 'P12223',
						startDate: 1737062400000,
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['queryNumericParams.workflow.json'],
	});
});
