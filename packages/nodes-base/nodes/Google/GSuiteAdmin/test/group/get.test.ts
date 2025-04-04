import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node - Get Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('get.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/groups/01302m922pmp3e4')
			.reply(200, {
				kind: 'admin#directory#group',
				id: '01302m922pmp3e4',
				etag: '"example"',
				email: 'new3@example.com',
				name: 'new2',
				directMembersCount: '2',
				description: 'new1',
				adminCreated: true,
				aliases: ['new2@example.com', 'new@example.com', 'NewOnes@example.com'],
				nonEditableAliases: [
					'NewOnes@example.com.test-google-a.com',
					'new@example.com.test-google-a.com',
					'new2@example.com.test-google-a.com',
					'new3@example.com.test-google-a.com',
				],
			});
	});

	testWorkflows(workflows);
});
