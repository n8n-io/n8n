import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Sendy > Workflows', () => {
	const credentials = {
		sendyApi: {
			url: 'https://newsletter.example.com/sendy',
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://newsletter.example.com/sendy');
		mock.post('/api/campaigns/create.php').reply(200, 'Campaign created');
		mock.post('/subscribe').reply(200, '1');
		mock.post('/api/subscribers/active-subscriber-count.php').reply(200, '42');
		mock.post('/api/subscribers/delete.php').reply(200, '1');
		mock.post('/unsubscribe').reply(200, '1');
		mock.post('/api/subscribers/subscription-status.php').reply(200, 'Subscribed');
	});

	afterAll(() => expect(nock.isDone()).toBe(true));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
