import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node - Add User to Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('addToGroup.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

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

	testWorkflows(workflows);
});
