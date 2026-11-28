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
		nock(baseUrl)
			.get('/workflows?tags=n8n-test')
			.matchHeader('x-n8n-client', 'n8n-node')
			.reply(200, { data: apiResponse });
		nock(baseUrl)
			.post('/projects/proj-123/users', {
				relations: [{ userId: 'user-456', role: 'project:editor' }],
			})
			.matchHeader('x-n8n-client', 'n8n-node')
			.reply(201);

		nock(baseUrl)
			.post('/workflows', {
				name: 'From JSON',
				nodes: [],
				settings: {},
				connections: {},
				staticData: null,
			})
			.reply(200, { id: 'wf-1' });
		nock(baseUrl)
			.put('/workflows/2002', {
				name: 'From expression',
				nodes: [],
				settings: {},
				connections: {},
			})
			.reply(200, { id: '2002' });
		nock(baseUrl)
			.post('/credentials', {
				name: 'Acme API',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'Bearer abc' },
			})
			.reply(200, { id: 'cred-1' });

		const { pinData: userPinData } = await import('./user.get.workflow.json');
		nock(baseUrl)
			.get('/users/123e4567-e89b-12d3-a456-426614174000')
			.query({ includeRole: 'false' })
			.matchHeader('x-n8n-client', 'n8n-node')
			.reply(200, userPinData['Get by ID'][0].json);
		nock(baseUrl)
			.get('/users/jane.doe%40example.com')
			.query({ includeRole: 'true' })
			.matchHeader('x-n8n-client', 'n8n-node')
			.reply(200, userPinData['Get by email'][0].json);
	});

	new NodeTestHarness().setupTests({ credentials });
});
