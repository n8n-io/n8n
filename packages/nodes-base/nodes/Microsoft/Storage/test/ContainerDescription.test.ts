import { NodeConnectionType } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import { azureStorageApiResponse, azureStorageNodeResponse } from './mocks';
import { HeaderConstants } from '../GenericFunctions';

describe('Azure Storage Node', () => {
	const baseUrl = 'https://myaccount.blob.core.windows.net';

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('Container description', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should create container',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '99f866fa-f63c-477d-a0d0-48fbdb8a344a',
								name: 'When clicking ‘Test workflow’',
							},
							{
								parameters: {
									operation: 'create',
									container: 'mycontainer',
									options: {
										accessLevel: 'blob',
										metadata: {
											metadataValues: [
												{
													fieldName: 'key1',
													fieldValue: 'value1',
												},
											],
										},
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
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
							'When clicking ‘Test workflow’': {
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
						'Azure Storage': [azureStorageNodeResponse.containerCreate],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'put',
							path: '/mycontainer?restype=container',
							statusCode: 201,
							requestHeaders: {
								[HeaderConstants.X_MS_BLOB_PUBLIC_ACCESS]: 'blob',
								[`${HeaderConstants.PREFIX_X_MS_META}key1`]: 'value1',
							},
							responseBody: '',
							responseHeaders: azureStorageApiResponse.containerCreate.headers,
						},
					],
				},
			},
			{
				description: 'should delete container',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '99f866fa-f63c-477d-a0d0-48fbdb8a344a',
								name: 'When clicking ‘Test workflow’',
							},
							{
								parameters: {
									operation: 'delete',
									container: {
										__rl: true,
										mode: 'list',
										value: 'mycontainer',
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
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
							'When clicking ‘Test workflow’': {
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
						'Azure Storage': [azureStorageNodeResponse.containerDelete],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'delete',
							path: '/mycontainer?restype=container',
							statusCode: 202,
							responseBody: '',
							responseHeaders: azureStorageApiResponse.containerDelete.headers,
						},
					],
				},
			},
			{
				description: 'should get container',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '99f866fa-f63c-477d-a0d0-48fbdb8a344a',
								name: 'When clicking ‘Test workflow’',
							},
							{
								parameters: {
									operation: 'get',
									container: {
										__rl: true,
										mode: 'list',
										value: 'mycontainer',
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
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
							'When clicking ‘Test workflow’': {
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
							responseBody: '',
							responseHeaders: azureStorageApiResponse.containerGet.headers,
						},
					],
				},
			},
			{
				description: 'should get all containers',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '99f866fa-f63c-477d-a0d0-48fbdb8a344a',
								name: 'When clicking ‘Test workflow’',
							},
							{
								parameters: {
									operation: 'getAll',
									returnAll: true,
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
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
							'When clicking ‘Test workflow’': {
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
						'Azure Storage': [
							[
								azureStorageNodeResponse.containerGetAll[0],
								azureStorageNodeResponse.containerGetAll[0],
							],
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/?comp=list',
							statusCode: 200,
							responseBody: azureStorageApiResponse.containerList.body,
						},
						{
							method: 'get',
							path: '/?comp=list&marker=mycontainer2',
							statusCode: 200,
							responseBody: azureStorageApiResponse.containerListNoMarker.body,
						},
					],
				},
			},
			{
				description: 'should get all containers with limit and options',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								id: '99f866fa-f63c-477d-a0d0-48fbdb8a344a',
								name: 'When clicking ‘Test workflow’',
							},
							{
								parameters: {
									operation: 'getAll',
									limit: 1,
									options: {
										fields: ['metadata', 'deleted', 'system'],
										filter: 'mycontainer',
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
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
							'When clicking ‘Test workflow’': {
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
						'Azure Storage': [azureStorageNodeResponse.containerGetAll],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/?comp=list&maxresults=1&include=metadata%2Cdeleted%2Csystem&prefix=mycontainer',
							statusCode: 200,
							responseBody: azureStorageApiResponse.containerList.body,
						},
					],
				},
			},
		];

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
});
