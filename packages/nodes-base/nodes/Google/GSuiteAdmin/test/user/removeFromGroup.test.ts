import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Remove User from Group', () => {
	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.delete('/directory/v1/groups/01302m922pmp3e4/members/114393134535981252528')
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['removeFromGroup.workflow.json'],
	});
});
