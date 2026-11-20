import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const accountSid = 'AC0123456789abcdef0123456789abcdef';

describe('Twilio > Workflows', () => {
	const credentials = {
		twilioApi: {
			accountSid,
			authType: 'authToken',
			authToken: 'fake-auth-token',
		},
	};

	beforeAll(() => {
		const twilio = nock(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}`);
		twilio.post('/Messages.json').reply(200, { sid: 'SM0123456789abcdef0123456789abcdef' });
		twilio.post('/Calls.json').reply(200, { sid: 'CA0123456789abcdef0123456789abcdef' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
