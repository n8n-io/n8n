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

	describe('Blob description', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should create blob',
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
									resource: 'blob',
									operation: 'create',
									container: {
										__rl: true,
										value: 'mycontainer',
										mode: 'list',
									},
									blob: 'myblob',
									options: {
										accessTier: 'Hot',
										blobType: 'BlockBlob',
										cacheControl: 'no-cache',
										contentCrc64: '3EDB64E77CB16A4C',
										contentEncoding: 'utf8',
										contentLanguage: 'en-US',
										contentMd5: 'b97f46db5f3be7709d942eefe30e5b45',
										contentType: 'application/json',
										encryptionContext: 'context',
										encryptionScope: 'encryptionScope',
										expiryOption: 'Absolute',
										filename: 'file.json',
										immutabilityPolicyUntilDate: '2025-01-01T00:00:00',
										immutabilityPolicyMode: 'unlocked',
										leaseId: 'leaseId123',
										legalHold: true,
										metadata: {
											metadataValues: [
												{
													fieldName: 'key1',
													fieldValue: 'value1',
												},
											],
										},
										origin: 'http://contoso.com',
										tags: {
											tagValues: [
												{
													tagName: 'tag1',
													tagValue: 'value1',
												},
											],
										},
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [660, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Azure Storage',
								credentials: {
									azureStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Azure Storage Shared Key account',
									},
								},
							},
							{
								parameters: {
									mode: 'jsonToBinary',
									convertAllData: false,
									options: {
										useRawData: true,
									},
								},
								name: 'Move Binary Data',
								type: 'n8n-nodes-base.moveBinaryData',
								typeVersion: 1,
								position: [440, 0],
								id: '221e00ed-8c9b-4313-a4d6-b87c64b09d80',
							},
							{
								parameters: {
									mode: 'raw',
									jsonOutput:
										'{\n  "data": {\n    "my_field_1": "value",\n    "my_field_2": 1\n  }\n}\n',
									options: {},
								},
								type: 'n8n-nodes-base.set',
								typeVersion: 3.4,
								position: [220, 0],
								id: '6c03903b-0177-4e94-b1ad-4f6ad9e84f62',
								name: 'Edit Fields',
							},
						],
						connections: {
							'When clicking ‘Test workflow’': {
								main: [
									[
										{
											node: 'Edit Fields',
											type: NodeConnectionType.Main,
											index: 0,
										},
									],
								],
							},
							'Move Binary Data': {
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
							'Edit Fields': {
								main: [
									[
										{
											node: 'Move Binary Data',
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
						'Azure Storage': [azureStorageNodeResponse.blobCreate],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'put',
							path: '/mycontainer/myblob',
							statusCode: 201,
							requestHeaders: {
								[HeaderConstants.X_MS_ACCESS_TIER]: 'Hot',
								[HeaderConstants.X_MS_BLOB_TYPE]: 'BlockBlob',
								[HeaderConstants.X_MS_BLOB_CACHE_CONTROL]: 'no-cache',
								[HeaderConstants.X_MS_CONTENT_CRC64]: '3EDB64E77CB16A4C',
								[HeaderConstants.X_MS_BLOB_CONTENT_ENCODING]: 'utf8',
								[HeaderConstants.X_MS_BLOB_CONTENT_LANGUAGE]: 'en-US',
								[HeaderConstants.X_MS_BLOB_CONTENT_MD5]: 'b97f46db5f3be7709d942eefe30e5b45',
								[HeaderConstants.X_MS_BLOB_CONTENT_TYPE]: 'application/json',
								[HeaderConstants.X_MS_ENCRYPTION_CONTEXT]: 'context',
								[HeaderConstants.X_MS_ENCRYPTION_SCOPE]: 'encryptionScope',
								[HeaderConstants.X_MS_EXPIRY_OPTION]: 'Absolute',
								[HeaderConstants.X_MS_BLOB_CONTENT_DISPOSITION]: 'attachment; filename="file.json"',
								[HeaderConstants.X_MS_IMMUTABILITY_POLICY_UNTIL_DATE]:
									'Wed, 01 Jan 2025 00:00:00 -0500',
								[HeaderConstants.X_MS_IMMUTABILITY_POLICY_MODE]: 'unlocked',
								[HeaderConstants.X_MS_LEASE_ID]: 'leaseId123',
								[HeaderConstants.X_MS_LEGAL_HOLD]: 'true',
								[HeaderConstants.PREFIX_X_MS_META + 'key1']: 'value1',
							},
							responseBody: '',
							responseHeaders: azureStorageApiResponse.blobPut.headers,
						},
					],
				},
			},
			{
				description: 'should delete blob',
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
									resource: 'blob',
									operation: 'delete',
									container: {
										__rl: true,
										mode: 'id',
										value: 'mycontainer',
									},
									blob: {
										__rl: true,
										mode: 'id',
										value: 'myblob',
									},
									options: {
										leaseId: 'leaseId123',
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [660, 0],
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
						'Azure Storage': [azureStorageNodeResponse.blobDelete],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'delete',
							path: '/mycontainer/myblob',
							statusCode: 202,
							responseBody: '',
							responseHeaders: azureStorageApiResponse.blobDelete.headers,
						},
					],
				},
			},
			{
				description: 'should get blob',
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
									resource: 'blob',
									operation: 'get',
									container: {
										__rl: true,
										value: 'mycontainer',
										mode: 'list',
									},
									blob: {
										__rl: true,
										value: 'myblob',
										mode: 'list',
									},
									options: {
										leaseId: 'leaseId123',
										origin: 'origin123',
										upn: true,
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [660, 0],
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
						'Azure Storage': [azureStorageNodeResponse.blobGet],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/mycontainer/myblob',
							statusCode: 200,
							responseBody: Buffer.from('{\n"data":{\n"my_field_1":"value",\n"my_field_2":1\n}\n}'),
							responseHeaders: azureStorageApiResponse.blobGet.headers,
						},
					],
				},
			},
			{
				description: 'should get all blobs',
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
									resource: 'blob',
									operation: 'getAll',
									container: {
										__rl: true,
										value: 'mycontainer',
										mode: 'list',
									},
									returnAll: true,
									options: {},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [660, 0],
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
							[azureStorageNodeResponse.blobGetAll[0], azureStorageNodeResponse.blobGetAll[0]],
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/mycontainer?restype=container&comp=list',
							statusCode: 200,
							responseBody: azureStorageApiResponse.blobList.body,
						},
						{
							method: 'get',
							path: '/mycontainer?restype=container&comp=list&marker=myblob2',
							statusCode: 200,
							responseBody: azureStorageApiResponse.blobListNoMarker.body,
						},
					],
				},
			},
			{
				description: 'should get all blobs with limit and options',
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
									resource: 'blob',
									operation: 'getAll',
									container: {
										__rl: true,
										value: 'mycontainer',
										mode: 'list',
									},
									limit: 1,
									options: {
										fields: [
											'copy',
											'deleted',
											'deletedwithversions',
											'immutabilitypolicy',
											'metadata',
											'legalhold',
											'versions',
											'uncommittedblobs',
											'tags',
											'snapshots',
											'permissions',
										],
										filter: ['deleted', 'files', 'directories'],
										upn: true,
									},
									requestOptions: {},
								},
								type: 'n8n-nodes-base.azureStorage',
								typeVersion: 1,
								position: [660, 0],
								id: 'ab1b6258-5c75-4893-90bf-ef591264420c',
								name: 'Azure Storage',
								credentials: {
									azureStorageSharedKeyApi: {
										id: 'VPmcFM58eDDexWQL',
										name: 'Azure Storage account',
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
						'Azure Storage': [azureStorageNodeResponse.blobGetAll],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/mycontainer?restype=container&comp=list&maxresults=1&include=copy%2Cdeleted%2Cdeletedwithversions%2Cimmutabilitypolicy%2Cmetadata%2Clegalhold%2Cversions%2Cuncommittedblobs%2Ctags%2Csnapshots%2Cpermissions&showonly=deleted%2Cfiles%2Cdirectories',
							statusCode: 200,
							responseBody: azureStorageApiResponse.blobList.body,
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
