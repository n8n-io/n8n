import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test N8n Node', () => {
	const baseUrl = 'https://test.app.n8n.cloud/api/v1';
	const credentials = {
		n8nApi: {
			apiKey: 'key123',
			baseUrl,
		},
	};

	beforeAll(async () => {
		const { pinData } = await import('./workflow.n8n.workflows.json');
		const apiResponse = pinData.n8n.map((item) => item.json);
		nock(baseUrl).get('/workflows?tags=n8n-test').reply(200, { data: apiResponse });
		nock(baseUrl)
			.post('/projects/proj-123/users', {
				relations: [{ userId: 'user-456', role: 'project:editor' }],
			})
			.reply(201);
		nock(baseUrl)
			.post('/projects/proj-v2/users', {
				relations: [{ userId: 'user-v2', role: 'project:editor' }],
			})
			.reply(201);
		nock(baseUrl)
			.get('/executions')
			.query({ status: 'error' })
			.reply(200, { data: [{ id: '1', status: 'error' }], nextCursor: 'page-2' });
		nock(baseUrl)
			.get('/executions')
			.query({ status: 'error', cursor: 'page-2' })
			.reply(200, { data: [{ id: '2', status: 'error' }], nextCursor: null });
	});

	new NodeTestHarness().setupTests({ credentials });
});
