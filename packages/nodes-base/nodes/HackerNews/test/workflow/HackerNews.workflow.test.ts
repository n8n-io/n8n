import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('HackerNews > Workflows', () => {
	const credentials = {};

	beforeAll(() => {
		const api = nock('http://hn.algolia.com/api/v1');
		api.get('/items/8863').reply(200, { id: 8863, title: 'My YC app', children: [] });
		api.get('/users/pg').reply(200, { username: 'pg', karma: 157236 });
		api
			.get('/search')
			.query({ query: 'n8n', tags: 'story', hitsPerPage: 5 })
			.reply(200, { hits: [{ objectID: '1' }], nbHits: 1 });
		api
			.get('/search')
			.query({ query: 'n8n', tags: 'story', hitsPerPage: 100 })
			.reply(200, { hits: [{ objectID: '2' }], nbHits: 1 });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
