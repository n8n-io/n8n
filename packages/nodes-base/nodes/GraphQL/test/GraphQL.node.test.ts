import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mockDeep } from 'vitest-mock-extended';
import get from 'lodash/get';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
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
					httpHeaderAuth: {
						name: 'Authorization',
						value: 'Bearer secret',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'example.com',
					},
				},
			);

			const node = new GraphQL();
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
			const requestOptions = mockExecuteFunctions.helpers.request.mock.calls[0][0];
			expect(requestOptions).toMatchObject({
				uri: 'http://example.com/graphql',
				allowedDomains: 'example.com',
			});
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
	});
});
