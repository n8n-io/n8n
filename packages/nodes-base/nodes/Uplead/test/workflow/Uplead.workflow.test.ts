import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Uplead > Workflows', () => {
	const credentials = { upleadApi: { apiKey: 'fake-api-key' } };
	const mock = nock('https://api.uplead.com/v2').matchHeader('authorization', 'fake-api-key');

	beforeAll(() => {
		mock
			.get('/person-search')
			.query({ email: 'nathan@example.com' })
			.reply(200, { data: { id: 1, email: 'nathan@example.com' } });
		mock
			.get('/company-search')
			.query({ domain: 'example.com' })
			.reply(200, { data: { id: 2, domain: 'example.com' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(mock.pendingMocks()).toEqual([]),
	});
});
