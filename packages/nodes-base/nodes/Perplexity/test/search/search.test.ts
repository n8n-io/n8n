import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

describe('Perplexity Node - Search API', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/search', (body) => {
				// Query can be string or array - our implementation sends string for single query
				const queryMatches =
					body?.query === 'test query' ||
					(Array.isArray(body?.query) &&
						body?.query.length === 1 &&
						body?.query[0] === 'test query');
				return queryMatches && body?.max_results === 5;
			})
			.reply(200, {
				results: [
					{
						title: 'Test Result',
						url: 'https://example.com',
						snippet: 'Test snippet',
						date: '2024-01-01',
						last_updated: '2024-01-02',
					},
				],
			});
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	new NodeTestHarness().setupTests({ credentials });
});
// Update to force refresh
