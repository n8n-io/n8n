import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

describe('Perplexity Node - Create Embedding', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/v1/embeddings', (body) => {
				return Array.isArray(body?.input) && typeof body?.model === 'string';
			})
			.reply(200, {
				object: 'list',
				data: [
					{
						object: 'embedding',
						index: 0,
						embedding: 'base64encodedstring...',
					},
				],
				model: 'pplx-embed-v1-4b',
				usage: {
					prompt_tokens: 10,
					total_tokens: 10,
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	new NodeTestHarness().setupTests({ credentials });
});
