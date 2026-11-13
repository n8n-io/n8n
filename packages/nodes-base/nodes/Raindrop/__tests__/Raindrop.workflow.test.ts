import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Raindrop', () => {
	const credentials = {
		raindropOAuth2Api: {
			grantType: 'authorizationCode',
			authUrl: 'https://raindrop.io/oauth/authorize',
			accessTokenUrl: 'https://raindrop.io/oauth/access_token',
			authentication: 'body',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				refresh_token: 'REFRESHTOKEN',
				token_type: 'Bearer',
				expires_in: 86400,
			},
		},
	};

	const bookmark = { _id: 123456, title: 'n8n docs', link: 'https://docs.n8n.io' };
	const collection = { _id: 45678, title: 'Reading list' };

	beforeAll(() => {
		const api = nock('https://api.raindrop.io/rest/v1');
		api
			.post('/raindrop', { link: 'https://docs.n8n.io', collection: { $id: '45678' } })
			.reply(200, { item: bookmark });
		api.delete('/raindrop/123456').reply(200, { result: true });
		api.get('/raindrop/123456').reply(200, { item: bookmark });
		api.get('/raindrops/45678').reply(200, { items: [bookmark] });
		api.put('/raindrop/123456', { title: 'n8n docs' }).reply(200, { item: bookmark });
		api.post('/collection', { title: 'Reading list' }).reply(200, { item: collection });
		api.delete('/collection/45678').reply(200, { result: true });
		api.get('/collection/45678').reply(200, { item: collection });
		api.get('/collections').reply(200, { items: [collection] });
		api.get('/collections/childrens').reply(200, { items: [collection] });
		api.put('/collection/45678', { title: 'Reading list' }).reply(200, { item: collection });
		api.get('/user').reply(200, { user: { _id: 1001, fullName: 'Nathan' } });
		api.get('/user/1002').reply(200, { user: { _id: 1002, fullName: 'Jan' } });
		api.delete('/tags/45678', { tags: ['news'] }).reply(200, { result: true });
		api.get('/tags/45678').reply(200, { items: [{ _id: 'news', count: 3 }] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
