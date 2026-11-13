import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const ok = { status: 200, message: 'Success.' };
const authorized = (body: Record<string, string>) => body.auth_token === 'fake-auth-token';

describe('Vero > Workflows', () => {
	const credentials = { veroApi: { authToken: 'fake-auth-token' } };
	const mock = nock('https://api.getvero.com/api/v2');

	beforeAll(() => {
		mock.post('/users/track', authorized).reply(200, ok);
		mock.put('/users/reidentify', authorized).reply(200, ok);
		mock.post('/users/unsubscribe', authorized).reply(200, ok);
		mock.post('/users/resubscribe', authorized).reply(200, ok);
		mock.post('/users/delete', authorized).reply(200, ok);
		mock.put('/users/tags/edit', authorized).times(2).reply(200, ok);
		mock.post('/events/track', authorized).reply(200, ok);
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(mock.pendingMocks()).toEqual([]),
	});
});
