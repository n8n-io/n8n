import { CredentialsHelper } from '@nodes-testing/credentials-helper';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { convertN8nRequestToAxios } from '@n8n/backend-network/testing';
import type {
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	WorkflowTestData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import nock from 'nock';
import type { MockInstance } from 'vitest';

import { microsoftEntraApiResponse, microsoftEntraNodeResponse } from './mocks';
import { MicrosoftEntra } from '../MicrosoftEntra.node';
import { ignoreHttpStatusErrorsConfig } from '../descriptions/common';
import { handleErrorPostReceive } from '../GenericFunctions';

describe('Microsoft Entra Node', () => {
	const testHarness = new NodeTestHarness();
	const baseUrl = 'https://graph.microsoft.com/v1.0';

	describe('Credentials', () => {
		const credentials = {
			microsoftEntraOAuth2Api: {
				scope: '',
				oauthTokenData: {
					access_token: 'ACCESSTOKEN',
				},
			},
		};

		const tests: WorkflowTestData[] = [
			{
				description: 'should use correct credentials',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '1307e408-a8a5-464e-b858-494953e2f43b',
								name: 'When clicking ‘Execute workflow’',
							},
							{
								parameters: {
									resource: 'group',
									operation: 'get',
									group: {
										__rl: true,
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
										mode: 'id',
									},
									filter: '',
									output: 'raw',
									requestOptions: {},
								},
								type: 'n8n-nodes-base.microsoftEntra',
								typeVersion: 1,
								position: [220, 0],
								id: '3429f7f2-dfca-4b72-8913-43a582e96e66',
								name: 'Microsoft Entra ID',
								credentials: {
									microsoftEntraOAuth2Api: {
										id: 'Hot2KwSMSoSmMVqd',
										name: 'Microsoft Entra ID (Azure Active Directory) account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Execute workflow’': {
								main: [
									[
										{
											node: 'Microsoft Entra ID',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.getGroup],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: `/groups/${microsoftEntraApiResponse.getGroup.id}`,
							statusCode: 200,
							responseBody: {
								...microsoftEntraApiResponse.getGroup,
							},
						},
					],
				},
			},
		];

		for (const testData of tests) {
			testHarness.setupTest(testData, { credentials });
		}
	});

	describe('HTTP status handling', () => {
		it('handles non-authentication errors in the node error handler', async () => {
			const axiosRequest = convertN8nRequestToAxios({
				method: 'DELETE',
				url: 'https://graph.microsoft.com/v1.0/users/missing-user-id',
				ignoreHttpStatusErrors: ignoreHttpStatusErrorsConfig,
			});
			const response: IN8nHttpFullResponse = {
				statusCode: 404,
				headers: {},
				body: {
					error: {
						code: 'Request_ResourceNotFound',
						message: 'Resource could not be found.',
					},
				},
			};
			const context = {
				getNode: vi.fn().mockReturnValue({ name: 'Microsoft Entra ID' }),
				getNodeParameter: vi.fn((parameterName: string) => {
					if (parameterName === 'resource') return 'user';
					if (parameterName === 'operation') return 'delete';
					return '';
				}),
			} as unknown as IExecuteSingleFunctions;

			expect(axiosRequest.validateStatus?.(response.statusCode)).toBe(true);
			await expect(handleErrorPostReceive.call(context, [], response)).rejects.toThrow(
				"The required user doesn't match any existing one",
			);
		});
	});

	describe('Load options', () => {
		it('should load group properties', async () => {
			const mockContext = {
				helpers: {
					requestWithAuthentication: vi
						.fn()
						.mockReturnValue(microsoftEntraApiResponse.metadata.groups),
				},
				getCurrentNodeParameter: vi.fn(),
				getCredentials: vi.fn().mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				}),
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftEntra();

			const properties = await node.methods.loadOptions.getGroupProperties.call(mockContext);

			expect(properties).toEqual(microsoftEntraNodeResponse.loadOptions.getGroupProperties);
		});

		it('should load user properties', async () => {
			const mockContext = {
				helpers: {
					requestWithAuthentication: vi
						.fn()
						.mockReturnValue(microsoftEntraApiResponse.metadata.users),
				},
				getCurrentNodeParameter: vi.fn(),
				getCredentials: vi.fn().mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				}),
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftEntra();

			const properties = await node.methods.loadOptions.getUserProperties.call(mockContext);

			expect(properties).toEqual(microsoftEntraNodeResponse.loadOptions.getUserProperties);
		});
	});

	describe('List search', () => {
		it('should list search groups', async () => {
			const mockResponse = {
				value: Array.from({ length: 2 }, (_, i) => ({
					id: (i + 1).toString(),
					displayName: `Group ${i + 1}`,
				})),
				'@odata.nextLink': '',
			};
			const mockRequestWithAuthentication = vi.fn().mockReturnValue(mockResponse);
			const mockContext = {
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
				getCredentials: vi.fn().mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				}),
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftEntra();

			const listSearchResult = await node.methods.listSearch.getGroups.call(mockContext);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith('microsoftEntraOAuth2Api', {
				method: 'GET',
				url: 'https://graph.microsoft.com/v1.0/groups',
				json: true,
				headers: {},
				body: {},
				qs: {
					$select: 'id,displayName',
				},
			});
			expect(listSearchResult).toEqual({
				results: mockResponse.value.map((x) => ({ name: x.displayName, value: x.id })),
				paginationToken: mockResponse['@odata.nextLink'],
			});
		});

		it('should list search users', async () => {
			const mockResponse = {
				value: Array.from({ length: 2 }, (_, i) => ({
					id: (i + 1).toString(),
					displayName: `User ${i + 1}`,
				})),
				'@odata.nextLink': '',
			};
			const mockRequestWithAuthentication = vi.fn().mockReturnValue(mockResponse);
			const mockContext = {
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
				getCredentials: vi.fn().mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				}),
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftEntra();

			const listSearchResult = await node.methods.listSearch.getUsers.call(mockContext);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith('microsoftEntraOAuth2Api', {
				method: 'GET',
				url: 'https://graph.microsoft.com/v1.0/users',
				json: true,
				headers: {},
				body: {},
				qs: {
					$select: 'id,displayName',
				},
			});
			expect(listSearchResult).toEqual({
				results: mockResponse.value.map((x) => ({ name: x.displayName, value: x.id })),
				paginationToken: mockResponse['@odata.nextLink'],
			});
		});
	});

	describe('Token refresh', () => {
		const tokenRefreshUrl = 'https://login.microsoftonline.com';
		const credentials = {
			microsoftEntraOAuth2Api: {
				grantType: 'authorizationCode',
				authUrl: `${tokenRefreshUrl}/common/oauth2/v2.0/authorize`,
				accessTokenUrl: `${tokenRefreshUrl}/common/oauth2/v2.0/token`,
				clientId: 'CLIENT_ID',
				clientSecret: 'CLIENT_SECRET',
				scope: 'openid offline_access User.ReadWrite.All',
				authQueryParameters: 'response_mode=query',
				authentication: 'body',
				graphApiBaseUrl: 'https://graph.microsoft.com',
				oauthTokenData: {
					token_type: 'Bearer',
					expires_in: 3599,
					access_token: 'ACCESSTOKEN',
					refresh_token: 'REFRESHTOKEN',
				},
			},
		};

		let updateCredentialsSpy: MockInstance;

		beforeEach(() => {
			vi.spyOn(CredentialsHelper.prototype, 'getParentTypes').mockReturnValue(['oAuth2Api']);

			updateCredentialsSpy = vi
				.spyOn(CredentialsHelper.prototype, 'updateCredentialsOauthTokenData')
				.mockResolvedValue();

			nock('https://graph.microsoft.com')
				.get('/v1.0/users')
				.query(true)
				.matchHeader('Authorization', 'Bearer ACCESSTOKEN')
				.reply(401, {
					error: {
						code: 'InvalidAuthenticationToken',
						message: 'Lifetime validation failed, the token is expired.',
					},
				});

			nock(tokenRefreshUrl).post('/common/oauth2/v2.0/token').reply(200, {
				token_type: 'Bearer',
				scope: 'openid offline_access User.ReadWrite.All',
				expires_in: 3599,
				access_token: 'NEWACCESSTOKEN',
				refresh_token: 'NEWREFRESHTOKEN',
			});

			nock('https://graph.microsoft.com')
				.get('/v1.0/users')
				.query(true)
				.matchHeader('Authorization', 'Bearer NEWACCESSTOKEN')
				.reply(200, {
					value: [
						{
							id: 'user-1',
							createdDateTime: '2025-04-06T13:15:34Z',
							displayName: 'Test User',
							userPrincipalName: 'test.user@example.com',
							mail: 'test.user@example.com',
							mailNickname: 'test.user',
							securityIdentifier: 'S-1-1-0',
						},
					],
				});
		});

		afterEach(() => {
			nock.cleanAll();
		});

		afterAll(() => {
			vi.restoreAllMocks();
		});

		testHarness.setupTest(
			{
				description: 'should refresh an expired token when getting users',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '1307e408-a8a5-464e-b858-494953e2f43b',
								name: 'When clicking ‘Execute workflow’',
							},
							{
								parameters: {
									resource: 'user',
									operation: 'getAll',
									returnAll: false,
									limit: 50,
									filter: '',
									output: 'simple',
									requestOptions: {},
								},
								type: 'n8n-nodes-base.microsoftEntra',
								typeVersion: 1,
								position: [220, 0],
								id: '3429f7f2-dfca-4b72-8913-43a582e96e66',
								name: 'Microsoft Entra ID',
								credentials: {
									microsoftEntraOAuth2Api: {
										id: 'Hot2KwSMSoSmMVqd',
										name: 'Microsoft Entra ID (Azure Active Directory) account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Execute workflow’': {
								main: [
									[
										{
											node: 'Microsoft Entra ID',
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
						'Microsoft Entra ID': [
							[
								{
									json: {
										id: 'user-1',
										createdDateTime: '2025-04-06T13:15:34Z',
										displayName: 'Test User',
										userPrincipalName: 'test.user@example.com',
										mail: 'test.user@example.com',
										mailNickname: 'test.user',
										securityIdentifier: 'S-1-1-0',
									},
								},
							],
						],
					},
				},
			},
			{
				credentials,
				customAssertions: () => {
					expect(updateCredentialsSpy).toHaveBeenCalledTimes(1);
					expect(updateCredentialsSpy.mock.calls[0][1]).toBe('microsoftEntraOAuth2Api');
					expect(updateCredentialsSpy.mock.calls[0][2]).toMatchObject({
						oauthTokenData: expect.objectContaining({
							access_token: 'NEWACCESSTOKEN',
							refresh_token: 'NEWREFRESHTOKEN',
						}),
					});
					expect(nock.isDone()).toBe(true);
				},
			},
		);
	});
});
