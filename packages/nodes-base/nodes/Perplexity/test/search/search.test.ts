import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

describe('Perplexity Node - Search', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/search', (body) => {
				return typeof body?.query === 'string';
			})
			.reply(200, {
				id: 'search-test123',
				results: [
					{
						title: 'AI Developments 2024',
						url: 'https://example.com/ai',
						snippet: 'Latest AI news...',
						date: '2024-12-15',
						last_updated: '2024-12-20',
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
