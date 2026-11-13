import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const repo = '/repos/acme-corp/billing-service';

describe('Github > Workflows', () => {
	const credentials = {
		githubApi: {
			accessToken: 'fake-access-token',
			server: 'https://api.github.com',
			user: 'nathan',
		},
		githubOAuth2Api: {
			server: 'https://github.example.com/api/v3',
			oauthTokenData: { access_token: 'fake-oauth-token' },
		},
	};

	beforeAll(() => {
		const github = nock('https://api.github.com');
		github.get(`${repo}/contents/docs/README.md`).reply(200, { sha: 'abc123' });
		github.get(`${repo}/contents/docs/OLD.md`).reply(200, { sha: 'ghi789' });
		github
			.put(`${repo}/contents/docs%2FREADME.md`)
			.twice()
			.reply(200, { content: { sha: 'abc123' } });
		github.delete(`${repo}/contents/docs%2FOLD.md`).reply(200, { commit: { sha: 'ghi789' } });
		github
			.get(`${repo}/contents/docs%2FREADME.md`)
			.query({ ref: 'main' })
			.reply(200, { name: 'README.md', path: 'docs/README.md' });
		github.get(`${repo}/contents/docs`).reply(200, [{ name: 'README.md' }]);
		github.get(`${repo}/contents/`).reply(200, [{ name: 'docs' }]);
		github.post(`${repo}/issues`).reply(200, { number: 42 });
		github.post(`${repo}/issues/42/comments`).reply(200, { id: 1001 });
		github.patch(`${repo}/issues/42`).reply(200, { number: 42, title: 'Printer fixed' });
		github.get(`${repo}/issues/42`).reply(200, { number: 42 });
		github.put(`${repo}/issues/42/lock`).query({ lock_reason: 'resolved' }).reply(200, {});
		github.post(`${repo}/pulls`).reply(200, { number: 7 });
		github.patch(`${repo}/pulls/7`).times(3).reply(200, { number: 7 });
		github
			.get(`${repo}/pulls/7`)
			.matchHeader('accept', 'application/vnd.github.v3.diff')
			.reply(200, 'diff --git a/x b/x');
		github.get(`${repo}/pulls/7`).reply(200, { number: 7 });
		github.post(`${repo}/issues/7/comments`).reply(200, { id: 2001 });
		github.patch(`${repo}/issues/comments/2001`).reply(200, { id: 2001 });
		github.put(`${repo}/pulls/7/merge`).reply(200, { merged: true });
		github.post(`${repo}/releases`).reply(200, { id: 501 });
		github.delete(`${repo}/releases/501`).reply(200, {});
		github.get(`${repo}/releases/501`).reply(200, { id: 501 });
		github
			.get(`${repo}/releases`)
			.query({ per_page: '5' })
			.reply(200, [{ id: 501 }]);
		github.patch(`${repo}/releases/501`).reply(200, { id: 501 });
		github.get(`${repo}/traffic/popular/paths`).reply(200, [{ path: '/' }]);
		github.get(`${repo}/traffic/popular/referrers`).reply(200, [{ referrer: 'example.com' }]);
		github.get(repo).reply(200, { id: 301 });
		github.get(`${repo}/license`).reply(200, { name: 'MIT' });
		github
			.get(`${repo}/issues`)
			.query({ per_page: '5' })
			.reply(200, [{ number: 42 }]);
		github
			.get(`${repo}/pulls`)
			.query({ per_page: '5' })
			.reply(200, [{ number: 7 }]);
		github.get(`${repo}/pulls/7/reviews/801`).reply(200, { id: 801 });
		github
			.get(`${repo}/pulls/7/reviews`)
			.query({ per_page: '5' })
			.reply(200, [{ id: 801 }]);
		github.post(`${repo}/pulls/7/reviews`).reply(200, { id: 802 });
		github.put(`${repo}/pulls/7/reviews/802`).reply(200, { id: 802 });
		github
			.get('/users/acme-corp/repos')
			.query({ per_page: '5' })
			.reply(200, [{ id: 301 }]);
		github
			.get('/issues')
			.query({ per_page: '5' })
			.reply(200, [{ number: 42 }]);
		github.post('/orgs/acme-corp/invitations').reply(200, { id: 901 });
		github
			.get('/orgs/acme-corp/repos')
			.query({ per_page: '5' })
			.reply(200, [{ id: 301 }]);
		github
			.get('/orgs/acme-corp/members')
			.query({ per_page: '5' })
			.reply(200, [{ login: 'nathan' }]);
		github.put(`${repo}/actions/workflows/ci.yml/disable`).reply(200, {});
		github.post(`${repo}/actions/workflows/ci.yml/dispatches`).reply(200, {});
		github.put(`${repo}/actions/workflows/ci.yml/enable`).reply(200, {});
		github.get(`${repo}/actions/workflows/ci.yml`).reply(200, { id: 161335 });
		github.get(`${repo}/actions/workflows/ci.yml/timing`).reply(200, { billable: {} });
		github.get(`${repo}/actions/workflows`).reply(200, { total_count: 1 });

		nock('https://github.example.com/api/v3').get(repo).reply(200, { id: 302 });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
