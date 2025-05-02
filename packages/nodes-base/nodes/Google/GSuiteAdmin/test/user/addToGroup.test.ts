import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Add User to Group', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/users/114393134535981252528')
			.reply(200, { primaryEmail: 'newone@example.com' });

		nock('https://www.googleapis.com/admin')
			.post('/directory/v1/groups/01302m922pmp3e4/members', {
				email: 'newone@example.com',
				role: 'MEMBER',
			})
			.reply(200, {
				kind: 'admin#directory#member',
				status: 'ACTIVE',
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['addToGroup.workflow.json'],
	});
});
