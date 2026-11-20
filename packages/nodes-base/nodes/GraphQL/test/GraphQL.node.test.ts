import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mockDeep } from 'vitest-mock-extended';
import get from 'lodash/get';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { ExpressionError, NodeApiError, NodeHelpers } from 'n8n-workflow';
import nock from 'nock';

import { GraphQL } from '../GraphQL.node';

describe('GraphQL Node', () => {
	describe('valid request', () => {
		const baseUrl = 'https://api.n8n.io/';
		nock(baseUrl)
			.matchHeader('accept', 'application/json')
			.matchHeader('content-type', 'application/json')
			.matchHeader('content-length', '263')
			.matchHeader('accept-encoding', 'gzip, compress, deflate, br')
			.post(
				'/graphql',
				'{"query":"query {\\n  nodes(pagination: { limit: 1 }) {\\n    data {\\n      id\\n      attributes {\\n        name\\n        displayName\\n        description\\n        group\\n        codex\\n        createdAt\\n      }\\n    }\\n  }\\n}","variables":{},"operationName":null}',
			)
			.reply(200, {
				data: {
					nodes: {
						data: [
							{
								id: '1',
								attributes: {
									name: 'n8n-nodes-base.activeCampaign',
									displayName: 'ActiveCampaign',
									description: 'Create and edit data in ActiveCampaign',
									group: '["transform"]',

									codex: {
										data: {
											details:
												'ActiveCampaign is a cloud software platform that allows customer experience automation, which combines email marketing, marketing automation, sales automation, and CRM categories. Use this node when you want to interact with your ActiveCampaign account.',
											resources: {
												primaryDocumentation: [
													{
														url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.activecampaign/',
													},
												],
												credentialDocumentation: [
													{
														url: 'https://docs.n8n.io/integrations/builtin/credentials/activecampaign/',
													},
												],
											},
											categories: ['Marketing'],
											nodeVersion: '1.0',
											codexVersion: '1.0',
										},
									},
									createdAt: '2019-08-30T22:54:39.934Z',
								},
							},
						],
					},
				},
			});

		new NodeTestHarness().setupTests({
			workflowFiles: ['workflow.json'],
		});
	});

	describe('invalid expression', () => {
		new NodeTestHarness().setupTests({
			workflowFiles: ['workflow.error_invalid_expression.json'],
		});
	});

	describe('multiple headers authentication', () => {
		it.each([1, 1.1])(
			'offers Multiple Headers Auth with its credential selector in version %s',
			(typeVersion) => {
				const { description } = new GraphQL();
				const authentication = description.properties.find((p) => p.name === 'authentication');
				expect(authentication?.options).toContainEqual({
					name: 'Multiple Headers Auth',
					value: 'multipleHeadersAuth',
				});

				const visibleCredentials = description.credentials?.filter((credential) =>
					NodeHelpers.displayParameter(
						{ authentication: 'multipleHeadersAuth' },
						credential,
						{ typeVersion },
						description,
					),
				);
				expect(visibleCredentials).toEqual([
					expect.objectContaining({ name: 'httpMultipleHeadersAuth', required: true }),
				]);
			},
		);

		const harness = new NodeTestHarness();
		const baseUrl = 'https://api.example.com';
		const headers = {
			'X-Service-Token': 'first-test-value',
			'X-Account-Key': 'second-test-value',
		};

		for (const typeVersion of [1, 1.1]) {
			for (const authentication of ['multipleHeadersAuth', 'predefinedCredentialType']) {
				harness.setupTest({
					description: `sends both credential headers with ${authentication} in version ${typeVersion}`,
					input: {
						workflowData: {
							nodes: [
								{
									id: 'trigger',
									name: 'Trigger',
									type: 'n8n-nodes-base.manualTrigger',
									typeVersion: 1,
									position: [0, 0],
									parameters: {},
								},
								{
									id: 'graphql',
									name: 'GraphQL',
									type: 'n8n-nodes-base.graphql',
									typeVersion,
									position: [200, 0],
									credentials: {
										httpMultipleHeadersAuth: { id: 'credential', name: 'API headers' },
									},
									parameters: {
										authentication,
										...(authentication === 'predefinedCredentialType'
											? { nodeCredentialType: 'httpMultipleHeadersAuth' }
											: {}),
										endpoint: `${baseUrl}/graphql`,
										requestFormat: 'json',
										query: '{ ok }',
										headerParametersUi: {
											parameter: [
												{ name: 'X-Request-ID', value: 'request-id' },
												{ name: 'X-Service-Token', value: 'overridden-value' },
											],
										},
									},
								},
							],
							connections: {
								Trigger: { main: [[{ node: 'GraphQL', type: 'main', index: 0 }]] },
							},
						},
					},
					credentials: {
						httpMultipleHeadersAuth: {
							headers: {
								values: Object.entries(headers).map(([name, value]) => ({ name, value })),
							},
							allowedHttpRequestDomains: 'domains',
							allowedDomains: 'api.example.com',
						},
					},
					nock: {
						baseUrl,
						mocks: [
							{
								method: 'post',
								path: '/graphql',
								requestHeaders: { ...headers, 'X-Request-ID': 'request-id' },
								requestBody: { query: '{ ok }', variables: {}, operationName: null },
								statusCode: 200,
								responseBody: { data: { ok: true } },
							},
						],
					},
					output: { nodeData: { GraphQL: [[{ json: { data: { ok: true } } }]] } },
				});
			}
		}
	});

	describe('oauth2 refresh token', () => {
		const credentials = {
			oAuth2Api: {
				scope: '',
				accessTokenUrl: 'http://test/token',
				clientId: 'dummy_client_id',
				clientSecret: 'dummy_client_secret',
				oauthTokenData: {
					access_token: 'dummy_access_token',
					refresh_token: 'dummy_refresh_token',
				},
			},
		};
		const baseUrl = 'http://test';
		nock(baseUrl)
			.post('/graphql', '{"query":"query { foo }","variables":{},"operationName":null}')
			.reply(401, {
				errors: [
					{
						message: 'Unauthorized',
					},
				],
			});
		nock(baseUrl)
			.post('/token', {
				refresh_token: 'dummy_refresh_token',
				grant_type: 'refresh_token',
			})
			.reply(200, {
				access_token: 'dummy_access_token',
				refresh_token: 'dummy_refresh_token',
				expires_in: 3600,
			});
		nock(baseUrl)
			.post('/graphql', '{"query":"query { foo }","variables":{},"operationName":null}')
			.reply(200, {
				data: {
					foo: 'bar',
				},
			});
		new NodeTestHarness().setupTests({
			workflowFiles: ['workflow.refresh_token.json'],
			credentials,
		});
	});

	describe('error response', () => {
		const createMockExecuteFunctions = (parameters: IDataObject) => {
			const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameter, _idx, fallbackValue) => {
				return get(parameters, parameter) ?? fallbackValue;
			});
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'GraphQL',
				type: 'n8n-nodes-base.graphql',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: {},
			});
			mockExecuteFunctions.helpers.returnJsonArray.mockImplementation(returnJsonArray);
			mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation(
				constructExecutionMetaData,
			);
			return mockExecuteFunctions;
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should format error response if response.errors is an array with objects', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				query: 'query { foo }',
			});
			mockExecuteFunctions.helpers.request.mockResolvedValue({
				errors: [{ message: 'Bad format 1' }, { message: 'Bad format 2' }],
			});
			const node = new GraphQL();

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Bad format 1, Bad format 2',
			);
		});

		it('should format error response if response.errors is an array with strings', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				query: 'query { foo }',
			});
			mockExecuteFunctions.helpers.request.mockResolvedValue({
				errors: ['Bad format 1', 'Bad format 2'],
			});
			const node = new GraphQL();

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Bad format 1, Bad format 2',
			);
		});

		it('should format error response if response.errors is a string', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				query: 'query { foo }',
			});
			mockExecuteFunctions.helpers.request.mockResolvedValue({
				errors: 'Bad format',
			});
			const node = new GraphQL();

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Bad format');
		});

		it('should fallback to unexpected error if response.errors is not an array or string', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				query: 'query { foo }',
			});
			mockExecuteFunctions.helpers.request.mockResolvedValue({
				errors: 123,
			});
			const node = new GraphQL();

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Unexpected error');
		});

		it('should wrap request errors without copying request options', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				query: 'query { foo }',
			});
			const requestError = Object.assign(new Error('ECONNREFUSED'), {
				code: 'ECONNREFUSED',
				isAxiosError: true,
				options: {
					headers: { Authorization: 'credential-value' },
				},
			});
			mockExecuteFunctions.helpers.request.mockRejectedValue(requestError);
			const node = new GraphQL();

			const error: unknown = await node.execute.call(mockExecuteFunctions).catch((error) => error);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toHaveProperty('context.itemIndex', 0);
			expect({ ...(error as NodeApiError) }).not.toHaveProperty('options');
			expect(JSON.stringify({ ...(error as NodeApiError) })).not.toContain('credential-value');
		});

		it('should preserve execution errors', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				query: 'query { foo }',
			});
			const executionError = new ExpressionError('Invalid expression');
			mockExecuteFunctions.helpers.request.mockRejectedValue(executionError);
			const node = new GraphQL();

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toBe(executionError);
		});
	});

	describe('credential allowed domains', () => {
		const createMockExecuteFunctions = (
			parameters: IDataObject,
			credentialsByName: Record<string, IDataObject> = {},
		) => {
			const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameter, _idx, fallbackValue) => {
				return get(parameters, parameter) ?? fallbackValue;
			});
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'GraphQL',
				type: 'n8n-nodes-base.graphql',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: {},
			});
			mockExecuteFunctions.getCredentials.mockImplementation(async (type) => {
				const data = credentialsByName[type as string];
				if (!data) throw new Error(`No credentials of type ${String(type)}`);
				return data;
			});
			mockExecuteFunctions.helpers.returnJsonArray.mockImplementation(returnJsonArray);
			mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation(
				constructExecutionMetaData,
			);
			mockExecuteFunctions.helpers.request.mockResolvedValue({ data: { ok: true } });
			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue({
				body: { data: { ok: true } },
			});
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				data: { ok: true },
			});
			return mockExecuteFunctions;
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('passes credential allowedDomains to request options for Header Auth', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'headerAuth',
					requestMethod: 'POST',
					endpoint: 'http://example.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					httpBasicAuth: {
						user: 'user',
						password: 'password',
					},
					httpCustomAuth: {
						json: '{"headers":{"X-Custom":"custom"}}',
					},
					httpDigestAuth: {
						user: 'digest-user',
						password: 'digest-password',
					},
					httpHeaderAuth: {
						name: 'Authorization',
						value: 'Bearer secret',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'example.com',
					},
					httpQueryAuth: {
						name: 'Token',
						value: 'query-secret',
					},
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledOnce();
			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('httpHeaderAuth');
			const requestOptions = mockExecuteFunctions.helpers.request.mock.calls[0][0];
			expect(requestOptions).toMatchObject({
				uri: 'http://example.com/graphql',
				allowedDomains: 'example.com',
				headers: { Authorization: 'Bearer secret' },
			});
			expect(requestOptions).not.toHaveProperty('auth');
			expect(requestOptions).not.toHaveProperty('qs.Token');
		});

		it("does not retrieve credentials when authentication is 'none'", async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				authentication: 'none',
				requestMethod: 'POST',
				endpoint: 'http://example.com/graphql',
				requestFormat: 'json',
				responseFormat: 'json',
				query: '{ok}',
			});

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getCredentials).not.toHaveBeenCalled();
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
		});

		it('continues without authentication when the selected credential cannot be retrieved', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({
				authentication: 'headerAuth',
				requestMethod: 'POST',
				endpoint: 'http://example.com/graphql',
				requestFormat: 'json',
				responseFormat: 'json',
				query: '{ok}',
			});

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledOnce();
			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('httpHeaderAuth');
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
		});

		it('passes credential allowedDomains to OAuth2 request options', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'oAuth2',
					requestMethod: 'POST',
					endpoint: 'http://example.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					oAuth2Api: {
						accessTokenUrl: 'http://example.com/token',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'example.com',
					},
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
			const requestOptions = mockExecuteFunctions.helpers.requestOAuth2.mock.calls[0][1];
			expect(requestOptions).toMatchObject({
				uri: 'http://example.com/graphql',
				allowedDomains: 'example.com',
			});
		});

		it("throws when credential restriction is 'none'", async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'headerAuth',
					requestMethod: 'POST',
					endpoint: 'http://example.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					httpHeaderAuth: {
						name: 'Authorization',
						value: 'Bearer secret',
						allowedHttpRequestDomains: 'none',
					},
				},
			);

			const node = new GraphQL();
			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'configured to prevent use within an HTTP Request or GraphQL node',
			);
			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
		});

		it("throws when restriction is 'domains' but no domains are configured", async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'headerAuth',
					requestMethod: 'POST',
					endpoint: 'http://example.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					httpHeaderAuth: {
						name: 'Authorization',
						value: 'Bearer secret',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: '',
					},
				},
			);

			const node = new GraphQL();
			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'No allowed domains specified',
			);
			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
		});

		it('leaves allowedDomains undefined when credential has no restriction', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'headerAuth',
					requestMethod: 'POST',
					endpoint: 'http://example.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					httpHeaderAuth: {
						name: 'Authorization',
						value: 'Bearer secret',
					},
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			const requestOptions = mockExecuteFunctions.helpers.request.mock
				.calls[0][0] as IRequestOptions;
			expect(requestOptions.allowedDomains).toBeUndefined();
		});

		it('calls requestWithAuthentication for a predefined credential type', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
					requestMethod: 'POST',
					endpoint: 'https://api.github.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					githubApi: { accessToken: 'token123' },
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('githubApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0][0]).toBe(
				'githubApi',
			);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0][1]).toMatchObject(
				{
					uri: 'https://api.github.com/graphql',
				},
			);
			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
		});

		it('passes credential allowedDomains for a predefined credential type', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
					requestMethod: 'POST',
					endpoint: 'https://api.github.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					githubApi: {
						accessToken: 'token123',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'api.github.com',
					},
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			const requestOptions = mockExecuteFunctions.helpers.requestWithAuthentication.mock
				.calls[0][1] as IRequestOptions;
			expect(requestOptions).toMatchObject({ allowedDomains: 'api.github.com' });
		});

		it('applies OAuth2 additional parameters for a known predefined credential type', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackOAuth2Api',
					requestMethod: 'POST',
					endpoint: 'https://slack.com/api/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					slackOAuth2Api: { accessToken: 'token123' },
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0][2]).toEqual({
				oauth2: { tokenType: 'Bearer', property: 'authed_user.access_token' },
			});
		});

		it('does not set OAuth2 additional options for a predefined credential type outside the OAuth2 quirks table', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
					requestMethod: 'POST',
					endpoint: 'https://api.github.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					githubApi: { accessToken: 'token123' },
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(
				mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0][2],
			).toBeUndefined();
		});

		it.each([
			{ authentication: 'predefinedCredentialType', credentialType: 'githubApi' },
			{ authentication: 'multipleHeadersAuth', credentialType: 'httpMultipleHeadersAuth' },
		])(
			'throws when $authentication credentials disable HTTP requests',
			async ({ authentication, credentialType }) => {
				const mockExecuteFunctions = createMockExecuteFunctions(
					{
						authentication,
						nodeCredentialType: credentialType,
						requestMethod: 'POST',
						endpoint: 'https://api.github.com/graphql',
						requestFormat: 'json',
						responseFormat: 'json',
						query: '{ok}',
					},
					{
						[credentialType]: {
							allowedHttpRequestDomains: 'none',
						},
					},
				);

				const node = new GraphQL();
				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'configured to prevent use within an HTTP Request or GraphQL node',
				);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
			},
		);

		it("throws when a predefined credential's domain restriction is 'domains' but none are configured", async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
					requestMethod: 'POST',
					endpoint: 'https://api.github.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					githubApi: {
						accessToken: 'token123',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: '',
					},
				},
			);

			const node = new GraphQL();
			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'No allowed domains specified',
			);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('still attempts requestWithAuthentication when the initial credential fetch fails', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
					requestMethod: 'POST',
					endpoint: 'https://api.github.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{},
			);
			mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue(
				new Error('No credentials found of type githubApi'),
			);

			const node = new GraphQL();
			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0][0]).toBe(
				'githubApi',
			);
			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
		});

		it('wraps requestWithAuthentication errors without leaking request options', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
					requestMethod: 'POST',
					endpoint: 'https://api.github.com/graphql',
					requestFormat: 'json',
					responseFormat: 'json',
					query: '{ok}',
				},
				{
					githubApi: { accessToken: 'token123' },
				},
			);
			const requestError = Object.assign(new Error('ECONNREFUSED'), {
				code: 'ECONNREFUSED',
				isAxiosError: true,
				options: {
					headers: { Authorization: 'credential-value' },
				},
			});
			mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue(requestError);

			const node = new GraphQL();
			const error: unknown = await node.execute.call(mockExecuteFunctions).catch((error) => error);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toHaveProperty('context.itemIndex', 0);
			expect({ ...(error as NodeApiError) }).not.toHaveProperty('options');
			expect(JSON.stringify({ ...(error as NodeApiError) })).not.toContain('credential-value');
		});
	});
});
