import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node - Update Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('update.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.put('/directory/v1/groups/01302m922p525286')
			.reply(200, {
				kind: 'admin#directory#group',
				id: '01302m922p525286',
				etag: '"example"',
				email: 'new3@example.com',
				name: 'new2',
				description: 'new1',
				adminCreated: true,
				aliases: ['new@example.com', 'NewOnes@example.com', 'new2@example.com'],
				nonEditableAliases: [
					'NewOnes@example.com.test-google-a.com',
					'new@example.com.test-google-a.com',
				],
			});
	});

	testWorkflows(workflows);
});
