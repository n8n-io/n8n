import nock from 'nock';

import { testWorkflows, getWorkflowFilenames, initBinaryDataService } from '@test/nodes/Helpers';

describe('Perplexity Node - Chat Completions', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('complete.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.perplexity.ai')
			.post('/chat/completions', {
				model: 'r1-1776',
				messages: [
					{ role: 'user', content: 'test' },
					{ role: 'assistant', content: 'test' },
					{ role: 'user', content: 'aaa' },
				],
				frequency_penalty: 1,
				max_tokens: 4,
				temperature: 1.99,
				top_k: 4,
				top_p: 1,
				presence_penalty: 2,
				return_images: false,
				return_related_questions: false,
				search_recency: 'month',
			})
			.reply(200, {
				id: '6bb24c98-3071-4691-9a7b-dc4bc18c3c2c',
				model: 'r1-1776',
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

	testWorkflows(workflows);
});
