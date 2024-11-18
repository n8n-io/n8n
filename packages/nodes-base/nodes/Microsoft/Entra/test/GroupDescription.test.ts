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

	describe('Group description', () => {
		const tests: WorkflowTestData[] = [
			{
				description: 'should create group',
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
									resource: 'group',
									operation: 'create',
									displayName: 'Group Display Name',
									mailEnabled: true,
									mailNickname: 'MailNickname',
									securityEnabled: true,
									additionalFields: {
										allowExternalSenders: true,
										assignedLabels: {
											labelValues: {
												displayName: 'Label Name',
												labelId: 'label123',
											},
										},
										autoSubscribeNewMembers: true,
										description: 'Group Description',
										preferredDataLocation: 'Preferred Data Location',
										uniqueName: 'UniqueName',
										visibility: 'Public',
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
						'Micosoft Entra ID': [microsoftEntraNodeResponse.createGroup],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'post',
							path: '/groups',
							statusCode: 201,
							requestBody: {
								displayName: 'Group Display Name',
								mailEnabled: true,
								mailNickname: 'MailNickname',
								securityEnabled: true,
							},
							responseBody: microsoftEntraApiResponse.postGroup,
						},
						{
							method: 'patch',
							path: `/groups/${microsoftEntraApiResponse.postGroup.id}`,
							statusCode: 204,
							requestBody: {
								assignedLabels: [
									{
										displayName: 'Label Name',
										labelId: 'label123',
									},
								],
								description: 'Group Description',
								preferredDataLocation: 'Preferred Data Location',
								uniqueName: 'UniqueName',
								visibility: 'Public',
							},
							responseBody: {},
						},
						{
							method: 'patch',
							path: `/groups/${microsoftEntraApiResponse.postGroup.id}`,
							statusCode: 204,
							requestBody: {
								allowExternalSenders: true,
								autoSubscribeNewMembers: true,
							},
							responseBody: {},
						},
					],
				},
			},
			{
				description: 'should delete group',
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
									resource: 'group',
									operation: 'delete',
									group: {
										__rl: true,
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
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
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b',
							statusCode: 204,
							responseBody: {},
						},
					],
				},
			},
			{
				description: 'should get group',
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
									resource: 'group',
									operation: 'get',
									group: {
										__rl: true,
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
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
						'Micosoft Entra ID': [microsoftEntraNodeResponse.getGroup],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b',
							statusCode: 200,
							responseBody: microsoftEntraApiResponse.getGroup,
						},
					],
				},
			},
			{
				description: 'should get group with options',
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
									resource: 'group',
									operation: 'get',
									group: {
										__rl: true,
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
										mode: 'id',
									},
									options: {
										select: [
											'assignedLabels',
											'assignedLicenses',
											'createdDateTime',
											'classification',
											'deletedDateTime',
											'description',
											'displayName',
											'expirationDateTime',
											'groupTypes',
											'visibility',
											'unseenCount',
											'theme',
											'uniqueName',
											'serviceProvisioningErrors',
											'securityIdentifier',
											'renewedDateTime',
											'securityEnabled',
											'autoSubscribeNewMembers',
											'allowExternalSenders',
											'licenseProcessingState',
											'isManagementRestricted',
											'isSubscribedByMail',
											'isAssignableToRole',
											'id',
											'hideFromOutlookClients',
											'hideFromAddressLists',
											'onPremisesProvisioningErrors',
											'onPremisesSecurityIdentifier',
											'onPremisesSamAccountName',
											'onPremisesNetBiosName',
											'onPremisesSyncEnabled',
											'preferredDataLocation',
											'preferredLanguage',
											'proxyAddresses',
											'onPremisesLastSyncDateTime',
											'onPremisesDomainName',
											'membershipRuleProcessingState',
											'membershipRule',
											'mailNickname',
											'mailEnabled',
											'mail',
										],
										includeMembers: true,
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
						'Micosoft Entra ID': [microsoftEntraNodeResponse.getGroupWithProperties],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b?$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,unseenCount,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,autoSubscribeNewMembers,allowExternalSenders,licenseProcessingState,isManagementRestricted,isSubscribedByMail,isAssignableToRole,id,hideFromOutlookClients,hideFromAddressLists,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail&$expand=members',
							statusCode: 200,
							responseBody: microsoftEntraApiResponse.getGroupWithProperties,
						},
					],
				},
			},
			{
				description: 'should get all groups',
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
									resource: 'group',
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
						'Micosoft Entra ID': [new Array(102).fill(microsoftEntraNodeResponse.getGroup[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/groups',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/groups?$filter=&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
								value: new Array(100).fill(microsoftEntraApiResponse.getGroup),
							},
						},
						{
							method: 'get',
							path: '/groups?$filter=&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								value: new Array(2).fill(microsoftEntraApiResponse.getGroup),
							},
						},
					],
				},
			},
			{
				description: 'should get limit 10 groups',
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
									resource: 'group',
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
						'Micosoft Entra ID': [new Array(10).fill(microsoftEntraNodeResponse.getGroup[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/groups?$top=10',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/groups?$top=10&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
								value: new Array(10).fill(microsoftEntraApiResponse.getGroup),
							},
						},
					],
				},
			},
			{
				description: 'should get all groups with options and filter',
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
									resource: 'group',
									operation: 'getAll',
									returnAll: true,
									filters: {
										filter: "startswith(displayName,'group')",
									},
									options: {
										select: [
											'assignedLabels',
											'assignedLicenses',
											'createdDateTime',
											'classification',
											'deletedDateTime',
											'description',
											'displayName',
											'expirationDateTime',
											'groupTypes',
											'visibility',
											'unseenCount',
											'theme',
											'uniqueName',
											'serviceProvisioningErrors',
											'securityIdentifier',
											'renewedDateTime',
											'securityEnabled',
											'autoSubscribeNewMembers',
											'allowExternalSenders',
											'licenseProcessingState',
											'isManagementRestricted',
											'isSubscribedByMail',
											'isAssignableToRole',
											'id',
											'hideFromOutlookClients',
											'hideFromAddressLists',
											'onPremisesProvisioningErrors',
											'onPremisesSecurityIdentifier',
											'onPremisesSamAccountName',
											'onPremisesNetBiosName',
											'onPremisesSyncEnabled',
											'preferredDataLocation',
											'preferredLanguage',
											'proxyAddresses',
											'onPremisesLastSyncDateTime',
											'onPremisesDomainName',
											'membershipRuleProcessingState',
											'membershipRule',
											'mailNickname',
											'mailEnabled',
											'mail',
										],
										includeMembers: true,
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
							new Array(102).fill(microsoftEntraNodeResponse.getGroupWithProperties[0]),
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: "/groups?$filter=startswith(displayName,'group')&$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,unseenCount,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,autoSubscribeNewMembers,allowExternalSenders,licenseProcessingState,isManagementRestricted,isSubscribedByMail,isAssignableToRole,id,hideFromOutlookClients,hideFromAddressLists,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail&",
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								'@odata.nextLink':
									"https://graph.microsoft.com/v1.0/groups?$filter=startswith(displayName,'group')&$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,unseenCount,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,autoSubscribeNewMembers,allowExternalSenders,licenseProcessingState,isManagementRestricted,isSubscribedByMail,isAssignableToRole,id,hideFromOutlookClients,hideFromAddressLists,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
								value: new Array(100).fill(microsoftEntraApiResponse.getGroupWithProperties),
							},
						},
						{
							method: 'get',
							path: "/groups?$filter=startswith(displayName,'group')&$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,unseenCount,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,autoSubscribeNewMembers,allowExternalSenders,licenseProcessingState,isManagementRestricted,isSubscribedByMail,isAssignableToRole,id,hideFromOutlookClients,hideFromAddressLists,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								value: new Array(2).fill(microsoftEntraApiResponse.getGroupWithProperties),
							},
						},
					],
				},
			},
			{
				description: 'should update group',
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
									resource: 'group',
									operation: 'update',
									group: {
										__rl: true,
										value: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
										mode: 'id',
									},
									updateFields: {
										allowExternalSenders: true,
										assignedLabels: {
											labelValues: {
												displayName: 'Label Name',
												labelId: 'label123',
											},
										},
										autoSubscribeNewMembers: true,
										description: 'Group Description',
										displayName: 'Group Display Name',
										mailNickname: 'MailNickname',
										preferredDataLocation: 'Preferred Data Location',
										securityEnabled: true,
										uniqueName: 'UniqueName',
										visibility: 'Public',
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
							method: 'patch',
							path: `/groups/${microsoftEntraApiResponse.postGroup.id}`,
							statusCode: 204,
							requestBody: {
								assignedLabels: [
									{
										displayName: 'Label Name',
										labelId: 'label123',
									},
								],
								description: 'Group Description',
								displayName: 'Group Display Name',
								mailNickname: 'MailNickname',
								preferredDataLocation: 'Preferred Data Location',
								securityEnabled: true,
								uniqueName: 'UniqueName',
								visibility: 'Public',
							},
							responseBody: {},
						},
						{
							method: 'patch',
							path: `/groups/${microsoftEntraApiResponse.postGroup.id}`,
							statusCode: 204,
							requestBody: {
								allowExternalSenders: true,
								autoSubscribeNewMembers: true,
							},
							responseBody: {},
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
			expect(result.finished).toEqual(true);
		});
	});
});
