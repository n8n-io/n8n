import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Get Many Members', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/groups/01x0gk373c9z46j/members')
			.query({
				maxResults: '100',
			})
			.reply(200, {
				kind: 'admin#directory#members',
				etag: '"test_etag"',
				members: [
					{
						kind: 'admin#directory#member',
						etag: '"example"',
						id: '123456789',
						email: 'alice@example.com',
						role: 'OWNER',
						type: 'USER',
						status: 'ACTIVE',
						delivery_settings: 'ALL_MAIL',
					},
					{
						kind: 'admin#directory#member',
						etag: '"example2"',
						id: '987654321',
						email: 'bob@example.com',
						role: 'MEMBER',
						type: 'USER',
						status: 'ACTIVE',
						delivery_settings: 'ALL_MAIL',
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getMembers.workflow.json'],
	});
});
