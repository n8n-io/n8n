import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Delete Container', () => {
	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.delete('/colls/container1')
			.reply(204, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
