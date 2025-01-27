import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

const API_RESPONSE = {
	ok: true,
};

describe('Test SlackV2, channel => append', () => {
	nock('https://slack.com').post('/api/conversations.archive').reply(200, API_RESPONSE);

	const workflows = ['nodes/Slack/test/v2/node/channel/archive.workflow.json'];
	testWorkflows(workflows);
});
