import type { HttpRequestClient } from '@n8n/backend-network';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mock } from 'vitest-mock-extended';

// Use the same request client class as the CommonJS workflow test harness.
const { OutboundHttp } = createRequire(import.meta.url)(
	'@n8n/backend-network',
) as typeof import('@n8n/backend-network');

const { userFolder, previousUserFolder } = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const previousUserFolder = process.env.N8N_USER_FOLDER;
	const userFolder = mkdtempSync(join(tmpdir(), 'n8n-get-workflow-'));
	process.env.N8N_USER_FOLDER = userFolder;
	return { userFolder, previousUserFolder };
});

describe('n8n Get Workflow on localhost', () => {
	const harness = new NodeTestHarness();
	const workflow = {
		id: 'workflow1',
		name: 'Example workflow',
		active: false,
		nodes: [],
		connections: {},
		settings: {},
	};
	const requestClient = mock<HttpRequestClient>();

	beforeEach(() => {
		requestClient.request.mockReset();
		requestClient.request.mockResolvedValue({ statusCode: 200, headers: {}, body: workflow });
		vi.spyOn(OutboundHttp.prototype, 'requests').mockReturnValue(requestClient);
	});

	afterAll(() => {
		if (previousUserFolder === undefined) {
			delete process.env.N8N_USER_FOLDER;
		} else {
			process.env.N8N_USER_FOLDER = previousUserFolder;
		}
		rmSync(userFolder, { recursive: true, force: true });
	});

	// NODE-5628: The reported credential URL has a repeated slash before api/v1.
	for (const { baseUrl, description } of [
		{
			baseUrl: 'http://localhost:5678/api/v1',
			description: 'should get a workflow with the localhost API URL',
		},
		{
			baseUrl: 'http://localhost:5678//api/v1',
			description: 'should use the API path when the localhost URL has a repeated slash',
		},
	]) {
		const testData: WorkflowTestData = {
			description,
			input: {
				workflowData: {
					nodes: [
						{
							id: 'n8n-node',
							name: 'n8n',
							type: 'n8n-nodes-base.n8n',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								resource: 'workflow',
								operation: 'get',
								workflowId: { __rl: true, mode: 'id', value: workflow.id },
							},
							credentials: { n8nApi: { id: 'n8n-credentials', name: 'n8n account' } },
						},
					],
					connections: {},
				},
			},
			credentials: { n8nApi: { apiKey: 'test-api-key', baseUrl } },
			output: { nodeData: { n8n: [[{ json: workflow }]] } },
		};

		harness.setupTest(testData, {
			customAssertions: () => {
				expect(requestClient.request).toHaveBeenCalledTimes(1);
				expect(requestClient.request).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'GET',
						baseURL: 'http://localhost:5678/api/v1',
						url: '/workflows/workflow1',
					}),
				);
			},
		});
	}
});
