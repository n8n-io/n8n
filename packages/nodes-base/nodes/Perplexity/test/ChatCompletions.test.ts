import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Perplexity Node', () => {
	const workflows = ['nodes/Perplexity/test/ChatCompletions.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should complete chat message', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://api.perplexity.ai',
				mocks: [
					{
						method: 'post',
						path: '/chat/completions',
						statusCode: 200,
						requestBody: {
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
						},
						requestHeaders: {
							accept: 'application/json, text/plain, */*',
							'content-type': 'application/json',
							'user-agent': 'n8n',
						},
						responseBody: {
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
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
