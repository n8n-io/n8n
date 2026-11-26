import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.perplexity.ai',
	},
};

const chatResponse = {
	id: 'chat_test123',
	model: 'sonar',
	object: 'chat.completion',
	choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Done.' } }],
};

describe('Perplexity Node - Chat Completions', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/chat/completions', {
				model: 'sonar',
				messages: [{ content: 'Chat JSON String', role: 'user' }],
				response_format: { type: 'json_schema' },
				web_search_options: { search_context_size: 'high' },
			})
			.reply(200, chatResponse)
			.post('/chat/completions', {
				model: 'sonar',
				messages: [{ content: 'Chat JSON Expression', role: 'user' }],
				response_format: { type: 'json_schema' },
				web_search_options: { search_context_size: 'low' },
			})
			.reply(200, chatResponse);
		nock('https://api.perplexity.ai')
			.post('/chat/completions', (body) => {
				return (
					body?.model?.value === 'sonar' &&
					body?.model?.mode === 'id' &&
					Array.isArray(body?.messages) &&
					body.messages.length === 3 &&
					body.messages[0].role === 'user' &&
					body.messages[1].role === 'assistant' &&
					body.messages[2].role === 'user'
				);
			})
			.reply(200, {
				id: '6bb24c98-3071-4691-9a7b-dc4bc18c3c2c',
				model: 'sonar',
				created: 1743161086,
				object: 'chat.completion',
				usage: {
					prompt_tokens: 4,
					completion_tokens: 4,
					total_tokens: 8,
				},
				choices: [
					{
						index: 0,
						finish_reason: 'length',
						message: {
							role: 'assistant',
							content: '<think>\nOkay,',
						},
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
