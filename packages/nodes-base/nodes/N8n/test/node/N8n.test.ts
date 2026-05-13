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

		const queryResponse = {
			columns: ['id', 'name'],
			rows: [
				{ id: 'wf-1', name: 'First workflow' },
				{ id: 'wf-2', name: 'Second workflow' },
			],
			durationMs: 1,
			truncated: false,
		};
		nock(baseUrl)
			.post('/query', { query: 'SELECT id, name FROM workflows LIMIT 2' })
			.twice()
			.reply(200, queryResponse);
	});

	new NodeTestHarness().setupTests({ credentials });
});
