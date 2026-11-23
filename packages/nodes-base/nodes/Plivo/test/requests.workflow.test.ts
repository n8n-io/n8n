import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Plivo > Workflows', () => {
	const credentials = {
		plivoApi: { authId: 'MAXXXXXXXXXXXXXXXXXX', authToken: 'fake-auth-token' },
	};

	beforeAll(() => {
		const mock = nock('https://api.plivo.com/v1/Account/MAXXXXXXXXXXXXXXXXXX');
		mock
			.post('/Message/', (body) => body.type === undefined)
			.reply(200, { message_uuid: ['sms-1'] });
		mock.post('/Message/', (body) => body.type === 'mms').reply(200, { message_uuid: ['mms-1'] });
		mock.post('/Call/').reply(200, { request_uuid: 'call-1' });
	});

	afterAll(() => expect(nock.pendingMocks()).toEqual([]));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
