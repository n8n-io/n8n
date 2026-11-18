import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Mocean > Workflows', () => {
	const credentials = {
		moceanApi: { 'mocean-api-key': 'fake-key', 'mocean-api-secret': 'fake-secret' },
	};

	beforeAll(() => {
		const mock = nock('https://rest.moceanapi.com/rest/2');
		mock.post('/sms').reply(200, {
			messages: [{ status: 0, receiver: '60123456789', msgid: 'sms-msg-1' }],
		});
		mock.post('/voice/dial').reply(200, {
			voice: [{ status: 0, receiver: '60123456789', session_uuid: 'voice-session-1' }],
		});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
