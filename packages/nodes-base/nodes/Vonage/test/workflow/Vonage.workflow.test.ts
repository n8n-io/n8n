import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Vonage > Workflows', () => {
	const credentials = {
		vonageApi: {
			apiKey: 'fake-api-key',
			apiSecret: 'fake-api-secret',
		},
	};

	beforeAll(() => {
		nock('https://rest.nexmo.com')
			.post('/sms/json', (body) => body.to === '4915112345678' && body.api_key === 'fake-api-key')
			.reply(200, {
				messages: [{ to: '4915112345678', 'message-id': '0A0000000123ABCD1', status: '0' }],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
