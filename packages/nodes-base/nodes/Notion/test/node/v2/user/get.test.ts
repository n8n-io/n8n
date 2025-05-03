import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'user',
	id: '34a945c6-de97-4efc-90d6-6d7cc14a6583',
	name: 'second',
	avatar_url: null,
	type: 'bot',
	bot: {},
	request_id: 'ad2a00c0-fa6a-4a14-bf9a-68e1715b51a1',
};

describe('Test NotionV2, user => get', () => {
	nock('https://api.notion.com')
		.get('/v1/users/34a945c6-de97-4efc-90d6-6d7cc14a6583')
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
	});
});
