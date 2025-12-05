import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'list',
	results: [
		{
			object: 'user',
			id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			type: 'person',
			person: {
				email: 'user1@example.com',
			},
			name: 'Test User 1',
			avatar_url: null,
		},
		{
			object: 'user',
			id: '99g83d2b-18fe-5cbf-a0gb-342476e924ea',
			type: 'person',
			person: {
				email: 'user2@example.com',
			},
			name: 'Test User 2',
			avatar_url: null,
		},
	],
	has_more: false,
	next_cursor: null,
	type: 'user',
	user: {},
	request_id: '4739925g-gdd1-7i1g-ceg6-f88ih85709e8',
};

describe('Test NotionV3, user => getAll', () => {
	nock('https://api.notion.com').get('/v1/users').query({ page_size: 2 }).reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
