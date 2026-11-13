import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const rows = [{ id: 42, name: 'Nathan Smith', email: 'nathan@example.com' }];

describe('Supabase > Workflows', () => {
	const credentials = {
		supabaseApi: {
			host: 'https://abcdefghijklmnop.supabase.co',
			serviceRole: 'fake-service-role',
		},
	};

	beforeAll(() => {
		const api = nock('https://abcdefghijklmnop.supabase.co');
		const path = (expected: string) => (uri: string) => uri === expected;

		api.post(path('/rest/v1/users'), [{ name: 'Nathan Smith' }]).reply(200, rows);
		api.get(path('/rest/v1/users?id=eq.42')).reply(200, rows);
		api.get(path('/rest/v1/user%20profiles?limit=50')).reply(200, rows);
		api
			.get(path('/rest/v1/users?email=eq.%22nathan%40example.com%22&name=ilike.*nat*'))
			.reply(200, rows);
		api.patch(path('/rest/v1/users?id=eq.42'), { name: 'Nathan Smith' }).reply(200, rows);
		api.patch(path('/rest/v1/users?id=in.(42,43)'), { name: 'Nathan Smith' }).reply(200, rows);
		api.delete(path('/rest/v1/users?or=%28id.eq.42%29')).reply(200, rows);
		api.delete(path('/rest/v1/users?name=eq.Nathan%20Smith')).reply(200, rows);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
