import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Iterable', () => {
	const credentials = {
		iterableApi: { apiKey: 'fake-api-key', region: 'https://api.eu.iterable.com' },
	};

	const ok = { code: 'Success', msg: '', params: null };
	const user = { email: 'nathan@n8n.io', userId: 'usr-1001', dataFields: { firstName: 'Nathan' } };

	beforeAll(() => {
		const api = nock('https://api.eu.iterable.com/api');
		api
			.post('/events/trackBulk', {
				events: [{ eventName: 'purchase', email: 'nathan@n8n.io' }],
			})
			.reply(200, ok);
		api.post('/users/update', { email: 'nathan@n8n.io' }).reply(200, ok);
		api.delete('/users/nathan@n8n.io').reply(200, ok);
		api.delete('/users/byUserId/usr-1001').reply(200, ok);
		api.get('/users/getByEmail').query({ email: 'nathan@n8n.io' }).reply(200, { user });
		api.get('/users/byUserId/usr-1001').reply(200, { user });
		api
			.post('/lists/subscribe', { listId: 1234, subscribers: [{ email: 'nathan@n8n.io' }] })
			.reply(200, { successCount: 1, failCount: 0 });
		api
			.post('/lists/unsubscribe', { listId: 1234, subscribers: [{ email: 'nathan@n8n.io' }] })
			.reply(200, { successCount: 1, failCount: 0 });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
