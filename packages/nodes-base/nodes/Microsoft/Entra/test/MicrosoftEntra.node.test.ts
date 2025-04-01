import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	WorkflowTestData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { CredentialsHelper } from '@test/nodes/credentials-helper';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';

import { microsoftEntraApiResponse, microsoftEntraNodeResponse } from './mocks';
import { MicrosoftEntra } from '../MicrosoftEntra.node';

describe('Microsoft Entra Node', () => {
	const baseUrl = 'https://graph.microsoft.com/v1.0';

	describe('Credentials', () => {
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
								name: "When clicking 'Test workflow'",
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
								name: 'Micosoft Entra ID',
								credentials: {
									microsoftEntraOAuth2Api: {
										id: 'Hot2KwSMSoSmMVqd',
										name: 'Microsoft Entra ID (Azure Active Directory) account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Micosoft Entra ID',
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
					nodeExecutionOrder: ['Start'],
					nodeData: {
						'Micosoft Entra ID': [microsoftEntraNodeResponse.getGroup],
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

		beforeAll(() => {
			jest
				.spyOn(CredentialsHelper.prototype, 'authenticate')
				.mockImplementation(
					async (
						credentials: ICredentialDataDecryptedObject,
						typeName: string,
						requestParams: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> => {
						if (typeName === 'microsoftEntraOAuth2Api') {
							return {
								...requestParams,
								headers: {
									authorization:
										'bearer ' + (credentials.oauthTokenData as IDataObject).access_token,
								},
							};
						} else {
							return requestParams;
						}
					},
				);
		});

		test.each(tests)('$description', async (testData) => {
			const { result } = await executeWorkflow(testData);
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);
			expect(result.status).toEqual('success');
		});
	});

	describe('Load options', () => {
		it('should load group properties', async () => {
			const mockContext = {
				helpers: {
					requestWithAuthentication: jest
						.fn()
						.mockReturnValue(microsoftEntraApiResponse.metadata.groups),
				},
				getCurrentNodeParameter: jest.fn(),
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftEntra();

			const properties = await node.methods.loadOptions.getGroupProperties.call(mockContext);

			expect(properties).toEqual(microsoftEntraNodeResponse.loadOptions.getGroupProperties);
		});

		it('should load user properties', async () => {
			const mockContext = {
				helpers: {
					requestWithAuthentication: jest
						.fn()
						.mockReturnValue(microsoftEntraApiResponse.metadata.users),
				},
				getCurrentNodeParameter: jest.fn(),
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
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockContext = {
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
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
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockContext = {
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
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
});
