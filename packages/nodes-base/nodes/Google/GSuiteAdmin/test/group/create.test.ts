import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node - Create Group', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.post('/directory/v1/groups', {
				email: 'NewOnes22@example.com',
				name: 'Test',
				description: 'test',
			})
			.reply(200, {
				kind: 'admin#directory#group',
				id: '03mzq4wv15cepg2',
				etag: '"example"',
				email: 'NewOnes22@example.com',
				name: 'Test',
				description: 'test',
				adminCreated: true,
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
