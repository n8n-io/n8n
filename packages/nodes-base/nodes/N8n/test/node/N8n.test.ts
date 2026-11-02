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

		const { pinData: userPinData } = await import('./user.get.workflow.json');
		nock(baseUrl)
			.get('/users/123e4567-e89b-12d3-a456-426614174000')
			.query({ includeRole: 'false' })
			.reply(200, userPinData['Get by ID'][0].json);
		nock(baseUrl)
			.get('/users/jane.doe%40example.com')
			.query({ includeRole: 'true' })
			.reply(200, userPinData['Get by email'][0].json);
	});

	new NodeTestHarness().setupTests({ credentials });
});
