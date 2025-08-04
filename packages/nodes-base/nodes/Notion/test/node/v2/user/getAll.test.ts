import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	results: [
		{
			object: 'user',
			id: 'f215e49c-4677-40c0-9adc-87440d341324',
			name: 'n8n-test',
			avatar_url: null,
			type: 'bot',
			bot: {
				owner: {
					type: 'workspace',
					workspace: true,
				},
				workspace_name: "Michael Kret's Notion",
			},
		},
		{
			object: 'user',
			id: '34a945c6-de97-4efc-90d6-6d7cc14a6583',
			name: 'second',
			avatar_url: null,
			type: 'bot',
			bot: {},
		},
		{
			object: 'user',
			id: '2598a5de-49b3-4acd-adad-20f6b18c9fbe',
			name: 'DryMerge',
			avatar_url:
				'https://s3-us-west-2.amazonaws.com/public.notion-static.com/e67863a3-a867-4355-a602-c9830dbb1828/Primary_(recommended).jpg',
			type: 'bot',
			bot: {},
		},
	],
	has_more: false,
};

describe('Test NotionV2, user => getAll', () => {
	nock('https://api.notion.com').get('/v1/users').reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
