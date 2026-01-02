import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

describe('Perplexity Node - Async API', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.get('/async/chat/completions')
			.query((queryObject) => {
				return queryObject.limit === '10' || !queryObject.limit;
			})
			.reply(200, {
				requests: [
					{
						id: 'req-1',
						model: 'sonar',
						status: 'COMPLETED',
						created_at: 1640995200,
					},
				],
				next_token: 'next-page-token',
			});
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	new NodeTestHarness().setupTests({ credentials });
});
