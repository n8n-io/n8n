import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Rundeck', () => {
	const credentials = {
		rundeckApi: {
			url: 'https://rundeck.example.com',
			token: 'test-token',
			sslCertificateValidation: 'default',
		},
	};

	const jobId = '3f0e0c6a-4f6e-4c5e-9a3b-2b1c0d9e8f7a';

	beforeAll(() => {
		const api = nock('https://rundeck.example.com');
		api
			.post(`/api/14/job/${jobId}/run`, { argString: '-env prod ' })
			.query({ filter: 'name: web' })
			.reply(200, { id: 42, status: 'running' });
		api.get(`/api/18/job/${jobId}/info`).reply(200, { id: jobId, name: 'Deploy' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
