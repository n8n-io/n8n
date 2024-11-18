import { NodeConnectionType } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import { microsoftEntraApiResponse, microsoftEntraNodeResponse } from './mocks';

describe('Gong Node', () => {
	const baseUrl = 'https://graph.microsoft.com/v1.0';

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('User description', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should add user to group',
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
									operation: 'addGroup',
									group: {
										__rl: true,
										mode: 'id',
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
									},
									user: {
										__rl: true,
										mode: 'id',
										value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
									},
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
						'Micosoft Entra ID': [[{ json: {} }]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b/members/$ref',
							statusCode: 204,
							requestBody: {
								'@odata.id':
									'https://graph.microsoft.com/v1.0/directoryObjects/87d349ed-44d7-43e1-9a83-5f2406dee5bd',
							},
							responseBody: {},
						},
					],
				},
			},
			{
				description: 'should create user',
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
									operation: 'create',
									displayName: 'John Doe',
									mailNickname: 'johndoe',
									passwordProfile: {
										passwordProfileValues: {
											password: 'Test!12345',
										},
									},
									userPrincipalName: 'johndoe@contoso.com',
									additionalFields: {
										aboutMe: 'About me',
										ageGroup: 'Adult',
										birthday: '2024-11-12T00:00:00Z',
										businessPhones: '0123456789',
										city: 'New York',
										companyName: 'Contoso',
										consentProvidedForMinor: 'Granted',
										country: 'US',
										department: 'IT',
										employeeId: 'employee-id-123',
										employeeType: 'Contractor',
										givenName: 'John',
										employeeHireDate: '2024-11-13T00:00:00Z',
										employeeLeaveDateTime: '2024-11-18T00:00:00Z',
										employeeOrgData: {
											employeeOrgValues: {
												costCenter: 'Cost Center 1',
												division: 'Division 1',
											},
										},
										interests: ['interest1', 'interest2'],
										jobTitle: 'Project manager',
										surname: 'Doe',
										mail: 'johndoe@contoso.com',
										mobilePhone: '+123456789',
										mySite: 'My Site',
										officeLocation: 'New York',
										onPremisesImmutableId: 'premiseid123',
										otherMails: ['johndoe2@contoso.com', 'johndoe3@contoso.com'],
										passwordPolicies: ['DisablePasswordExpiration', 'DisableStrongPassword'],
										pastProjects: ['project1', 'project2'],
										postalCode: '0123456',
										preferredLanguage: 'en-US',
										responsibilities: ['responsibility1', 'responsibility2'],
										schools: ['school1', 'school2'],
										skills: ['skill1', 'skill2'],
										state: 'New York',
										streetAddress: 'Street 123',
										usageLocation: 'US',
										userType: 'Guest',
									},
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
						'Micosoft Entra ID': [microsoftEntraNodeResponse.createUser],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/users',
							statusCode: 201,
							requestBody: {
								accountEnabled: true,
								displayName: 'John Doe',
								mailNickname: 'johndoe',
								passwordProfile: {
									forceChangePasswordNextSignIn: true,
									forceChangePasswordNextSignInWithMfa: true,
									password: 'Test!12345',
								},
								userPrincipalName: 'johndoe@contoso.com',
							},
							responseBody: microsoftEntraApiResponse.postUser,
						},
						{
							method: 'patch',
							path: `/users/${microsoftEntraApiResponse.postUser.id}`,
							statusCode: 204,
							requestBody: {
								ageGroup: 'Adult',
								businessPhones: ['0123456789'],
								city: 'New York',
								companyName: 'Contoso',
								consentProvidedForMinor: 'Granted',
								country: 'US',
								department: 'IT',
								employeeId: 'employee-id-123',
								employeeType: 'Contractor',
								givenName: 'John',
								employeeHireDate: '2024-11-13T00:00:00.000Z',
								employeeLeaveDateTime: '2024-11-18T00:00:00.000Z',
								employeeOrgData: {
									costCenter: 'Cost Center 1',
									division: 'Division 1',
								},
								jobTitle: 'Project manager',
								surname: 'Doe',
								mail: 'johndoe@contoso.com',
								mobilePhone: '+123456789',
								officeLocation: 'New York',
								onPremisesImmutableId: 'premiseid123',
								otherMails: ['johndoe2@contoso.com', 'johndoe3@contoso.com'],
								passwordPolicies: 'DisablePasswordExpiration,DisableStrongPassword',
								postalCode: '0123456',
								preferredLanguage: 'en-US',
								state: 'New York',
								streetAddress: 'Street 123',
								usageLocation: 'US',
								userType: 'Guest',
							},
							responseBody: {},
						},
						{
							method: 'patch',
							path: `/users/${microsoftEntraApiResponse.postUser.id}`,
							statusCode: 204,
							requestBody: {
								aboutMe: 'About me',
								birthday: '2024-11-12T00:00:00.000Z',
								interests: ['interest1', 'interest2'],
								mySite: 'My Site',
								pastProjects: ['project1', 'project2'],
								responsibilities: ['responsibility1', 'responsibility2'],
								schools: ['school1', 'school2'],
								skills: ['skill1', 'skill2'],
							},
							responseBody: {},
						},
					],
				},
			},
			{
				description: 'should delete user',
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
									operation: 'delete',
									user: {
										__rl: true,
										value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
										mode: 'id',
									},
									options: {},
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
						'Micosoft Entra ID': [[{ json: {} }]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'delete',
							path: '/users/87d349ed-44d7-43e1-9a83-5f2406dee5bd',
							statusCode: 204,
							responseBody: {},
						},
					],
				},
			},
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
									operation: 'get',
									user: {
										__rl: true,
										value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
										mode: 'id',
									},
									options: {},
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
						'Micosoft Entra ID': [microsoftEntraNodeResponse.getUser],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users/87d349ed-44d7-43e1-9a83-5f2406dee5bd',
							statusCode: 200,
							responseBody: microsoftEntraApiResponse.getUser,
						},
					],
				},
			},
			{
				description: 'should get user with options',
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
									operation: 'get',
									user: {
										__rl: true,
										value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
										mode: 'id',
									},
									options: {
										select: ['id'],
									},
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
						'Micosoft Entra ID': [
							[
								{
									json: {
										'@odata.context':
											'https://graph.microsoft.com/v1.0/$metadata#users(id)/$entity',
										id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
									},
								},
							],
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users/87d349ed-44d7-43e1-9a83-5f2406dee5bd?$select=id',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(id)/$entity',
								id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
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
									filters: {},
									options: {},
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
						'Micosoft Entra ID': [new Array(102).fill(microsoftEntraNodeResponse.getUser[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/users?$filter=&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
								value: new Array(100).fill(microsoftEntraApiResponse.getUser),
							},
						},
						{
							method: 'get',
							path: '/users?$filter=&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								value: new Array(2).fill(microsoftEntraApiResponse.getUser),
							},
						},
					],
				},
			},
			{
				description: 'should get limit 10 users',
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
									limit: 10,
									filters: {},
									options: {},
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
						'Micosoft Entra ID': [new Array(10).fill(microsoftEntraNodeResponse.getUser[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users?$top=10',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/users?$top=10&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
								value: new Array(10).fill(microsoftEntraApiResponse.getUser),
							},
						},
					],
				},
			},
			{
				description: 'should get all users with options and filter',
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
										filter: "startswith(displayName,'user')",
									},
									options: {
										select: ['id'],
									},
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
						'Micosoft Entra ID': [
							new Array(102).fill({
								json: {
									'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(id)/$entity',
									id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
								},
							}),
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: "/users?$filter=startswith(displayName,'user')&$select=id",
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								'@odata.nextLink':
									"https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'user')&$select=id&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
								value: new Array(100).fill({
									'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(id)/$entity',
									id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
								}),
							},
						},
						{
							method: 'get',
							path: "/users?$filter=startswith(displayName,'user')&$select=id&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								value: new Array(2).fill({
									'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(id)/$entity',
									id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
								}),
							},
						},
					],
				},
			},
			{
				description: 'should remove user from group',
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
									operation: 'removeGroup',
									group: {
										__rl: true,
										mode: 'id',
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
									},
									user: {
										__rl: true,
										mode: 'id',
										value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
									},
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
						'Micosoft Entra ID': [[{ json: {} }]],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'delete',
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b/members/87d349ed-44d7-43e1-9a83-5f2406dee5bd/$ref',
							statusCode: 204,
							requestBody: {},
							responseBody: {},
						},
					],
				},
			},
			// {
			// 	description: 'should update user',
			// 	input: {
			// 		workflowData: {
			// 			nodes: [
			// 				{
			// 					parameters: {},
			// 					id: '416e4fc1-5055-4e61-854e-a6265256ac26',
			// 					name: "When clicking 'Test workflow'",
			// 					type: 'n8n-nodes-base.manualTrigger',
			// 					position: [820, 380],
			// 					typeVersion: 1,
			// 				},
			// 				{
			// 					parameters: {
			// 						resource: 'user',
			// 						operation: 'update',
			// 						user: {
			// 							__rl: true,
			// 							value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
			// 							mode: 'id',
			// 						},
			// 						updateFields: {
			// 							allowExternalSenders: true,
			// 							assignedLabels: {
			// 								labelValues: {
			// 									displayName: 'Label Name',
			// 									labelId: 'label123',
			// 								},
			// 							},
			// 							autoSubscribeNewMembers: true,
			// 							description: 'Group Description',
			// 							displayName: 'Group Display Name',
			// 							mailNickname: 'MailNickname',
			// 							preferredDataLocation: 'Preferred Data Location',
			// 							securityEnabled: true,
			// 							uniqueName: 'UniqueName',
			// 							visibility: 'Public',
			// 						},
			// 						requestOptions: {},
			// 					},
			// 					type: 'n8n-nodes-base.microsoftEntra',
			// 					typeVersion: 1,
			// 					position: [220, 0],
			// 					id: '3429f7f2-dfca-4b72-8913-43a582e96e66',
			// 					name: 'Micosoft Entra ID',
			// 					credentials: {
			// 						microsoftEntraOAuth2Api: {
			// 							id: 'Hot2KwSMSoSmMVqd',
			// 							name: 'Microsoft Entra ID (Azure Active Directory) account',
			// 						},
			// 					},
			// 				},
			// 			],
			// 			connections: {
			// 				"When clicking 'Test workflow'": {
			// 					main: [
			// 						[
			// 							{
			// 								node: 'Micosoft Entra ID',
			// 								type: NodeConnectionType.Main,
			// 								index: 0,
			// 							},
			// 						],
			// 					],
			// 				},
			// 			},
			// 		},
			// 	},
			// 	output: {
			// 		nodeExecutionOrder: ['Start'],
			// 		nodeData: {
			// 			'Micosoft Entra ID': [[{ json: {} }]],
			// 		},
			// 	},
			// 	nock: {
			// 		baseUrl,
			// 		mocks: [
			// 			{
			// 				method: 'patch',
			// 				path: `/users/${microsoftEntraApiResponse.postUser.id}`,
			// 				statusCode: 204,
			// 				requestBody: {
			// 					assignedLabels: [
			// 						{
			// 							displayName: 'Label Name',
			// 							labelId: 'label123',
			// 						},
			// 					],
			// 					description: 'Group Description',
			// 					displayName: 'Group Display Name',
			// 					mailNickname: 'MailNickname',
			// 					preferredDataLocation: 'Preferred Data Location',
			// 					securityEnabled: true,
			// 					uniqueName: 'UniqueName',
			// 					visibility: 'Public',
			// 				},
			// 				responseBody: {},
			// 			},
			// 			{
			// 				method: 'patch',
			// 				path: `/users/${microsoftEntraApiResponse.postGroup.id}`,
			// 				statusCode: 204,
			// 				requestBody: {
			// 					allowExternalSenders: true,
			// 					autoSubscribeNewMembers: true,
			// 				},
			// 				responseBody: {},
			// 			},
			// 		],
			// 	},
			// },
		];

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
});
