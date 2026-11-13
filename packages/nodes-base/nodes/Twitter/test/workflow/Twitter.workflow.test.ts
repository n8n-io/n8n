import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const tweetId = '1666357334740811776';
const userId = '1285192200213626880';
const listId = '1663852298521419776';

describe('X (Formerly Twitter) > Workflows', () => {
	describe('V1', () => {
		const credentials = {
			twitterOAuth1Api: {
				consumerKey: 'fake-consumer-key',
				consumerSecret: 'fake-consumer-secret',
				oauthTokenData: {
					oauth_token: 'fake-oauth-token',
					oauth_token_secret: 'fake-oauth-token-secret',
				},
			},
		};
		const tweet = { id_str: tweetId, text: 'Hello' };
		let mock: nock.Scope;

		beforeAll(() => {
			mock = nock('https://api.twitter.com/1.1');
			mock
				.post('/direct_messages/events/new.json', {
					event: {
						type: 'message_create',
						message_create: {
							target: { recipient_id: userId },
							message_data: { text: 'Hello' },
						},
					},
				})
				.reply(200, { event: { id: '1700000000000000000', type: 'message_create' } });
			mock.post('/statuses/update.json').query({ status: 'Hello' }).reply(200, tweet);
			mock.post(`/statuses/destroy/${tweetId}.json`).reply(200, tweet);
			mock
				.get('/search/tweets.json')
				.query({ q: 'n8n', tweet_mode: 'compat', count: 2 })
				.reply(200, { statuses: [tweet] });
			mock.post('/favorites/create.json').query({ id: tweetId }).reply(200, tweet);
			mock.post(`/statuses/retweet/${tweetId}.json`).query({ id: tweetId }).reply(200, tweet);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.v1.workflow.json'],
			customAssertions: () => expect(mock.isDone()).toBe(true),
		});
	});

	describe('V2', () => {
		const credentials = {
			twitterOAuth2Api: {
				scope: '',
				oauthTokenData: { access_token: 'fake-access-token' },
			},
		};
		const user = { id: userId, name: 'n8n', username: 'n8n_io' };
		let mock: nock.Scope;

		beforeAll(() => {
			mock = nock('https://api.x.com/2');
			mock.get('/users/me').times(3).reply(200, { data: user });
			mock.get('/users/by/username/n8n_io').times(3).reply(200, { data: user });
			mock.get(`/users/${userId}`).reply(200, { data: user });
			mock.post('/tweets', { text: 'Hello' }).reply(200, { data: { id: tweetId, text: 'Hello' } });
			mock.delete(`/tweets/${tweetId}`).reply(200, { data: { deleted: true } });
			mock
				.post(`/users/${userId}/likes`, { tweet_id: tweetId })
				.reply(200, { data: { liked: true } });
			mock
				.post(`/users/${userId}/retweets`, { tweet_id: tweetId })
				.reply(200, { data: { retweeted: true } });
			mock
				.post(`/lists/${listId}/members`, { user_id: userId })
				.reply(200, { data: { is_member: true } });
			mock
				.post(`/dm_conversations/with/${userId}/messages`, { text: 'Hello' })
				.reply(200, { data: { dm_conversation_id: '1-2', dm_event_id: '3' } });
			mock.get(`/list/by/name/${userId}`).reply(200, { data: { id: listId } });
			mock
				.post(`/dm_conversations/with/${listId}/messages`, { text: 'Hello' })
				.reply(200, { data: { dm_conversation_id: '1-2', dm_event_id: '4' } });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.v2.workflow.json'],
			customAssertions: () => expect(mock.isDone()).toBe(true),
		});
	});
});
