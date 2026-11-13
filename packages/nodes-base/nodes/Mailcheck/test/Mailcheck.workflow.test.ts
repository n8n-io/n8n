import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Mailcheck > Workflows', () => {
	const credentials = {
		mailcheckApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		nock('https://api.mailcheck.co/v1')
			.matchHeader('authorization', 'Bearer fake-api-key')
			.post('/singleEmail:check', { email: 'nathan@example.com' })
			.reply(200, { email: 'nathan@example.com', trustRate: 98 });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
