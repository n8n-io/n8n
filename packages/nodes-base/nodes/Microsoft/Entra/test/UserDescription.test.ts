import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type WorkflowTestData } from 'n8n-workflow';

import { microsoftEntraApiResponse, microsoftEntraNodeResponse } from './mocks';

describe('Microsoft Entra Node', () => {
	const testHarness = new NodeTestHarness();
	const baseUrl = 'https://graph.microsoft.com/v1.0';

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
								name: 'When clicking ‘Execute workflow’',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.addUserToGroup],
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
								name: 'When clicking ‘Execute workflow’',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									operation: 'create',
									displayName: 'John Doe',
									mailNickname: 'johndoe',
									password: 'Test!12345',
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
										forceChangePassword: 'forceChangePasswordNextSignInWithMfa',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.createUser],
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
								passwordProfile: {
									forceChangePasswordNextSignInWithMfa: true,
								},
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
								name: 'When clicking ‘Execute workflow’',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.deleteUser],
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
								name: 'When clicking ‘Execute workflow’',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.getUser],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users/87d349ed-44d7-43e1-9a83-5f2406dee5bd?$select=id,accountEnabled,ageGroup,assignedLicenses,assignedPlans,authorizationInfo,businessPhones,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,employeeType,externalUserState,externalUserStateChangeDateTime,faxNumber,givenName,identities,imAddresses,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mail,mailNickname,mobilePhone,officeLocation,onPremisesDistinguishedName,onPremisesDomainName,onPremisesExtensionAttributes,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSamAccountName,onPremisesSecurityIdentifier,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,postalCode,preferredDataLocation,preferredLanguage,provisionedPlans,proxyAddresses,securityIdentifier,serviceProvisioningErrors,showInAddressList,signInSessionsValidFromDateTime,state,streetAddress,surname,usageLocation,userPrincipalName,userType',
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
								name: 'When clicking ‘Execute workflow’',
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
									output: 'fields',
									fields: [
										'aboutMe',
										'accountEnabled',
										'ageGroup',
										'assignedLicenses',
										'assignedPlans',
										'authorizationInfo',
										'birthday',
										'businessPhones',
										'city',
										'companyName',
										'consentProvidedForMinor',
										'country',
										'createdDateTime',
										'creationType',
										'customSecurityAttributes',
										'deletedDateTime',
										'department',
										'displayName',
										'employeeHireDate',
										'employeeId',
										'employeeLeaveDateTime',
										'employeeOrgData',
										'externalUserStateChangeDateTime',
										'externalUserState',
										'employeeType',
										'faxNumber',
										'givenName',
										'hireDate',
										'identities',
										'imAddresses',
										'interests',
										'isManagementRestricted',
										'isResourceAccount',
										'jobTitle',
										'lastPasswordChangeDateTime',
										'legalAgeGroupClassification',
										'licenseAssignmentStates',
										'mail',
										'mailNickname',
										'mobilePhone',
										'mySite',
										'officeLocation',
										'onPremisesDistinguishedName',
										'onPremisesDomainName',
										'onPremisesExtensionAttributes',
										'onPremisesImmutableId',
										'onPremisesLastSyncDateTime',
										'onPremisesProvisioningErrors',
										'onPremisesSamAccountName',
										'onPremisesSecurityIdentifier',
										'onPremisesSyncEnabled',
										'onPremisesUserPrincipalName',
										'otherMails',
										'passwordPolicies',
										'passwordProfile',
										'pastProjects',
										'postalCode',
										'preferredDataLocation',
										'preferredLanguage',
										'preferredName',
										'provisionedPlans',
										'proxyAddresses',
										'userType',
										'userPrincipalName',
										'usageLocation',
										'surname',
										'streetAddress',
										'state',
										'skills',
										'signInSessionsValidFromDateTime',
										'showInAddressList',
										'serviceProvisioningErrors',
										'securityIdentifier',
										'schools',
										'responsibilities',
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
							path: '/users/87d349ed-44d7-43e1-9a83-5f2406dee5bd?$select=aboutMe,accountEnabled,ageGroup,assignedLicenses,assignedPlans,authorizationInfo,birthday,businessPhones,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,externalUserStateChangeDateTime,externalUserState,employeeType,faxNumber,givenName,hireDate,identities,imAddresses,interests,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mail,mailNickname,mobilePhone,mySite,officeLocation,onPremisesDistinguishedName,onPremisesDomainName,onPremisesExtensionAttributes,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSamAccountName,onPremisesSecurityIdentifier,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,pastProjects,postalCode,preferredDataLocation,preferredLanguage,preferredName,provisionedPlans,proxyAddresses,userType,userPrincipalName,usageLocation,surname,streetAddress,state,skills,signInSessionsValidFromDateTime,showInAddressList,serviceProvisioningErrors,securityIdentifier,schools,responsibilities,id',
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
				description: 'should get all users with simple output',
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
									resource: 'user',
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
						'Microsoft Entra ID': [new Array(102).fill(microsoftEntraNodeResponse.getUser[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users?$select=id,createdDateTime,displayName,userPrincipalName,mail,mailNickname,securityIdentifier',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/users?$select=id,createdDateTime,displayName,userPrincipalName,mail,mailNickname,securityIdentifier&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
								value: new Array(100).fill(microsoftEntraApiResponse.getUser),
							},
						},
						{
							method: 'get',
							path: '/users?$select=id,createdDateTime,displayName,userPrincipalName,mail,mailNickname,securityIdentifier&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
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
				description: 'should get limit 10 users with raw output',
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
									resource: 'user',
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
						'Microsoft Entra ID': [new Array(10).fill(microsoftEntraNodeResponse.getUser[0])],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/users?$top=10&$select=id,accountEnabled,ageGroup,assignedLicenses,assignedPlans,authorizationInfo,businessPhones,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,employeeType,externalUserState,externalUserStateChangeDateTime,faxNumber,givenName,identities,imAddresses,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mail,mailNickname,mobilePhone,officeLocation,onPremisesDistinguishedName,onPremisesDomainName,onPremisesExtensionAttributes,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSamAccountName,onPremisesSecurityIdentifier,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,postalCode,preferredDataLocation,preferredLanguage,provisionedPlans,proxyAddresses,securityIdentifier,serviceProvisioningErrors,showInAddressList,signInSessionsValidFromDateTime,state,streetAddress,surname,usageLocation,userPrincipalName,userType',
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								'@odata.nextLink':
									'https://graph.microsoft.com/v1.0/users?$top=10&$select=id,accountEnabled,ageGroup,assignedLicenses,assignedPlans,authorizationInfo,businessPhones,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,employeeType,externalUserState,externalUserStateChangeDateTime,faxNumber,givenName,identities,imAddresses,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mail,mailNickname,mobilePhone,officeLocation,onPremisesDistinguishedName,onPremisesDomainName,onPremisesExtensionAttributes,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSamAccountName,onPremisesSecurityIdentifier,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,postalCode,preferredDataLocation,preferredLanguage,provisionedPlans,proxyAddresses,securityIdentifier,serviceProvisioningErrors,showInAddressList,signInSessionsValidFromDateTime,state,streetAddress,surname,usageLocation,userPrincipalName,userType&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA',
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
								name: 'When clicking ‘Execute workflow’',
								type: 'n8n-nodes-base.manualTrigger',
								position: [820, 380],
								typeVersion: 1,
							},
							{
								parameters: {
									resource: 'user',
									operation: 'getAll',
									returnAll: true,
									filter: "startswith(displayName,'user')",
									output: 'fields',
									fields: [
										'accountEnabled',
										'ageGroup',
										'assignedLicenses',
										'assignedPlans',
										'businessPhones',
										'authorizationInfo',
										'city',
										'companyName',
										'consentProvidedForMinor',
										'country',
										'createdDateTime',
										'creationType',
										'customSecurityAttributes',
										'deletedDateTime',
										'department',
										'displayName',
										'employeeHireDate',
										'employeeId',
										'employeeLeaveDateTime',
										'employeeOrgData',
										'employeeType',
										'externalUserState',
										'externalUserStateChangeDateTime',
										'faxNumber',
										'givenName',
										'identities',
										'imAddresses',
										'isManagementRestricted',
										'isResourceAccount',
										'jobTitle',
										'lastPasswordChangeDateTime',
										'legalAgeGroupClassification',
										'licenseAssignmentStates',
										'mailNickname',
										'mail',
										'mobilePhone',
										'officeLocation',
										'onPremisesDistinguishedName',
										'onPremisesExtensionAttributes',
										'onPremisesDomainName',
										'onPremisesImmutableId',
										'onPremisesLastSyncDateTime',
										'onPremisesProvisioningErrors',
										'onPremisesSecurityIdentifier',
										'onPremisesSamAccountName',
										'onPremisesSyncEnabled',
										'onPremisesUserPrincipalName',
										'otherMails',
										'passwordPolicies',
										'passwordProfile',
										'postalCode',
										'preferredDataLocation',
										'preferredLanguage',
										'provisionedPlans',
										'proxyAddresses',
										'signInSessionsValidFromDateTime',
										'showInAddressList',
										'serviceProvisioningErrors',
										'securityIdentifier',
										'state',
										'streetAddress',
										'surname',
										'usageLocation',
										'userPrincipalName',
										'userType',
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
							path: "/users?$filter=startswith(displayName,'user')&$select=accountEnabled,ageGroup,assignedLicenses,assignedPlans,businessPhones,authorizationInfo,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,employeeType,externalUserState,externalUserStateChangeDateTime,faxNumber,givenName,identities,imAddresses,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mailNickname,mail,mobilePhone,officeLocation,onPremisesDistinguishedName,onPremisesExtensionAttributes,onPremisesDomainName,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,postalCode,preferredDataLocation,preferredLanguage,provisionedPlans,proxyAddresses,signInSessionsValidFromDateTime,showInAddressList,serviceProvisioningErrors,securityIdentifier,state,streetAddress,surname,usageLocation,userPrincipalName,userType,id",
							statusCode: 200,
							responseBody: {
								'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
								'@odata.nextLink':
									"https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'user')&$select=accountEnabled,ageGroup,assignedLicenses,assignedPlans,businessPhones,authorizationInfo,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,employeeType,externalUserState,externalUserStateChangeDateTime,faxNumber,givenName,identities,imAddresses,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mailNickname,mail,mobilePhone,officeLocation,onPremisesDistinguishedName,onPremisesExtensionAttributes,onPremisesDomainName,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,postalCode,preferredDataLocation,preferredLanguage,provisionedPlans,proxyAddresses,signInSessionsValidFromDateTime,showInAddressList,serviceProvisioningErrors,securityIdentifier,state,streetAddress,surname,usageLocation,userPrincipalName,userType,id&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
								value: new Array(100).fill({
									'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(id)/$entity',
									id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
								}),
							},
						},
						{
							method: 'get',
							path: "/users?$filter=startswith(displayName,'user')&$select=accountEnabled,ageGroup,assignedLicenses,assignedPlans,businessPhones,authorizationInfo,city,companyName,consentProvidedForMinor,country,createdDateTime,creationType,customSecurityAttributes,deletedDateTime,department,displayName,employeeHireDate,employeeId,employeeLeaveDateTime,employeeOrgData,employeeType,externalUserState,externalUserStateChangeDateTime,faxNumber,givenName,identities,imAddresses,isManagementRestricted,isResourceAccount,jobTitle,lastPasswordChangeDateTime,legalAgeGroupClassification,licenseAssignmentStates,mailNickname,mail,mobilePhone,officeLocation,onPremisesDistinguishedName,onPremisesExtensionAttributes,onPremisesDomainName,onPremisesImmutableId,onPremisesLastSyncDateTime,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesSyncEnabled,onPremisesUserPrincipalName,otherMails,passwordPolicies,passwordProfile,postalCode,preferredDataLocation,preferredLanguage,provisionedPlans,proxyAddresses,signInSessionsValidFromDateTime,showInAddressList,serviceProvisioningErrors,securityIdentifier,state,streetAddress,surname,usageLocation,userPrincipalName,userType,id&$skiptoken=RFNwdAIAAQAAACpHcm91cF9jYzEzY2Y5Yy1lOWNiLTQ3NjUtODMzYS05MDIzZDhhMjhlZjMqR3JvdXBfY2MxM2NmOWMtZTljYi00NzY1LTgzM2EtOTAyM2Q4YTI4ZWYzAAAAAAAAAAAAAAA",
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
								name: 'When clicking ‘Execute workflow’',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.removeUserFromGroup],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'delete',
							path: '/groups/a8eb60e3-0145-4d7e-85ef-c6259784761b/members/87d349ed-44d7-43e1-9a83-5f2406dee5bd/$ref',
							statusCode: 204,
							responseBody: {},
						},
					],
				},
			},
			{
				description: 'should update user',
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
									resource: 'user',
									operation: 'update',
									user: {
										__rl: true,
										value: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
										mode: 'id',
									},
									updateFields: {
										aboutMe: 'About me',
										accountEnabled: true,
										ageGroup: 'Adult',
										birthday: '2024-11-12T00:00:00Z',
										businessPhones: '0123456789',
										city: 'New York',
										companyName: 'Contoso',
										consentProvidedForMinor: 'Granted',
										country: 'US',
										department: 'IT',
										displayName: 'Group Display Name',
										employeeId: 'employee-id-123',
										employeeType: 'Contractor',
										forceChangePassword: 'forceChangePasswordNextSignInWithMfa',
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
										mailNickname: 'MailNickname',
										mobilePhone: '+123456789',
										mySite: 'My Site',
										officeLocation: 'New York',
										onPremisesImmutableId: 'premiseid123',
										otherMails: ['johndoe2@contoso.com', 'johndoe3@contoso.com'],
										password: 'Test!12345',
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
										userPrincipalName: 'johndoe@contoso.com',
										userType: 'Guest',
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
						'Microsoft Entra ID': [microsoftEntraNodeResponse.updateUser],
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'patch',
							path: `/users/${microsoftEntraApiResponse.postUser.id}`,
							statusCode: 204,
							requestBody: {
								accountEnabled: true,
								ageGroup: 'Adult',
								businessPhones: ['0123456789'],
								city: 'New York',
								companyName: 'Contoso',
								consentProvidedForMinor: 'Granted',
								country: 'US',
								department: 'IT',
								displayName: 'Group Display Name',
								employeeId: 'employee-id-123',
								employeeType: 'Contractor',
								givenName: 'John',
								employeeOrgData: {
									costCenter: 'Cost Center 1',
									division: 'Division 1',
								},
								jobTitle: 'Project manager',
								surname: 'Doe',
								mail: 'johndoe@contoso.com',
								mailNickname: 'MailNickname',
								mobilePhone: '+123456789',
								officeLocation: 'New York',
								onPremisesImmutableId: 'premiseid123',
								otherMails: ['johndoe2@contoso.com', 'johndoe3@contoso.com'],
								passwordProfile: {
									password: 'Test!12345',
									forceChangePasswordNextSignInWithMfa: true,
								},
								passwordPolicies: 'DisablePasswordExpiration,DisableStrongPassword',
								postalCode: '0123456',
								preferredLanguage: 'en-US',
								state: 'New York',
								streetAddress: 'Street 123',
								usageLocation: 'US',
								userPrincipalName: 'johndoe@contoso.com',
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
		];

		for (const testData of tests) {
			testHarness.setupTest(testData);
		}
	});
});
