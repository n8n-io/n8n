import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import { azureStorageApiResponse, azureStorageNodeResponse } from './mocks';
import { FAKE_CREDENTIALS_DATA } from '../../../../test/nodes/FakeCredentialsMap';
import { AzureStorage } from '../AzureStorage.node';
import { XMsVersion } from '../GenericFunctions';

describe('Azure Storage Node', () => {
	const baseUrl = 'https://myaccount.blob.core.windows.net';

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('Credentials', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should use correct oauth2 credentials',
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
									authentication: 'oAuth2',
									resource: 'container',
									operation: 'get',
									container: {
										__rl: true,
										value: 'mycontainer',
										mode: 'id',
									},
									options: {
										simplify: false,
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: '3429f7f2-dfca-4b72-8913-43a582e96e66',
								name: 'Azure Storage',
								credentials: {
									azureStorageOAuth2Api: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Azure Storage OAuth2 account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Azure Storage',
											type: NodeConnectionType.Main,
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
						'Azure Storage': [azureStorageNodeResponse.containerGet],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/mycontainer?restype=container',
							statusCode: 200,
							requestHeaders: {
								authorization: `bearer ${FAKE_CREDENTIALS_DATA.azureStorageOAuth2Api.oauthTokenData.access_token}`,
							},
							responseBody: '',
							responseHeaders: azureStorageApiResponse.containerGet.headers,
						},
					],
				},
			},
			{
				description: 'should use correct shared key credentials',
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
									resource: 'container',
									operation: 'get',
									container: {
										__rl: true,
										value: 'mycontainer',
										mode: 'id',
									},
									options: {
										simplify: false,
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: '3429f7f2-dfca-4b72-8913-43a582e96e66',
								name: 'Azure Storage',
								credentials: {
									azureStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Azure Storage Shared Key account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Azure Storage',
											type: NodeConnectionType.Main,
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
						'Azure Storage': [azureStorageNodeResponse.containerGet],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/mycontainer?restype=container',
							statusCode: 200,
							requestHeaders: {
								authorization:
									'SharedKey Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
							},
							responseBody: '',
							responseHeaders: azureStorageApiResponse.containerGet.headers,
						},
					],
				},
			},
		];

		beforeAll(() => {
			nock.disableNetConnect();

			jest
				.spyOn(Helpers.CredentialsHelper.prototype, 'authenticate')
				.mockImplementation(
					async (
						credentials: ICredentialDataDecryptedObject,
						typeName: string,
						requestParams: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> => {
						if (typeName === 'azureStorageOAuth2Api') {
							return {
								...requestParams,
								headers: {
									authorization: `bearer ${(credentials.oauthTokenData as IDataObject).access_token as string}`,
								},
							};
						} else if (typeName === 'azureStorageSharedKeyApi') {
							return {
								...requestParams,
								headers: {
									authorization:
										'SharedKey Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
								},
							};
						} else {
							return requestParams;
						}
					},
				);
		});

		afterAll(() => {
			nock.restore();
			jest.restoreAllMocks();
		});

		const nodeTypes = Helpers.setup(tests);

		test.each(tests)('$description', async (testData) => {
			const { result } = await executeWorkflow(testData, nodeTypes);
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);
			expect(result.status).toEqual('success');
		});
	});

	describe('List search', () => {
		it('should list search blobs', async () => {
			const mockResponse = azureStorageApiResponse.blobList.body;
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'authentication') {
					return 'sharedKey';
				}
				if (parameterName === 'container') {
					return {
						value: 'mycontainer',
					} as INodeParameterResourceLocator;
				}
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'azureStorageSharedKeyApi') {
					return FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi;
				}
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
			const node = new AzureStorage();

			const listSearchResult = await node.methods.listSearch.getBlobs.call(mockContext);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith('azureStorageSharedKeyApi', {
				method: 'GET',
				url: 'https://myaccount.blob.core.windows.net/mycontainer',
				headers: {
					'x-ms-date': 'Wed, 01 Jan 2025 00:00:00 GMT',
					'x-ms-version': XMsVersion,
				},
				qs: {
					comp: 'list',
					maxresults: 5000,
					restype: 'container',
				},
				body: {},
			});
			expect(listSearchResult).toEqual({
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				results: [{ name: 'myblob1', value: 'myblob1' }],
				paginationToken: 'myblob2',
			});
		});

		it('should list search containers', async () => {
			const mockResponse = azureStorageApiResponse.containerList.body;
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'authentication') {
					return 'sharedKey';
				}
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'azureStorageSharedKeyApi') {
					return FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi;
				}
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
			const node = new AzureStorage();

			const listSearchResult = await node.methods.listSearch.getContainers.call(mockContext);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith('azureStorageSharedKeyApi', {
				method: 'GET',
				url: 'https://myaccount.blob.core.windows.net/',
				headers: {
					'x-ms-date': 'Wed, 01 Jan 2025 00:00:00 GMT',
					'x-ms-version': XMsVersion,
				},
				qs: {
					comp: 'list',
					maxresults: 5000,
				},
				body: {},
			});
			expect(listSearchResult).toEqual({
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				results: [{ name: 'mycontainer1', value: 'mycontainer1' }],
				paginationToken: 'mycontainer2',
			});
		});
	});
});
