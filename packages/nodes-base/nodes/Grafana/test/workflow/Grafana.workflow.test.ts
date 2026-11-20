import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Grafana > Workflows', () => {
	const credentials = {
		grafanaApi: {
			apiKey: 'fake-api-key',
			baseUrl: 'https://grafana.example.com/',
		},
	};

	beforeAll(() => {
		const api = nock('https://grafana.example.com/api');

		api
			.post('/dashboards/db', { dashboard: { id: null, title: 'Ops' } })
			.reply(200, { uid: 'cIBgcSjkk', status: 'success' });
		api.delete('/dashboards/uid/cIBgcSjkk').reply(200, { title: 'Ops' });
		api
			.get('/dashboards/uid/cIBgcSjkk')
			.reply(200, { dashboard: { uid: 'cIBgcSjkk', title: 'Ops' } });
		api
			.get('/search')
			.query({ type: 'dash-db' })
			.reply(200, [{ id: 1, title: 'Ops' }]);
		api
			.get('/dashboards/uid/aB3dE5fGh')
			.reply(200, { dashboard: { uid: 'aB3dE5fGh', title: 'Billing' } });
		api.get('/search').reply(200, [{ id: 2, title: 'Billing' }]);
		api
			.post('/dashboards/db', {
				overwrite: true,
				dashboard: { uid: 'aB3dE5fGh', title: 'Billing v2' },
			})
			.reply(200, { status: 'success' });

		api.post('/teams', { name: 'SRE' }).reply(200, { teamId: 5 });
		api.delete('/teams/7').reply(200, { message: 'Team deleted' });
		api.get('/teams/5').reply(200, { id: 5, name: 'SRE' });
		api.get('/teams/search').reply(200, { teams: [{ id: 5, name: 'SRE' }] });
		api.get('/teams/6').times(2).reply(200, { id: 6, name: 'Infra', email: 'infra@example.com' });
		api
			.put('/teams/6', { email: 'infra@example.com', name: 'Platform' })
			.reply(200, { message: 'Team updated' });

		api.post('/teams/5/members', { userId: 12 }).reply(200, { message: 'Member added to Team' });
		api.delete('/teams/5/members/12').reply(200, { message: 'Team Member removed' });
		api.get('/teams/8').reply(200, { id: 8, name: 'Data' });
		api.get('/teams/8/members').reply(200, [{ userId: 12 }]);

		api.delete('/org/users/13').reply(200, { message: 'User removed from organization' });
		api.get('/org/users').reply(200, [{ userId: 12, email: 'ada@example.com' }]);
		api
			.patch('/org/users/12', { role: 'Editor' })
			.reply(200, { message: 'Organization user updated' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
