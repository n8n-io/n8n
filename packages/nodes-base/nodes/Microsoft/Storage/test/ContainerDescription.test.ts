import { NodeConnectionType } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import { microsoftStorageApiResponse, microsoftStorageNodeResponse } from './mocks';

describe('Microsoft Storage Node', () => {
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
									additionalFields: {
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
								type: 'n8n-nodes-base.microsoftStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Microsoft Storage',
								credentials: {
									microsoftStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Microsoft Storage Shared Key account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Test workflow’': {
								main: [
									[
										{
											node: 'Microsoft Storage',
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
						'Microsoft Storage': [microsoftStorageNodeResponse.containerCreate],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'put',
							path: '/mycontainer?restype=container',
							statusCode: 201,
							responseBody: '',
							responseHeaders: microsoftStorageApiResponse.containerCreate.headers,
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
								type: 'n8n-nodes-base.microsoftStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Microsoft Storage',
								credentials: {
									microsoftStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Microsoft Storage Shared Key account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Test workflow’': {
								main: [
									[
										{
											node: 'Microsoft Storage',
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
						'Microsoft Storage': [microsoftStorageNodeResponse.containerDelete],
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
							responseHeaders: microsoftStorageApiResponse.containerDelete.headers,
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
								type: 'n8n-nodes-base.microsoftStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Microsoft Storage',
								credentials: {
									microsoftStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Microsoft Storage Shared Key account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Test workflow’': {
								main: [
									[
										{
											node: 'Microsoft Storage',
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
						'Microsoft Storage': [microsoftStorageNodeResponse.containerGet],
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
							responseHeaders: microsoftStorageApiResponse.containerGet.headers,
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
								type: 'n8n-nodes-base.microsoftStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Microsoft Storage',
								credentials: {
									microsoftStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Microsoft Storage Shared Key account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Test workflow’': {
								main: [
									[
										{
											node: 'Microsoft Storage',
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
						'Microsoft Storage': [
							[
								microsoftStorageNodeResponse.containerGetAll[0],
								microsoftStorageNodeResponse.containerGetAll[0],
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
							responseBody: microsoftStorageApiResponse.containerList.body,
						},
						{
							method: 'get',
							path: '/?comp=list&marker=mycontainer2',
							statusCode: 200,
							responseBody: microsoftStorageApiResponse.containerListNoMarker.body,
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
									fields: ['metadata', 'deleted', 'system'],
									filter: 'mycontainer',
									requestOptions: {},
								},
								type: 'n8n-nodes-base.microsoftStorage',
								typeVersion: 1,
								position: [220, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Microsoft Storage',
								credentials: {
									microsoftStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Microsoft Storage Shared Key account',
									},
								},
							},
						],
						connections: {
							'When clicking ‘Test workflow’': {
								main: [
									[
										{
											node: 'Microsoft Storage',
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
						'Microsoft Storage': [microsoftStorageNodeResponse.containerGetAll],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/?comp=list&maxresults=1&include=metadata%2Cdeleted%2Csystem&prefix=mycontainer',
							statusCode: 200,
							responseBody: microsoftStorageApiResponse.containerList.body,
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
