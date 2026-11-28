import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

const agentResponse = {
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
};

describe('Perplexity Node - Agent Create Response', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/v1/agent', {
				model: 'openai/gpt-5.2',
				input: 'Agent JSON String',
				preset: '',
				reasoning: { effort: 'high' },
				response_format: { type: 'json_schema' },
				tools: [{ type: 'web_search' }],
			})
			.reply(200, agentResponse)
			.post('/v1/agent', {
				model: 'openai/gpt-5.2',
				input: 'Agent JSON Expression',
				preset: '',
				reasoning: { effort: 'low' },
				response_format: { type: 'json_schema' },
				tools: [{ type: 'fetch_url' }],
			})
			.reply(200, agentResponse);
		nock('https://api.perplexity.ai')
			.post('/v1/agent', (body) => {
				return body?.input === 'What is 2+2?';
			})
			.reply(200, agentResponse);
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	new NodeTestHarness().setupTests({ credentials });
});
