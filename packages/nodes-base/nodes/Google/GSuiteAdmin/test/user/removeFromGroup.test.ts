import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node - Remove User from Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('removeFromGroup.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.delete('/directory/v1/groups/01302m922pmp3e4/members/114393134535981252528')
			.reply(200, {});
	});

	testWorkflows(workflows);
});
