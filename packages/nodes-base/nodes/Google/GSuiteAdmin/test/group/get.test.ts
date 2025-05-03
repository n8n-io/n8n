import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Get Group', () => {
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

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
	});
});
