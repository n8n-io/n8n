import nock from 'nock';

import {
	initBinaryDataService,
	testWorkflows,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB - Delete Container', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('delete.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

		const baseUrl = 'https://n8n-us-east-account.documents.azure.com/dbs/database_1';

		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.delete('/colls/container1')
			.reply(204, {});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
