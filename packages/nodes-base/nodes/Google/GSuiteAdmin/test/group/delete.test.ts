import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Delete Group', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.delete('/directory/v1/groups/01302m922pmp3e4')
			.reply(204, '');
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['delete.workflow.json'],
	});
});
