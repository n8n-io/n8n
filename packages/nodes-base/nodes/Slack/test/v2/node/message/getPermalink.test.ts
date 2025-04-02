import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

const API_RESPONSE = {
	ok: true,
	permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322671726339',
	channel: 'C08514ZPKB8',
};

describe('Test SlackV2, message => getPermalink', () => {
	nock('https://slack.com')
		.get('/api/chat.getPermalink?channel=C08514ZPKB8&message_ts=1734322671.726339')
		.reply(200, API_RESPONSE);

	const workflows = ['nodes/Slack/test/v2/node/message/getPermalink.workflow.json'];
	testWorkflows(workflows);
});
