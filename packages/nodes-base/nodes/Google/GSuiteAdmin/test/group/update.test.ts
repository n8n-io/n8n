import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Update Group', () => {
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

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
	});
});
