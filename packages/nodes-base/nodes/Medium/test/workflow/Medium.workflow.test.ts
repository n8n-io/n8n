import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Medium > Workflows', () => {
	const credentials = {
		mediumApi: {
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.medium.com/v1').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		mock
			.post('/publications/5e3b1c9a2f4d/posts')
			.reply(200, { data: { id: 'e6f36a', title: 'Hello' } });
		mock
			.get('/me')
			.times(2)
			.reply(200, { data: { id: '1a2b3c' } });
		mock.post('/users/1a2b3c/posts').reply(200, { data: { id: 'f7a47b', title: 'Hello' } });
		mock
			.get('/users/1a2b3c/publications')
			.reply(200, { data: [{ id: '5e3b1c9a2f4d', name: 'Acme Corp' }] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
