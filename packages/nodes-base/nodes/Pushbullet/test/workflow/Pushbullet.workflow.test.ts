import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Pushbullet > Workflows', () => {
	const credentials = {
		pushbulletOAuth2Api: {
			oauthTokenData: { access_token: 'fake-access-token' },
		},
	};
	const push = { iden: 'ujpah72o0sjAoRtnM0jc', type: 'note', title: 'Reminder', body: 'Hello' };

	beforeAll(() => {
		const api = nock('https://api.pushbullet.com/v2').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		api.post('/pushes', { type: 'note', body: 'Hello', title: 'Reminder' }).reply(200, push);
		api
			.get('/pushes')
			.query({ limit: 1 })
			.reply(200, { pushes: [push] });
		api.delete('/pushes/ujpah72o0sjAoRtnM0jc').reply(200, {});
		api
			.post('/pushes/ujpah72o0sjAoRtnM0jc', { dismissed: true })
			.reply(200, { ...push, dismissed: true });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
