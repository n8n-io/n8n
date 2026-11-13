import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Reddit', () => {
	const credentials = {
		redditOAuth2Api: {
			grantType: 'authorizationCode',
			authUrl: 'https://www.reddit.com/api/v1/authorize',
			accessTokenUrl: 'https://www.reddit.com/api/v1/access_token',
			authentication: 'header',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				refresh_token: 'REFRESHTOKEN',
				token_type: 'bearer',
				expires_in: 86400,
			},
		},
	};

	const post = { id: '1abc2d', title: 'Hello n8n', subreddit: 'n8n' };
	const listing = (...children: object[]) => ({
		data: { after: null, children: children.map((data) => ({ data })) },
	});
	const json = { api_type: 'json' };
	const page = { limit: 100, api_type: 'json' };

	beforeAll(() => {
		const oauth = nock('https://oauth.reddit.com');
		oauth
			.post('/api/del')
			.query({ id: 't3_1abc2d', ...json })
			.reply(200, {});
		oauth
			.get('/r/n8n/comments/1abc2d.json')
			.query(json)
			.reply(200, [listing(post)]);
		oauth.get('/r/n8n.json').query(page).reply(200, listing(post));
		oauth.get('/r/n8n/hot.json').query(page).reply(200, listing(post));
		oauth
			.get('/r/n8n/search.json')
			.query({ q: 'workflow', restrict_sr: true, ...page })
			.reply(200, listing(post));
		oauth
			.get('/r/n8n/comments/1abc2d.json')
			.query(page)
			.reply(200, [listing(post), listing({ id: 'c1', body: 'Nice' })]);
		oauth.get('/api/v1/me/prefs').query(json).reply(200, { lang: 'en' });
		oauth.get('/api/v1/me').query(json).reply(200, { name: 'n8n_io' });
		oauth.get('/user/n8n_io/saved.json').query(page).reply(200, listing(post));

		const www = nock('https://www.reddit.com');
		www
			.get('/r/n8n/about/about.json')
			.query(json)
			.reply(200, { data: { display_name: 'n8n' } });
		www
			.get('/r/subreddits.json')
			.query(page)
			.reply(200, listing({ display_name: 'n8n' }));
		www
			.get('/user/n8n_io/about.json')
			.query(json)
			.reply(200, { data: { name: 'n8n_io' } });
		www
			.get('/user/n8n_io/comments.json')
			.query(page)
			.reply(200, listing({ id: 'c2', body: 'Thanks' }));
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
