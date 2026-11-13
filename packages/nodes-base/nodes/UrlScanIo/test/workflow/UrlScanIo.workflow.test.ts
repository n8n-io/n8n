import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const scanId = '68e26c59-2eae-437b-aeb1-cf750fafe7d7';

describe('urlscan.io > Workflows', () => {
	const credentials = { urlScanIoApi: { apiKey: 'fake-api-key' } };
	const mock = nock('https://urlscan.io/api/v1');

	beforeAll(() => {
		mock.get(`/result/${scanId}`).reply(200, { task: { uuid: scanId } });
		mock
			.get('/search')
			.query({ q: 'domain:example.com', size: 100 })
			.reply(200, { results: [{ _id: scanId, sort: [1, scanId] }], total: 1 });
		mock
			.post('/scan', { url: 'https://example.com' })
			.reply(200, { uuid: scanId, message: 'Submission successful' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(mock.pendingMocks()).toEqual([]),
	});
});
