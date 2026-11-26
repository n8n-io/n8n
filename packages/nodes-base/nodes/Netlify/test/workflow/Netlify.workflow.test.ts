import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Netlify > Workflows', () => {
	const credentials = {
		netlifyApi: {
			accessToken: 'fake-access-token',
		},
	};

	const siteId = '3970e0fe-8564-4903-9a55-c5f8de49fb8b';

	beforeAll(() => {
		const api = nock('https://api.netlify.com/api/v1');

		api
			.post('/deploys/5f1e2d3c4b5a69788f9e0d1c/cancel')
			.reply(200, { id: '5f1e2d3c4b5a69788f9e0d1c', state: 'error' });
		api
			.post(`/sites/${siteId}/deploys`, { branch: 'main' })
			.query({ title: 'Release 1.2' })
			.reply(200, { id: '6a2b3c4d5e6f708192a3b4c5', state: 'new' });
		api
			.get(`/sites/${siteId}/deploys/6a2b3c4d5e6f708192a3b4c5`)
			.reply(200, { id: '6a2b3c4d5e6f708192a3b4c5', state: 'ready' });
		api
			.get(`/sites/${siteId}/deploys`)
			.query({ page: 0, per_page: 100 })
			.reply(200, [{ id: '6a2b3c4d5e6f708192a3b4c5' }], {
				link: `<https://api.netlify.com/api/v1/sites/${siteId}/deploys?page=1>; rel="next"`,
			});
		api
			.get(`/sites/${siteId}/deploys`)
			.query({ page: 1, per_page: 100 })
			.reply(200, [{ id: '5f1e2d3c4b5a69788f9e0d1c' }], {
				link: `<https://api.netlify.com/api/v1/sites/${siteId}/deploys?page=0>; rel="prev"`,
			});
		api
			.get(`/sites/${siteId}/deploys`)
			.query({ per_page: 1 })
			.reply(200, [{ id: '6a2b3c4d5e6f708192a3b4c5' }]);
		api.delete('/sites/8e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b').reply(200, {});
		api.get(`/sites/${siteId}`).reply(200, { id: siteId, name: 'docs' });
		api
			.get('/sites')
			.query({ filter: 'all', per_page: 5 })
			.reply(200, [{ id: siteId, name: 'docs' }]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
