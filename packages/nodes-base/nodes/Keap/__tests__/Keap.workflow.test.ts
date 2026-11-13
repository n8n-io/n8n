import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Keap', () => {
	const credentials = {
		keapOAuth2Api: {
			grantType: 'authorizationCode',
			authUrl: 'https://signin.infusionsoft.com/app/oauth/authorize',
			accessTokenUrl: 'https://api.infusionsoft.com/token',
			scope: 'full',
			authentication: 'body',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				refresh_token: 'REFRESHTOKEN',
				token_type: 'bearer',
				expires_in: 86400,
			},
		},
	};

	const tag = { tag: { id: 91, name: 'Customer' } };

	beforeAll(() => {
		const api = nock('https://api.infusionsoft.com/crm/rest/v1');
		api.get('/contacts/1234').reply(200, { id: 1234, given_name: 'Nathan' });
		api.delete('/contacts/1234').reply(204);
		api.get('/notes/5678').reply(200, { id: 5678, title: 'Call notes' });
		api.patch('/notes/5678', { title: 'Call notes' }).reply(200, { id: 5678, title: 'Call notes' });
		api.delete('/notes/5678').reply(204);
		api.post('/contacts/1234/tags', { tagIds: [91] }).reply(200, { 91: 'SUCCESS' });
		api.delete('/contacts/1234/tags').query({ ids: '91' }).reply(204);
		api
			.get('/contacts/1234/tags')
			.query({ limit: 5 })
			.reply(200, { tags: [tag], count: 1 });
		api
			.get('/contacts/1234/tags')
			.query({ limit: 50 })
			.reply(200, {
				tags: [tag],
				count: 2,
				next: 'https://api.infusionsoft.com/crm/rest/v1/contacts/1234/tags?limit=50&offset=1',
			});
		api
			.get('/contacts/1234/tags')
			.query({ limit: ['50', '50'], offset: '1' })
			.reply(200, { tags: [{ tag: { id: 92, name: 'Lead' } }], count: 2 });
		api.get('/orders/4321').reply(200, { id: 4321, title: 'Order' });
		api.delete('/orders/4321').reply(204);
		api.get('/products/8765').reply(200, { id: 8765, product_name: 'Widget' });
		api.delete('/products/8765').reply(204);
		api.delete('/files/1357').reply(204);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
