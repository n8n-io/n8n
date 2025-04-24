import nock from 'nock';

import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Delete Container', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('delete.workflow.json'),
	);

	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.delete('/colls/container1')
			.reply(204, {});
	});

	testWorkflows(workflows, credentials);
});
