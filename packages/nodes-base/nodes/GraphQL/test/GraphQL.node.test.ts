import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeApiError } from 'n8n-workflow';
import nock from 'nock';

import { GraphQL, getGraphQlErrorMessage } from '../GraphQL.node';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

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

	describe('Error Handling Unit Tests', () => {
		describe('getGraphQlErrorMessage', () => {
			const testCases = [
				['Standard Spec', [{ message: 'Access denied' }], 'Access denied'],
				['Single Object', { message: 'Single error message' }, 'Single error message'],
				['The "Shopify" Bug', 'An unexpected error occurred', 'An unexpected error occurred'],
				['Multiple Errors', [{ message: 'Error 1' }, { message: 'Error 2' }], 'Error 1, Error 2'],
				['Array of Strings', ['Rate limit hit', 'Try again'], 'Rate limit hit, Try again'],
				['Extensions Code', [{ extensions: { code: 'UNAUTHORIZED' } }], 'Error code: UNAUTHORIZED'],
				['Empty Array', [], 'Unexpected error'],
				['Null/Undefined', null, 'Unexpected error'],
				['Whitespace String', '   ', 'Unexpected error'],
			] as Array<[string, any, string]>;

			it.each(testCases)('should handle %s correctly', (_, input, expected) => {
				expect(getGraphQlErrorMessage(input)).toBe(expected);
			});
		});

		describe('Node Implementation (execute) - Raw Error Logic', () => {
			let graphqlNode: GraphQL;
			let mockExecuteFunctions: any;

			beforeEach(() => {
				graphqlNode = new GraphQL();
				mockExecuteFunctions = {
					getInputData: jest.fn().mockReturnValue([{ json: {} }]),
					getNodeParameter: jest.fn(),
					getCredentials: jest.fn().mockResolvedValue(undefined),
					getNode: jest.fn().mockReturnValue({
						name: 'GraphQL', // Keep for backward compatibility/internal n8n use
						getName: () => 'GraphQL', // Specifically requested by user
						type: 'n8n-nodes-base.graphQL',
						typeVersion: 1.1,
						position: [0, 0],
						parameters: {},
					}),
					getWorkflow: jest.fn().mockReturnValue({
						id: '1',
					}),
					helpers: {
						request: jest.fn(),
						requestOAuth1: jest.fn(),
						requestOAuth2: jest.fn(),
						constructExecutionMetaData: jest.fn((data: any) => data),
						returnJsonArray: jest.fn((data: any) => [data]),
					},
					continueOnFail: jest.fn().mockReturnValue(false),
				};
				jest.clearAllMocks();
			});

			it('should throw NodeApiError with full response object as data payload', async () => {
				const errorResponse = {
					errors: 'Something went wrong',
					otherData: 'important context',
				};

				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
					if (name === 'requestMethod') return 'POST';
					if (name === 'endpoint') return 'http://api.test/graphql';
					if (name === 'requestFormat') return 'json';
					if (name === 'responseFormat') return 'json';
					if (name === 'query') return '{ foo }';
					return '';
				});

				mockExecuteFunctions.helpers.request.mockResolvedValue(errorResponse);

				try {
					await graphqlNode.execute.call(mockExecuteFunctions);
				} catch (error: any) {
					// Verify it's a NodeApiError (or at least has its properties)
					expect(error).toBeInstanceOf(NodeApiError);

					// Verify the error message extracted by our helper
					expect(error.message).toBe('Something went wrong');

					// CRITICAL: Verify the error data payload is the FULL response object, not just response.errors
					expect(error.errorResponse).toEqual(errorResponse);
					expect(error.errorResponse?.otherData).toBe('important context');
					return;
				}
				throw new Error('Execute should have thrown NodeApiError');
			});

			it('should handle array of errors with extensions correctly in the node', async () => {
				const errorResponse = {
					errors: [{ message: 'Failed' }, { extensions: { code: 'FORBIDDEN' } }],
					meta: 'context',
				};

				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
					if (name === 'requestMethod') return 'POST';
					if (name === 'endpoint') return 'http://api.test/graphql';
					if (name === 'requestFormat') return 'json';
					if (name === 'responseFormat') return 'json';
					if (name === 'query') return '{ foo }';
					return '';
				});

				mockExecuteFunctions.helpers.request.mockResolvedValue(errorResponse);

				try {
					await graphqlNode.execute.call(mockExecuteFunctions);
				} catch (error: any) {
					expect(error.message).toBe('Failed, Error code: FORBIDDEN');
					expect(error.errorResponse).toEqual(errorResponse);
					return;
				}
				throw new Error('Execute should have thrown NodeApiError');
			});
		});
	});
});
