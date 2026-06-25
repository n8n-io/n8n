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
			.patch('/credentials/42', {
				name: 'Updated API',
				data: { apiKey: 'new-key', baseUrl: 'https://test.app.n8n.cloud/api/v1' },
			})
			.reply(200, {
				id: '42',
				name: 'Updated API',
				type: 'n8nApi',
				createdAt: '2023-01-01T00:00:00.000Z',
				updatedAt: '2023-01-02T00:00:00.000Z',
			});
	});

	new NodeTestHarness().setupTests({ credentials });
});
