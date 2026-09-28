import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Gitlab Node - OAuth2 routing', () => {
	const baseUrl = 'https://gitlab.com/api/v4';
	const credentials = {
		gitlabOAuth2Api: {
			server: 'https://gitlab.com',
			oauthTokenData: {
				access_token: 'test-oauth-token',
			},
		},
	};

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('repository:get uses Bearer token from oauthTokenData', () => {
		beforeAll(() => {
			nock(baseUrl)
				.get('/projects/test-owner%2Ftest-repo')
				.matchHeader('authorization', 'Bearer test-oauth-token')
				.reply(200, {
					id: 1,
					name: 'test-repo',
					path_with_namespace: 'test-owner/test-repo',
					default_branch: 'main',
					visibility: 'private',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['repository.get.oauth2.workflow.json'],
		});
	});
});
