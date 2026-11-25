import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Pushover > Workflows', () => {
	const credentials = {
		pushoverApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		nock('https://api.pushover.net/1')
			.post('/messages.json')
			.reply(200, { status: 1, request: '647d2300-702c-4b38-8b2f-d56326ae460b' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
