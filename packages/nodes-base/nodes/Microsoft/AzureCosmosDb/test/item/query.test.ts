import nock from 'nock';

import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Query Items', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('query.workflow.json'),
	);

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

	testWorkflows(workflows, credentials);
});
