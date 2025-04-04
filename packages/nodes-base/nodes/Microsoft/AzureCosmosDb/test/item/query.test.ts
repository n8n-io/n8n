/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
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
			.post('/colls/container1/docs', {
				query: 'SELECT * FROM c WHERE c.id = @param1',
				parameters: [
					{
						name: '@param1',
						value: 'item1',
					},
				],
			})
			.reply(200, {
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
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
