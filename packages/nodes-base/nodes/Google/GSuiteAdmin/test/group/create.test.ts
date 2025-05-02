import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node - Create Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('create.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

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

	testWorkflows(workflows);
});
