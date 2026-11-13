import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Segment > Workflows', () => {
	const credentials = {
		segmentApi: {
			writekey: 'test-write-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.segment.io/v1');
		mock.post('/group').reply(200, { success: true });
		mock.post('/identify').reply(200, { success: true });
		mock.post('/track').reply(200, { success: true });
		mock.post('/page').reply(200, { success: true });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
