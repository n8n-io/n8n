import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Line', () => {
	const credentials = {
		lineNotifyOAuth2Api: {
			grantType: 'authorizationCode',
			authUrl: 'https://notify-bot.line.me/oauth/authorize',
			accessTokenUrl: 'https://notify-bot.line.me/oauth/token',
			scope: 'notify',
			authentication: 'body',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				token_type: 'Bearer',
			},
		},
	};

	beforeAll(() => {
		nock('https://notify-api.line.me')
			.post('/api/notify')
			.reply(200, { status: 200, message: 'ok' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
