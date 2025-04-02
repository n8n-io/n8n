import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

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

	const workflows = ['nodes/Notion/test/node/v2/user/get.workflow.json'];
	testWorkflows(workflows);
});
