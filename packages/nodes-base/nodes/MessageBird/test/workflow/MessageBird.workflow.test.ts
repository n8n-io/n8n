import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('MessageBird > Workflows', () => {
	const credentials = {
		messageBirdApi: {
			accessKey: 'fake-access-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://rest.messagebird.com').matchHeader(
			'authorization',
			'AccessKey fake-access-key',
		);
		mock
			.post('/messages', { recipients: [31612345678], originator: 'Acme', body: 'Hello' })
			.reply(200, { id: 'e8077d803532c0b5937c639b60216938' });
		mock.get('/balance').reply(200, { payment: 'prepaid', type: 'credits', amount: 10 });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
