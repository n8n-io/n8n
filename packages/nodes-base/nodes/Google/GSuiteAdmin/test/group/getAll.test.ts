import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Get All Groups', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/groups')
			.query({
				customer: 'my_customer',
				maxResults: '100',
			})
			.reply(200, {
				kind: 'admin#directory#groups',
				etag: '"test_etag"',
				groups: [
					{
						kind: 'admin#directory#group',
						id: '01x0gk373c9z46j',
						etag: '"example"',
						email: 'newoness@example.com',
						name: 'NewOness',
						directMembersCount: '1',
						description: 'test',
						adminCreated: true,
						nonEditableAliases: ['NewOness@example.com.test-google-a.com'],
					},
					{
						kind: 'admin#directory#group',
						id: '01tuee742txc3k4',
						etag: '"example"',
						email: 'newonesss@example.com',
						name: 'NewOne3',
						directMembersCount: '0',
						description: 'test',
						adminCreated: true,
						nonEditableAliases: ['NewOnesss@example.com.test-google-a.com'],
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
