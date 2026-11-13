import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('SIGNL4 > Workflows', () => {
	const credentials = {
		signl4Api: {
			teamSecret: 'a1b2c3d4e5',
		},
	};

	beforeAll(() => {
		const mock = nock('https://connect.signl4.com');
		mock.post('/webhook/a1b2c3d4e5').times(2).reply(200, { eventId: '2518588198735831904' });
	});

	afterAll(() => expect(nock.isDone()).toBe(true));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
