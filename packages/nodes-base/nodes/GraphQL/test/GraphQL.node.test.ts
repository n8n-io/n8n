import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import nock from 'nock';
import type { ICredentialDataDecryptedObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { GraphQL } from '../GraphQL.node';

describe('GraphQL Node', () => {
	const getExecuteFunctions = (credentials?: ICredentialDataDecryptedObject) => {
		const executeFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue(mock<INode>({ name: 'GraphQL' })),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: mock<IExecuteFunctions['helpers']>({
				request: jest.fn(),
				returnJsonArray: jest.fn(),
				constructExecutionMetaData: jest.fn(),
			}),
		});

		executeFunctions.getCredentials.mockImplementation(async (credentialType) => {
			if (credentialType === 'httpBasicAuth' && credentials) {
				return credentials;
			}

			throw new Error('No credentials');
		});

		executeFunctions.getNodeParameter.mockImplementation((parameterName) => {
			switch (parameterName) {
				case 'requestMethod':
					return 'POST';
				case 'endpoint':
					return 'https://api.n8n.io/graphql';
				case 'requestFormat':
				case 'responseFormat':
					return 'json';
				case 'headerParametersUi':
				case 'variables':
					return {};
				case 'allowUnauthorizedCerts':
					return false;
				case 'query':
					return 'query { foo }';
				case 'operationName':
					return '';
				default:
					return undefined;
			}
		});

		jest.mocked(executeFunctions.helpers.request).mockResolvedValue({ data: { foo: 'bar' } });
		jest
			.mocked(executeFunctions.helpers.returnJsonArray)
			.mockReturnValue([{ json: { data: { foo: 'bar' } } }]);
		jest
			.mocked(executeFunctions.helpers.constructExecutionMetaData)
			.mockReturnValue([{ json: { data: { foo: 'bar' } }, pairedItem: { item: 0 } }]);

		return executeFunctions;
	};

	describe('allowed domains', () => {
		it('should pass allowed domains from credentials to the request options', async () => {
			const executeFunctions = getExecuteFunctions({
				user: 'test',
				password: 'secret',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'api.n8n.io',
			});

			await new GraphQL().execute.call(executeFunctions);

			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					allowedDomains: 'api.n8n.io',
				}),
			);
		});

		it('should reject credentials that cannot be used in GraphQL requests', async () => {
			const executeFunctions = getExecuteFunctions({
				user: 'test',
				password: 'secret',
				allowedHttpRequestDomains: 'none',
			});

			await expect(new GraphQL().execute.call(executeFunctions)).rejects.toThrow(
				'This credential is configured to prevent use within an HTTP Request or GraphQL node',
			);
			expect(executeFunctions.helpers.request).not.toHaveBeenCalled();
		});
	});

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
});
