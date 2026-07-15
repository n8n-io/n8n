import { NodeTestHarness } from '@n8n/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Delete User', () => {
	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.delete('/directory/v1/users/114393134535981252212')
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['delete.workflow.json'],
	});
});
