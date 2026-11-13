import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Mailgun > Workflows', () => {
	const credentials = {
		mailgunApi: {
			apiDomain: 'api.eu.mailgun.net',
			emailDomain: 'mg.example.com',
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		nock('https://api.eu.mailgun.net').post('/v3/mg.example.com/messages').reply(200, {
			id: '<20261012120000.1.ABCDEF@mg.example.com>',
			message: 'Queued. Thank you.',
		});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
