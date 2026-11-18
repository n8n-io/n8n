import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Pushcut > Workflows', () => {
	const credentials = {
		pushcutApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		nock('https://api.pushcut.io/v1')
			.matchHeader('api-key', 'fake-api-key')
			.post('/notifications/Door%20Bell')
			.reply(200, { id: 'nGSN9z3pGwaFzLV5GdtqL', message: 'Notification sent successfully.' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
