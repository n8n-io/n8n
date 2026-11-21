import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const organization = { id: '2', slug: 'acme-corp', name: 'Acme Corp' };
const project = { id: '4', slug: 'web-app', name: 'Web App', organization };
const team = { id: '3', slug: 'platform', name: 'Platform' };
const release = { version: 'web-app@1.4.0' };
const issue = { id: '1170820242', title: 'TypeError: Cannot read property' };
const event = { eventID: '9fac2ceed9344f2bbfdd1fdacb0ed9b1' };

const teamsUrl = 'https://sentry.io/api/0/organizations/acme-corp/teams/';

describe('SentryIo > Workflows', () => {
	const credentials = {
		sentryIoApi: { token: 'fake-token' },
		sentryIoServerApi: { token: 'fake-server-token', url: 'https://sentry.example.com' },
		sentryIoOAuth2Api: { oauthTokenData: { access_token: 'fake-access-token' } },
	};

	beforeAll(() => {
		const cloud = nock('https://sentry.io/api/0').matchHeader('authorization', 'Bearer fake-token');
		cloud.get('/projects/acme-corp/web-app/events/').query(true).reply(200, [event]);
		cloud
			.get('/projects/acme-corp/web-app/events/9fac2ceed9344f2bbfdd1fdacb0ed9b1/')
			.reply(200, event);
		cloud.get('/projects/acme-corp/web-app/issues/').query(true).reply(200, [issue]);
		cloud.get('/issues/1170820242/').reply(200, issue);
		cloud.put('/issues/1170820242/', { status: 'resolved' }).reply(200, issue);
		cloud.delete('/issues/1170820242/').reply(202);
		cloud.get('/organizations/acme-corp/').reply(200, organization);
		cloud.get('/organizations/').reply(200, [organization]);
		cloud.post('/organizations/', { name: 'Acme Corp', agreeTerms: true }).reply(201, organization);
		cloud.put('/organizations/acme-corp/', { name: 'Acme Corporation' }).reply(200, organization);
		cloud.post('/teams/acme-corp/platform/projects/', { name: 'Web App' }).reply(201, project);
		cloud.get('/projects/acme-corp/web-app/').reply(200, project);
		cloud.get('/projects/').reply(200, [project]);
		cloud.put('/projects/acme-corp/web-app/', { platform: 'javascript' }).reply(200, project);
		cloud.delete('/projects/acme-corp/web-app/').reply(204);
		cloud.get('/organizations/acme-corp/releases/web-app@1.4.0/').reply(200, release);
		cloud.get('/organizations/acme-corp/releases/').reply(200, [release]);
		cloud
			.post('/organizations/acme-corp/releases/', {
				version: 'web-app@1.4.0',
				url: 'https://github.com/acme/web-app',
				projects: ['web-app'],
			})
			.reply(201, release);
		cloud
			.put('/organizations/acme-corp/releases/web-app@1.4.0/', { ref: 'main' })
			.reply(200, release);
		cloud.delete('/organizations/acme-corp/releases/web-app@1.4.0/').reply(204);
		cloud.get('/teams/acme-corp/platform/').reply(200, team);
		cloud.get('/organizations/acme-corp/teams/').reply(200, [team], {
			link: `<${teamsUrl}?cursor=1:0:1>; rel="previous"; results="false"; cursor="1:0:1", <${teamsUrl}?cursor=1:100:0>; rel="next"; results="true"; cursor="1:100:0"`,
		});
		cloud
			.get('/organizations/acme-corp/teams/')
			.query({ cursor: '1:100:0' })
			.reply(200, [team], {
				link: `<${teamsUrl}?cursor=1:0:1>; rel="previous"; results="true"; cursor="1:0:1", <${teamsUrl}?cursor=1:200:0>; rel="next"; results="false"; cursor="1:200:0"`,
			});
		cloud.post('/organizations/acme-corp/teams/', { name: 'Platform' }).reply(201, team);
		cloud.put('/teams/acme-corp/platform/', { name: 'Platform Team' }).reply(200, team);
		cloud.delete('/teams/acme-corp/platform/').reply(204);

		nock('https://sentry.example.com/api/0')
			.matchHeader('authorization', 'Bearer fake-server-token')
			.get('/projects/acme-corp/web-app/')
			.reply(200, project);

		nock('https://sentry.io/api/0')
			.matchHeader('authorization', 'Bearer fake-access-token')
			.get('/teams/acme-corp/platform/')
			.reply(200, team);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
