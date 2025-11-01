import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	channel: 'C08514ZPKB8',
	message_timestamp: '1734322671.726339',
};

describe('Test SlackV2, message => delete', () => {
	nock('https://slack.com').post('/api/chat.delete').reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['delete.workflow.json'],
	});
});
