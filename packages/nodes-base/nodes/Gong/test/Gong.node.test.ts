import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import { gongApiResponse, gongNodeResponse } from './mocks';
import { FAKE_CREDENTIALS_DATA } from '../../../test/nodes/FakeCredentialsMap';

describe('Gong Node', () => {
	const baseUrl = 'https://api.gong.io';

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('Credentials', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should use correct credentials',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									operation: 'get',
									call: {
										__rl: true,
										value: '7782342274025937895',
										mode: 'id',
									},
									options: {},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong gongApi',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
							{
								parameters: {
									authentication: 'oAuth2',
									operation: 'get',
									call: {
										__rl: true,
										value: '7782342274025937896',
										mode: 'id',
									},
									options: {},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong gongOAuth2Api',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongOAuth2Api: {
										id: '2',
										name: 'Gong account2',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong gongApi',
											type: NodeConnectionType.Main,
											index: 0,
										},
									],
								],
							},
							'Gong gongApi': {
								main: [
									[
										{
											node: 'Gong gongOAuth2Api',
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
						'Gong gongApi': [[{ json: { metaData: gongNodeResponse.getCall[0].json.metaData } }]],
						'Gong gongOAuth2Api': [
							[{ json: { metaData: gongNodeResponse.getCall[0].json.metaData } }],
						],
					},
				},
			},
		];

		beforeAll(() => {
			jest
				.spyOn(Helpers.CredentialsHelper.prototype, 'authenticate')
				.mockImplementation(
					async (
						credentials: ICredentialDataDecryptedObject,
						typeName: string,
						requestParams: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> => {
						if (typeName === 'gongApi') {
							return {
								...requestParams,
								headers: {
									authorization:
										'basic ' +
										Buffer.from(`${credentials.accessKey}:${credentials.accessKeySecret}`).toString(
											'base64',
										),
								},
							};
						} else if (typeName === 'gongOAuth2Api') {
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

		nock(baseUrl)
			.post('/v2/calls/extensive', { filter: { callIds: ['7782342274025937895'] } })
			.matchHeader(
				'authorization',
				'basic ' +
					Buffer.from(
						`${FAKE_CREDENTIALS_DATA.gongApi.accessKey}:${FAKE_CREDENTIALS_DATA.gongApi.accessKeySecret}`,
					).toString('base64'),
			)
			.reply(200, {
				...gongApiResponse.postCallsExtensive,
				records: {},
				calls: [{ metaData: gongApiResponse.postCallsExtensive.calls[0].metaData }],
			})
			.post('/v2/calls/extensive', { filter: { callIds: ['7782342274025937896'] } })
			.matchHeader(
				'authorization',
				'bearer ' + FAKE_CREDENTIALS_DATA.gongOAuth2Api.oauthTokenData.access_token,
			)
			.reply(200, {
				...gongApiResponse.postCallsExtensive,
				records: {},
				calls: [{ metaData: gongApiResponse.postCallsExtensive.calls[0].metaData }],
			});

		const nodeTypes = Helpers.setup(tests);

		test.each(tests)('$description', async (testData) => {
			const { result } = await executeWorkflow(testData, nodeTypes);
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);
			expect(result.finished).toEqual(true);
		});
	});

	describe('Call description', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should get call with no options true',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									operation: 'get',
									call: {
										__rl: true,
										value: '7782342274025937895',
										mode: 'id',
									},
									options: {},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [[{ json: { metaData: gongNodeResponse.getCall[0].json.metaData } }]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 200,
							requestBody: { filter: { callIds: ['7782342274025937895'] } },
							responseBody: {
								...gongApiResponse.postCallsExtensive,
								records: {},
								calls: [{ metaData: gongApiResponse.postCallsExtensive.calls[0].metaData }],
							},
						},
					],
				},
			},
			{
				description: 'should get call with all options true',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									operation: 'get',
									call: {
										__rl: true,
										value: '7782342274025937895',
										mode: 'id',
									},
									options: {
										properties: [
											'pointsOfInterest',
											'transcript',
											'media',
											'brief',
											'publicComments',
											'highlights',
											'trackers',
											'topics',
											'structure',
											'parties',
											'callOutcome',
											'outline',
											'keyPoints',
										],
									},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [gongNodeResponse.getCall],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 200,
							requestBody: {
								filter: {
									callIds: ['7782342274025937895'],
								},
								contentSelector: {
									exposedFields: {
										content: {
											pointsOfInterest: true,
											brief: true,
											highlights: true,
											keyPoints: true,
											outline: true,
											callOutcome: true,
											structure: true,
											trackers: true,
											topics: true,
										},
										media: true,
										collaboration: {
											publicComments: true,
										},
										parties: true,
									},
								},
							},
							responseBody: {
								...gongApiResponse.postCallsExtensive,
								records: {},
							},
						},
						{
							method: 'post',
							path: '/v2/calls/transcript',
							statusCode: 200,
							requestBody: {
								filter: {
									callIds: ['7782342274025937895'],
								},
							},
							responseBody: gongApiResponse.postCallsTranscript,
						},
					],
				},
			},
			{
				description: 'should get all calls with filters',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									returnAll: true,
									filters: {
										fromDateTime: '2024-01-01T00:00:00Z',
										toDateTime: '2024-12-31T00:00:00Z',
										workspaceId: '3662366901393371750',
										callIds: "={{ ['3662366901393371750', '3662366901393371751'] }}",
										primaryUserIds: {
											__rl: true,
											value: '234599484848423',
											mode: 'id',
										},
									},
									options: {
										properties: ['parties', 'topics'],
									},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [gongNodeResponse.getAllCall],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 200,
							requestBody: {
								filter: {
									fromDateTime: '2024-01-01T00:00:00.000Z',
									toDateTime: '2024-12-31T00:00:00.000Z',
									workspaceId: '3662366901393371750',
									callIds: ['3662366901393371750', '3662366901393371751'],
									primaryUserIds: ['234599484848423'],
								},
								contentSelector: {
									exposedFields: {
										parties: true,
										content: {
											topics: true,
										},
									},
								},
								cursor: undefined,
							},
							responseBody: {
								...gongApiResponse.postCallsExtensive,
								calls: [
									{
										metaData: {
											...gongApiResponse.postCallsExtensive.calls[0].metaData,
											parties: [...gongApiResponse.postCallsExtensive.calls[0].parties],
											content: {
												topics: [...gongApiResponse.postCallsExtensive.calls[0].content.topics],
											},
										},
									},
								],
							},
						},
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 200,
							requestBody: {
								filter: {
									fromDateTime: '2024-01-01T00:00:00.000Z',
									toDateTime: '2024-12-31T00:00:00.000Z',
									workspaceId: '3662366901393371750',
									callIds: ['3662366901393371750', '3662366901393371751'],
									primaryUserIds: ['234599484848423'],
								},
								contentSelector: {
									exposedFields: {
										parties: true,
										content: {
											topics: true,
										},
									},
								},
								cursor:
									'eyJhbGciOiJIUzI1NiJ9.eyJjYWxsSWQiM1M30.6qKwpOcvnuweTZmFRzYdtjs_YwJphJU4QIwWFM',
							},
							responseBody: {
								...gongApiResponse.postCallsExtensive,
								records: {},
								calls: [
									{
										metaData: {
											...gongApiResponse.postCallsExtensive.calls[0].metaData,
											id: '7782342274025937896',
											url: 'https://app.gong.io/call?id=7782342274025937896',
										},
										parties: [...gongApiResponse.postCallsExtensive.calls[0].parties],
										content: {
											topics: [...gongApiResponse.postCallsExtensive.calls[0].content.topics],
										},
									},
								],
							},
						},
					],
				},
			},
			{
				description: 'should get limit 50 calls with no options and filters',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									filters: {},
									options: {},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [
							Array.from({ length: 50 }, () => ({ ...gongNodeResponse.getAllCallNoOptions[0] })),
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 200,
							requestBody: {
								filter: {},
							},
							responseBody: {
								...gongApiResponse.postCallsExtensive,
								calls: Array.from({ length: 100 }, () => ({
									metaData: { ...gongApiResponse.postCallsExtensive.calls[0].metaData },
								})),
							},
						},
					],
				},
			},
			{
				description: 'should return empty result if no calls found for user',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									filters: {
										primaryUserIds: {
											__rl: true,
											value: '234599484848423',
											mode: 'id',
										},
									},
									options: {},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [[{ json: {} }]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 404,
							requestBody: {
								filter: {
									primaryUserIds: ['234599484848423'],
								},
								cursor: undefined,
							},
							responseBody: {
								requestId: 'thrhbxbkqiw41ma1cl',
								errors: ['No calls found corresponding to the provided filters'],
							},
						},
					],
				},
			},
			{
				description: 'should handle error response',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									filters: {
										workspaceId: '623457276584335',
									},
									options: {},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/calls/extensive',
							statusCode: 404,
							requestBody: {
								filter: {
									workspaceId: '623457276584335',
								},
							},
							responseBody: {
								requestId: 'thrhbxbkqiw41ma1cl',
								errors: ['No calls found corresponding to the provided filters'],
							},
						},
					],
				},
			},
		];

		const nodeTypes = Helpers.setup(tests);

		test.each(tests)('$description', async (testData) => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			if (testData.description === 'should handle error response') {
				// Only matches error message
				expect(() => Helpers.getResultNodeData(result, testData)).toThrowError(
					'The resource you are requesting could not be found',
				);
				return;
			}

			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);
			expect(result.finished).toEqual(true);
		});
	});

	describe('User description', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should get user',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'user',
									user: {
										__rl: true,
										value: '234599484848423',
										mode: 'id',
									},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [gongNodeResponse.getUser],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/users/extensive',
							statusCode: 200,
							requestBody: { filter: { userIds: ['234599484848423'] } },
							responseBody: {
								...gongApiResponse.postUsersExtensive,
								records: {},
							},
						},
					],
				},
			},
			{
				description: 'should get all users',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'user',
									operation: 'getAll',
									returnAll: true,
									filters: {
										createdFromDateTime: '2024-01-01T00:00:00Z',
										createdToDateTime: '2024-12-31T00:00:00Z',
										userIds: '234599484848423, 234599484848424',
									},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [gongNodeResponse.getAllUser],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/users/extensive',
							statusCode: 200,
							requestBody: {
								filter: {
									createdFromDateTime: '2024-01-01T00:00:00.000Z',
									createdToDateTime: '2024-12-31T00:00:00.000Z',
									userIds: ['234599484848423', '234599484848424'],
								},
							},
							responseBody: gongApiResponse.postUsersExtensive,
						},
						{
							method: 'post',
							path: '/v2/users/extensive',
							statusCode: 200,
							requestBody: {
								filter: {
									createdFromDateTime: '2024-01-01T00:00:00.000Z',
									createdToDateTime: '2024-12-31T00:00:00.000Z',
									userIds: ['234599484848423', '234599484848424'],
								},
								cursor:
									'eyJhbGciOiJIUzI1NiJ9.eyJjYWxsSWQiM1M30.6qKwpOcvnuweTZmFRzYdtjs_YwJphJU4QIwWFM',
							},
							responseBody: {
								...gongApiResponse.postUsersExtensive,
								records: {},
								users: [{ ...gongApiResponse.postUsersExtensive.users[0], id: '234599484848424' }],
							},
						},
					],
				},
			},
			{
				description: 'should handle error response',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: "When clicking 'Test workflow'",
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'user',
									operation: 'getAll',
									filters: {
										userIds: '234599484848423',
									},
									requestOptions: {},
								},
								id: 'c87d72ec-0683-4e32-9829-5e6ea1d1ee7d',
								name: 'Gong',
								type: 'n8n-nodes-base.gong',
								typeVersion: 1,
								position: [1040, 380],
								credentials: {
									gongApi: {
										id: '1',
										name: 'Gong account',
									},
								},
							},
						],
						connections: {
							"When clicking 'Test workflow'": {
								main: [
									[
										{
											node: 'Gong',
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
						Gong: [],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/v2/users/extensive',
							statusCode: 404,
							requestBody: {
								filter: {
									userIds: ['234599484848423'],
								},
							},
							responseBody: {
								requestId: '26r8maav84ehguoddd7',
								errors: ['The following userIds were not found: 234599484848423'],
							},
						},
					],
				},
			},
		];

		const nodeTypes = Helpers.setup(tests);

		test.each(tests)('$description', async (testData) => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			if (testData.description === 'should handle error response') {
				expect(() => Helpers.getResultNodeData(result, testData)).toThrow(
					"The Users IDs don't match any existing user",
				);
				return;
			}

			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);
			expect(result.finished).toEqual(true);
		});
	});
});
