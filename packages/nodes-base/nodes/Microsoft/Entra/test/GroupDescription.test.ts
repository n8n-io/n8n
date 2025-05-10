import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type WorkflowTestData } from 'n8n-workflow';

import { microsoftEntraApiResponse, microsoftEntraNodeResponse } from './mocks';

describe('Microsoft Entra Node', () => {
	const baseUrl = 'https://graph.microsoft.com/v1.0';
	const testHarness = new NodeTestHarness();

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
								name: 'When clicking ‘Execute workflow’',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'group',
									operation: 'create',
									displayName: 'Group Display Name',
									groupType: 'Unified',
									mailEnabled: true,
									mailNickname: 'MailNickname',
									membershipType: 'DynamicMembership',
									securityEnabled: true,
									additionalFields: {
										isAssignableToRole: true,
										description: 'Group Description',
										membershipRule: 'department -eq "Marketing"',
										membershipRuleProcessingState: 'On',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.createGroup],
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
								mailNickname: 'MailNickname',
								mailEnabled: true,
								membershipRule: 'department -eq "Marketing"',
								membershipRuleProcessingState: 'On',
								securityEnabled: true,
								groupTypes: ['Unified', 'DynamicMembership'],
							},
							responseBody: microsoftEntraApiResponse.postGroup,
						},
						{
							method: 'patch',
							path: `/groups/${microsoftEntraApiResponse.postGroup.id}`,
							statusCode: 204,
							requestBody: {
								description: 'Group Description',
								preferredDataLocation: 'Preferred Data Location',
								uniqueName: 'UniqueName',
								visibility: 'Public',
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
								name: 'When clicking ‘Execute workflow’',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.deleteGroup],
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
								name: 'When clicking ‘Execute workflow’',
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
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b',
							statusCode: 200,
							responseBody: microsoftEntraApiResponse.getGroup,
						},
					],
				},
			},
			{
				description: 'should get group with fields output and members',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking ‘Execute workflow’',
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
									output: 'fields',
									fields: [
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
									options: {
										includeMembers: true,
									},
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.getGroupWithProperties],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b?$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,unseenCount,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,autoSubscribeNewMembers,allowExternalSenders,licenseProcessingState,isManagementRestricted,isSubscribedByMail,isAssignableToRole,id,hideFromOutlookClients,hideFromAddressLists,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail,id&$expand=members($select=id,accountEnabled,createdDateTime,displayName,employeeId,mail,securityIdentifier,userPrincipalName,userType)',
							statusCode: 200,
							responseBody: microsoftEntraApiResponse.getGroupWithProperties,
						},
					],
				},
			},
			{
				description: 'should get all groups with simple output',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking ‘Execute workflow’',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'group',
									operation: 'getAll',
									returnAll: true,
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
						'Microsoft Entra ID': [new Array(102).fill(microsoftEntraNodeResponse.getGroup[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/groups?$select=id,createdDateTime,description,displayName,mail,mailEnabled,mailNickname,securityEnabled,securityIdentifier,visibility',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/groups?$select=id,createdDateTime,description,displayName,mail,mailEnabled,mailNickname,securityEnabled,securityIdentifier,visibility&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
								value: new Array(100).fill(microsoftEntraApiResponse.getGroup),
							},
						},
						{
							method: 'get',
							path: '/groups?$select=id,createdDateTime,description,displayName,mail,mailEnabled,mailNickname,securityEnabled,securityIdentifier,visibility&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
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
				description: 'should get limit 10 groups with raw output',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: '416e4fc1-5055-4e61-854e-a6265256ac26',
								name: 'When clicking ‘Execute workflow’',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'group',
									operation: 'getAll',
									limit: 10,
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
						'Microsoft Entra ID': [new Array(10).fill(microsoftEntraNodeResponse.getGroup[0])],
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
								name: 'When clicking ‘Execute workflow’',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'group',
									operation: 'getAll',
									returnAll: true,
									filter: "startswith(displayName,'group')",
									output: 'fields',
									fields: [
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
										'theme',
										'uniqueName',
										'serviceProvisioningErrors',
										'securityIdentifier',
										'renewedDateTime',
										'securityEnabled',
										'licenseProcessingState',
										'isManagementRestricted',
										'isAssignableToRole',
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
							new Array(102).fill(microsoftEntraNodeResponse.getGroupWithProperties[0]),
						],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: "/groups?$filter=startswith(displayName,'group')&$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,licenseProcessingState,isManagementRestricted,isAssignableToRole,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail,id",
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
								'@odata.nextLink':
									"https://graph.microsoft.com/v1.0/groups?$filter=startswith(displayName,'group')&$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,licenseProcessingState,isManagementRestricted,isAssignableToRole,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail,id&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
								value: new Array(100).fill(microsoftEntraApiResponse.getGroupWithProperties),
							},
						},
						{
							method: 'get',
							path: "/groups?$filter=startswith(displayName,'group')&$select=assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,licenseProcessingState,isManagementRestricted,isAssignableToRole,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail,id&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
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
								name: 'When clicking ‘Execute workflow’',
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
										autoSubscribeNewMembers: true,
										description: 'Group Description',
										displayName: 'Group Display Name',
										mailNickname: 'MailNickname',
										membershipRule: 'department -eq "Marketing"',
										membershipRuleProcessingState: 'On',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.updateGroup],
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
								description: 'Group Description',
								displayName: 'Group Display Name',
								mailNickname: 'MailNickname',
								membershipRule: 'department -eq "Marketing"',
								membershipRuleProcessingState: 'On',
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

		for (const testData of tests) {
			testHarness.setupTest(testData);
		}
	});
});
