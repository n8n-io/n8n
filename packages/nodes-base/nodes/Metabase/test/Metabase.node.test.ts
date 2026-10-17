import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { INodePropertyOptions, WorkflowTestData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import nock from 'nock';

import { Metabase } from '../Metabase.node';

describe('Metabase Node', () => {
	const testHarness = new NodeTestHarness();

	describe('Authentication parameter', () => {
		const { credentials = [], properties } = new Metabase().description;
		const authentication = properties.find((property) => property.name === 'authentication');

		const credentialTypesFor = (authenticationValue: string) =>
			credentials
				.filter((credential) =>
					credential.displayOptions?.show?.authentication?.includes(authenticationValue),
				)
				.map((credential) => credential.name);

		it('should default to username & password so existing workflows keep their credential', () => {
			expect(authentication?.default).toBe('password');
		});

		it('should map each authentication option to exactly one credential type', () => {
			const options = (authentication?.options ?? []) as INodePropertyOptions[];

			expect(options.map((option) => option.value)).toEqual(['apiKey', 'password']);
			expect(credentialTypesFor('password')).toEqual(['metabaseApi']);
			expect(credentialTypesFor('apiKey')).toEqual(['metabaseApiKeyApi']);
		});
	});

	describe('Credentials', () => {
		// Each credential type points at its own host, and each host returns its own
		// fixture. The output of a node therefore shows which credential it resolved.
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

		const sessionDatabases = [{ id: 1, name: 'Session database', engine: 'h2' }];
		const apiKeyDatabases = [{ id: 2, name: 'API key database', engine: 'postgres' }];

		let sessionScope: nock.Scope;
		let apiKeyScope: nock.Scope;

		beforeAll(() => {
			sessionScope = nock(sessionBaseUrl)
				.get('/api/database/')
				.reply(200, { data: sessionDatabases });
			apiKeyScope = nock(apiKeyBaseUrl).get('/api/database/').reply(200, { data: apiKeyDatabases });
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
					'Metabase metabaseApi': [[{ json: sessionDatabases[0] }]],
					'Metabase metabaseApiKeyApi': [[{ json: apiKeyDatabases[0] }]],
				},
			},
		};

		testHarness.setupTest(testData, {
			credentials,
			customAssertions: () => {
				// Each host must have received exactly one request
				expect(sessionScope.isDone()).toBe(true);
				expect(apiKeyScope.isDone()).toBe(true);
			},
		});
	});
});
