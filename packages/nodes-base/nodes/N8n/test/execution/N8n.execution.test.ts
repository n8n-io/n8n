import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test N8n Node Execution Get/Delete', () => {
	const baseUrl = 'https://test.app.n8n.cloud/api/v1';
	const credentials = {
		n8nApi: {
			apiKey: 'key123',
			baseUrl,
		},
	};

	beforeAll(() => {
		nock(baseUrl)
			.get('/executions/1000')
			.reply(200, {
				id: '1000',
				finished: true,
				mode: 'manual',
				retryOf: null,
				retrySuccessId: null,
				status: 'success',
				createdAt: '2026-09-16T17:00:00.000Z',
				startedAt: '2026-09-16T17:00:00.000Z',
				stoppedAt: '2026-09-16T17:00:01.000Z',
				deletedAt: null,
				workflowId: '42',
				waitTill: null,
			})
			.delete('/executions/1000')
			.reply(200, {
				id: '1000',
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.n8n.execution-get.json', 'workflow.n8n.execution-delete.json'],
	});
});
