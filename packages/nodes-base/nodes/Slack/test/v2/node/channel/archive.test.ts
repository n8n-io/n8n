import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
};

describe('Test SlackV2, channel => append', () => {
	nock('https://slack.com').post('/api/conversations.archive').reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['archive.workflow.json'],
	});
});
