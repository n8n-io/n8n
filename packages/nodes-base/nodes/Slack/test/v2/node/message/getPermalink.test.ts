import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322671726339',
	channel: 'C08514ZPKB8',
};

describe('Test SlackV2, message => getPermalink', () => {
	nock('https://slack.com')
		.get('/api/chat.getPermalink?channel=C08514ZPKB8&message_ts=1734322671.726339')
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getPermalink.workflow.json'],
	});
});
