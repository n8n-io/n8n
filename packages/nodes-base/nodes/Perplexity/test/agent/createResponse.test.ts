import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

describe('Perplexity Node - Agent Create Response', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/v1/agent', (body) => {
				return typeof body?.input === 'string';
			})
			.reply(200, {
				id: 'resp_test123',
				model: 'openai/gpt-5.2',
				object: 'response',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: '2+2 equals 4.' }],
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
