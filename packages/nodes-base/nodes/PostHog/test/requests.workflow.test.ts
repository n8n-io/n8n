import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('PostHog > Workflows', () => {
	const credentials = {
		postHogApi: { url: 'https://posthog.example.com', apiKey: 'fake-api-key' },
	};

	beforeAll(() => {
		const mock = nock('https://posthog.example.com');
		mock.post('/batch', (body) => body.type === 'alias').reply(200, { status: 1 });
		mock.post('/capture').reply(200, { status: 1 });
		mock.post('/batch', (body) => body.event === '$identify').reply(200, { status: 1 });
		mock.post('/batch', (body) => body.type === 'page').reply(200, { status: 1 });
	});

	afterAll(() => expect(nock.pendingMocks()).toEqual([]));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
