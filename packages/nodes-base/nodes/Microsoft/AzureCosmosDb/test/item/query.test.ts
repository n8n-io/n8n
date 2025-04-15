import nock from 'nock';

import {
	initBinaryDataService,
	testWorkflows,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB - Query Items', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('query.workflow.json'),
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

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
