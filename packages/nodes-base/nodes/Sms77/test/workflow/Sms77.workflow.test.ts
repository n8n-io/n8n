import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const response = { success: '100', total_price: 0.075, balance: 9.925 };

describe('Sms77 > Workflows', () => {
	const credentials = {
		sms77Api: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://gateway.seven.io/api');
		mock.post('/sms').reply(200, response);
		mock.post('/voice').reply(200, response);
	});

	afterAll(() => expect(nock.isDone()).toBe(true));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
