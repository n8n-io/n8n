import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

const API_RESPONSE = {
	ok: true,
	channel: 'C08514ZPKB8',
	message_timestamp: '1734322671.726339',
};

describe('Test SlackV2, message => delete', () => {
	nock('https://slack.com').post('/api/chat.delete').reply(200, API_RESPONSE);

	const workflows = ['nodes/Slack/test/v2/node/message/delete.workflow.json'];
	testWorkflows(workflows);
});
