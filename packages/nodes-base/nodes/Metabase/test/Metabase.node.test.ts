import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import nock from 'nock';

describe('Metabase Node', () => {
	const testHarness = new NodeTestHarness();

	// Each credential type points at its own host, so the host that receives the
	// request tells us which credential the node resolved.
	const sessionBaseUrl = 'https://metabase-session.example.com';
	const apiKeyBaseUrl = 'https://metabase-api-key.example.com';

	const credentials = {
		metabaseApi: {
			url: sessionBaseUrl,
			username: 'user@example.com',
			password: 'password',
			sessionToken: 'session-token',
		},
		metabaseApiKeyApi: {
			// Trailing slash on purpose: the node must strip it before it builds the request URL
			url: `${apiKeyBaseUrl}/`,
			apiKey: 'mb_test_api_key',
		},
	};

	const databases = [{ id: 1, name: 'Sample Database', engine: 'h2' }];

	describe('Credentials', () => {
		beforeAll(() => {
			nock(sessionBaseUrl).get('/api/database/').reply(200, { data: databases });
			nock(apiKeyBaseUrl).get('/api/database/').reply(200, { data: databases });
		});

		const testData: WorkflowTestData = {
			description: 'should use the credential that matches the selected authentication',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: 'a1b2c3d4-0000-4000-8000-000000000001',
							name: 'When clicking ‘Execute workflow’',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							// No `authentication` parameter: existing workflows keep using username & password
							parameters: {
								resource: 'databases',
								operation: 'getAll',
								simple: false,
							},
							id: 'a1b2c3d4-0000-4000-8000-000000000002',
							name: 'Metabase metabaseApi',
							type: 'n8n-nodes-base.metabase',
							position: [200, 0],
							typeVersion: 1,
							credentials: {
								metabaseApi: {
									id: '1',
									name: 'Metabase account',
								},
							},
						},
						{
							parameters: {
								authentication: 'apiKey',
								resource: 'databases',
								operation: 'getAll',
								simple: false,
							},
							id: 'a1b2c3d4-0000-4000-8000-000000000003',
							name: 'Metabase metabaseApiKeyApi',
							type: 'n8n-nodes-base.metabase',
							position: [400, 0],
							typeVersion: 1,
							credentials: {
								metabaseApiKeyApi: {
									id: '2',
									name: 'Metabase API key account',
								},
							},
						},
					],
					connections: {
						'When clicking ‘Execute workflow’': {
							main: [
								[
									{
										node: 'Metabase metabaseApi',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
						'Metabase metabaseApi': {
							main: [
								[
									{
										node: 'Metabase metabaseApiKeyApi',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeData: {
					'Metabase metabaseApi': [[{ json: databases[0] }]],
					'Metabase metabaseApiKeyApi': [[{ json: databases[0] }]],
				},
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
