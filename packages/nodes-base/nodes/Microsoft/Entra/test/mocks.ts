/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */

export const microsoftEntraApiResponse = {
	postGroup: {
		'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups/$entity',
		id: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
		deletedDateTime: null,
		classification: null,
		createdDateTime: '2024-11-17T15:46:32Z',
		creationOptions: [],
		description: null,
		displayName: 'Group Display Name',
		expirationDateTime: null,
		groupTypes: ['DynamicMembership', 'Unified'],
		isAssignableToRole: true,
		mail: null,
		mailEnabled: true,
		mailNickname: 'MailNickname',
		membershipRule: 'department -eq "Marketing"',
		membershipRuleProcessingState: 'On',
		onPremisesDomainName: null,
		onPremisesLastSyncDateTime: null,
		onPremisesNetBiosName: null,
		onPremisesSamAccountName: null,
		onPremisesSecurityIdentifier: null,
		onPremisesSyncEnabled: null,
		preferredDataLocation: null,
		preferredLanguage: null,
		proxyAddresses: [],
		renewedDateTime: '2024-11-17T15:46:32Z',
		resourceBehaviorOptions: [],
		resourceProvisioningOptions: [],
		securityEnabled: true,
		securityIdentifier: 'S-1-12-1-2833998051-1300103493-633794437-460752023',
		theme: null,
		uniqueName: null,
		visibility: null,
		onPremisesProvisioningErrors: [],
		serviceProvisioningErrors: [],
	},

	getGroup: {
		'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups/$entity',
		id: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
		deletedDateTime: null,
		classification: null,
		createdDateTime: '2024-11-04T16:00:21Z',
		creationOptions: ['YammerProvisioning'],
		description: 'This is the default group for everyone in the network',
		displayName: 'All Company',
		expirationDateTime: null,
		groupTypes: ['Unified'],
		isAssignableToRole: null,
		mail: 'HRTaskforce@contoso.com',
		mailEnabled: true,
		mailNickname: 'allcompany',
		membershipRule: 'department -eq "Marketing"',
		membershipRuleProcessingState: 'On',
		onPremisesDomainName: null,
		onPremisesLastSyncDateTime: null,
		onPremisesNetBiosName: null,
		onPremisesSamAccountName: null,
		onPremisesSecurityIdentifier: null,
		onPremisesSyncEnabled: null,
		preferredDataLocation: null,
		preferredLanguage: null,
		proxyAddresses: ['SMTP:HRTaskforce@contoso.com'],
		renewedDateTime: '2024-11-04T16:00:21Z',
		resourceBehaviorOptions: ['CalendarMemberReadOnly'],
		resourceProvisioningOptions: [],
		securityEnabled: false,
		securityIdentifier: 'S-1-12-1-1394793482-1222919313-3222267053-1234900903',
		theme: null,
		uniqueName: null,
		visibility: 'Public',
		onPremisesProvisioningErrors: [],
		serviceProvisioningErrors: [],
	},

	getGroupWithProperties: {
		'@odata.context':
			'https://graph.microsoft.com/v1.0/$metadata#groups(assignedLabels,assignedLicenses,createdDateTime,classification,deletedDateTime,description,displayName,expirationDateTime,groupTypes,visibility,unseenCount,theme,uniqueName,serviceProvisioningErrors,securityIdentifier,renewedDateTime,securityEnabled,autoSubscribeNewMembers,allowExternalSenders,licenseProcessingState,isManagementRestricted,isSubscribedByMail,isAssignableToRole,id,hideFromOutlookClients,hideFromAddressLists,onPremisesProvisioningErrors,onPremisesSecurityIdentifier,onPremisesSamAccountName,onPremisesNetBiosName,onPremisesSyncEnabled,preferredDataLocation,preferredLanguage,proxyAddresses,onPremisesLastSyncDateTime,onPremisesDomainName,membershipRuleProcessingState,membershipRule,mailNickname,mailEnabled,mail,members())/$entity',
		createdDateTime: '2024-11-04T16:00:21Z',
		classification: null,
		deletedDateTime: null,
		description: 'This is the default group for everyone in the network',
		displayName: 'All Company',
		expirationDateTime: null,
		groupTypes: ['Unified'],
		visibility: 'Public',
		theme: null,
		uniqueName: null,
		securityIdentifier: 'S-1-12-1-1394793482-1222919313-3222267053-1234900903',
		renewedDateTime: '2024-11-04T16:00:21Z',
		securityEnabled: false,
		isManagementRestricted: null,
		isAssignableToRole: null,
		id: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
		onPremisesSecurityIdentifier: null,
		onPremisesSamAccountName: null,
		onPremisesNetBiosName: null,
		onPremisesSyncEnabled: null,
		preferredDataLocation: null,
		preferredLanguage: null,
		proxyAddresses: ['SMTP:HRTaskforce@contoso.com'],
		onPremisesLastSyncDateTime: null,
		onPremisesDomainName: null,
		membershipRule: 'department -eq "Marketing"',
		membershipRuleProcessingState: 'On',
		mailNickname: 'allcompany',
		mailEnabled: true,
		mail: 'HRTaskforce@contoso.com',
		licenseProcessingState: null,
		allowExternalSenders: false,
		autoSubscribeNewMembers: false,
		isSubscribedByMail: false,
		unseenCount: 0,
		hideFromOutlookClients: false,
		hideFromAddressLists: false,
		assignedLabels: [],
		assignedLicenses: [],
		serviceProvisioningErrors: [],
		onPremisesProvisioningErrors: [],
		members: [
			{
				'@odata.type': '#microsoft.graph.user',
				id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
				deletedDateTime: null,
				accountEnabled: true,
				ageGroup: null,
				businessPhones: ['4917600000000'],
				city: null,
				companyName: null,
				consentProvidedForMinor: null,
				country: 'US',
				createdDateTime: '2024-11-03T16:15:19Z',
				creationType: null,
				department: null,
				displayName: 'John Doe',
				employeeId: null,
				employeeHireDate: null,
				employeeLeaveDateTime: null,
				employeeType: null,
				externalUserState: null,
				externalUserStateChangeDateTime: null,
				faxNumber: null,
				givenName: 'John',
				isLicenseReconciliationNeeded: false,
				jobTitle: null,
				legalAgeGroupClassification: null,
				mail: 'john.doe@contoso.com',
				mailNickname: 'johndoe',
				mobilePhone: null,
				onPremisesDistinguishedName: null,
				onPremisesDomainName: null,
				onPremisesImmutableId: null,
				onPremisesLastSyncDateTime: null,
				onPremisesSecurityIdentifier: null,
				onPremisesSamAccountName: null,
				onPremisesSyncEnabled: null,
				onPremisesUserPrincipalName: null,
				otherMails: ['matstallmann@gmail.com'],
				passwordPolicies: null,
				officeLocation: null,
				postalCode: null,
				preferredDataLocation: null,
				preferredLanguage: 'en',
				proxyAddresses: ['SMTP:john.doe@contoso.com'],
				refreshTokensValidFromDateTime: '2024-11-03T16:15:18Z',
				imAddresses: ['john.doe@contoso.com'],
				isResourceAccount: null,
				showInAddressList: null,
				securityIdentifier: 'S-1-12-1-1601896123-1180963357-2678074248-3763099878',
				signInSessionsValidFromDateTime: '2024-11-03T16:15:18Z',
				state: null,
				streetAddress: null,
				surname: 'Doe',
				usageLocation: 'US',
				userPrincipalName: 'john.doe@contoso.com',
				userType: 'Member',
				employeeOrgData: null,
				passwordProfile: null,
				assignedLicenses: [
					{
						disabledPlans: [],
						skuId: 'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46',
					},
				],
				assignedPlans: [
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'WhiteboardServices',
						servicePlanId: 'b8afc642-032e-4de5-8c0a-507a7bba7e5d',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: 'a6520331-d7d4-4276-95f5-15c0933bc757',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'DynamicsNAV',
						servicePlanId: '39b5c996-467e-4e60-bd62-46066f572726',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'WindowsDefenderATP',
						servicePlanId: 'bfc1bbd9-981b-4f71-9b82-17c35fd0e2a4',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'SharePoint',
						servicePlanId: 'e95bec33-7c88-4a70-8e19-b10bd9d0c014',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: '176a09a6-7ec5-4039-ac02-b2791c6ba793',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'AADPremiumService',
						servicePlanId: '41781fb2-bc02-4b7c-bd55-b576c07bb09d',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: '33c4f319-9bdd-48d6-9c4d-410b750a4a5a',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MicrosoftKaizala',
						servicePlanId: '54fc630f-5a40-48ee-8965-af0503c1386e',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'To-Do',
						servicePlanId: '5e62787c-c316-451f-b873-1d05acd4d12c',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Bing',
						servicePlanId: '0d0c0d31-fae7-41f2-b909-eaf4d7f26dba',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'ccibotsprod',
						servicePlanId: 'ded3d325-1bdc-453e-8432-5bac26d7a014',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'SharePoint',
						servicePlanId: 'a1ace008-72f3-4ea0-8dac-33b3a23a2472',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: '9aaf7827-d63c-4b61-89c3-182f06f82e5c',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: '9bec7e34-c9fa-40b7-a9d1-bd6d1165c7ed',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MixedRealityCollaborationServices',
						servicePlanId: 'f0ff6ac6-297d-49cd-be34-6dfef97f0c28',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'RMSOnline',
						servicePlanId: '6c57d4b6-3b23-47a5-9bc9-69f17b4947b3',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'RMSOnline',
						servicePlanId: 'bea4c11e-220a-4e6d-8eb8-8ea15d019f90',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MicrosoftOffice',
						servicePlanId: '094e7854-93fc-4d55-b2c0-3ab5369ebdc1',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Sway',
						servicePlanId: 'a23b959c-7ce8-4e57-9140-b90eb88a9e97',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Microsoft.ProjectBabylon',
						servicePlanId: 'c948ea65-2053-4a5a-8a62-9eaaaf11b522',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: '5bfe124c-bbdc-4494-8835-f1297d457d79',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'PowerAppsService',
						servicePlanId: '92f7a6f3-b89b-4bbd-8c30-809e6da5ad1c',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MixedRealityCollaborationServices',
						servicePlanId: '3efbd4ed-8958-4824-8389-1321f8730af8',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'CRM',
						servicePlanId: '28b0fa46-c39a-4188-89e2-58e979a6b014',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MixedRealityCollaborationServices',
						servicePlanId: 'dcf9d2f4-772e-4434-b757-77a453cfbc02',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'ProcessSimple',
						servicePlanId: '0f9b09cb-62d1-4ff4-9129-43f4996f83f4',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'YammerEnterprise',
						servicePlanId: 'a82fbf69-b4d7-49f4-83a6-915b2cf354f4',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MultiFactorService',
						servicePlanId: '8a256a2b-b617-496d-b51b-e76466e88db0',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'OfficeForms',
						servicePlanId: '159f4cd6-e380-449f-a816-af1a9ef76344',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MicrosoftCommunicationsOnline',
						servicePlanId: '0feaeb32-d00e-4d66-bd5a-43b5b83db82c',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Windows',
						servicePlanId: '8e229017-d77b-43d5-9305-903395523b99',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'ProjectProgramsAndPortfolios',
						servicePlanId: 'b21a6b06-1988-436e-a07b-51ec6d9f52ad',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'SCO',
						servicePlanId: 'c1ec4a95-1f05-45b3-a911-aa3fa01094f5',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'WindowsUpdateforBusinessCloudExtensions',
						servicePlanId: '7bf960f6-2cd9-443a-8046-5dbff9558365',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'YammerEnterprise',
						servicePlanId: '7547a3fe-08ee-4ccb-b430-5077c5041653',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'CRM',
						servicePlanId: 'afa73018-811e-46e9-988f-f75d2b1b8430',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'SharePoint',
						servicePlanId: 'c7699d2e-19aa-44de-8edf-1736da088ca1',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'AADPremiumService',
						servicePlanId: 'de377cbc-0019-4ec2-b77c-3f223947e102',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'exchange',
						servicePlanId: '199a5c09-e0ca-4e37-8f7c-b05d533e1ea2',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Adallom',
						servicePlanId: '932ad362-64a8-4783-9106-97849a1a30b9',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Chapter5FluidApp',
						servicePlanId: 'c4b8c31a-fb44-4c65-9837-a21f55fcabda',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'LearningAppServiceInTeams',
						servicePlanId: 'b76fb638-6ba6-402a-b9f9-83d28acb3d86',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'Deskless',
						servicePlanId: '8c7d2df8-86f0-4902-b2ed-a0458298f3b3',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MicrosoftStream',
						servicePlanId: '743dd19e-1ce3-4c62-a3ad-49ba8f63a2f6',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'TeamspaceAPI',
						servicePlanId: '57ff2da0-773e-42df-b2af-ffb7a2317929',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MicrosoftOffice',
						servicePlanId: '276d6e8a-f056-4f70-b7e8-4fc27f79f809',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'SCO',
						servicePlanId: '8e9ff0ff-aa7a-4b20-83c1-2f636b600ac2',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'MicrosoftPrint',
						servicePlanId: '795f6fe0-cc4d-4773-b050-5dde4dc704c9',
					},
					{
						assignedDateTime: '2024-11-04T15:54:26Z',
						capabilityStatus: 'Enabled',
						service: 'ProjectWorkManagement',
						servicePlanId: 'b737dad2-2f6c-4c65-90e3-ca563267e8b9',
					},
				],
				authorizationInfo: {
					certificateUserIds: [],
				},
				identities: [
					{
						signInType: 'userPrincipalName',
						issuer: 'contoso.com',
						issuerAssignedId: 'john.doe@contoso.com',
					},
				],
				onPremisesProvisioningErrors: [],
				onPremisesExtensionAttributes: {
					extensionAttribute1: null,
					extensionAttribute2: null,
					extensionAttribute3: null,
					extensionAttribute4: null,
					extensionAttribute5: null,
					extensionAttribute6: null,
					extensionAttribute7: null,
					extensionAttribute8: null,
					extensionAttribute9: null,
					extensionAttribute10: null,
					extensionAttribute11: null,
					extensionAttribute12: null,
					extensionAttribute13: null,
					extensionAttribute14: null,
					extensionAttribute15: null,
				},
				provisionedPlans: [
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'exchange',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'MicrosoftCommunicationsOnline',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'SharePoint',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'SharePoint',
					},
					{
						capabilityStatus: 'Enabled',
						provisioningStatus: 'Success',
						service: 'SharePoint',
					},
				],
				serviceProvisioningErrors: [],
			},
		],
	},

	postUser: {
		'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
		id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
		businessPhones: [],
		displayName: 'John Doe',
		givenName: null,
		jobTitle: null,
		mail: null,
		mobilePhone: null,
		officeLocation: null,
		preferredLanguage: null,
		surname: null,
		userPrincipalName: 'johndoe@contoso.com',
	},

	getUser: {
		'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
		businessPhones: ['0123456789'],
		displayName: 'John Doe',
		givenName: 'John',
		jobTitle: 'Project manager',
		mail: 'johndoe@contoso.com',
		mobilePhone: '+123456789',
		officeLocation: 'New York',
		preferredLanguage: 'en-US',
		surname: 'Doe',
		userPrincipalName: 'johndoe@contoso.com',
		id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
	},

	metadata: {
		groups:
			'<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="microsoft.graph.identityGovernance" xmlns="http://docs.oasis-open.org/odata/ns/edm"></Schema><Schema Namespace="microsoft.graph" Alias="graph" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="entity" Abstract="true"><Key><PropertyRef Name="id"/></Key><Property Name="id" Type="Edm.String" Nullable="false"/></EntityType><EntityType Name="directoryObject" BaseType="graph.entity" OpenType="true"><Property Name="deletedDateTime" Type="Edm.DateTimeOffset"/></EntityType><EntityType Name="group" BaseType="graph.directoryObject" OpenType="true"><Property Name="assignedLabels" Type="Collection(graph.assignedLabel)"/><Property Name="assignedLicenses" Type="Collection(graph.assignedLicense)"/><Property Name="classification" Type="Edm.String"/><Property Name="createdDateTime" Type="Edm.DateTimeOffset"/><Property Name="description" Type="Edm.String"/><Property Name="displayName" Type="Edm.String"/><Property Name="expirationDateTime" Type="Edm.DateTimeOffset"/><Property Name="groupTypes" Type="Collection(Edm.String)" Nullable="false"/><Property Name="hasMembersWithLicenseErrors" Type="Edm.Boolean"/><Property Name="isAssignableToRole" Type="Edm.Boolean"/><Property Name="isManagementRestricted" Type="Edm.Boolean"/><Property Name="licenseProcessingState" Type="graph.licenseProcessingState"/><Property Name="mail" Type="Edm.String"/><Property Name="mailEnabled" Type="Edm.Boolean"/><Property Name="mailNickname" Type="Edm.String"/><Property Name="membershipRule" Type="Edm.String"/><Property Name="membershipRuleProcessingState" Type="Edm.String"/><Property Name="onPremisesDomainName" Type="Edm.String"/><Property Name="onPremisesLastSyncDateTime" Type="Edm.DateTimeOffset"/><Property Name="onPremisesNetBiosName" Type="Edm.String"/><Property Name="onPremisesProvisioningErrors" Type="Collection(graph.onPremisesProvisioningError)"/><Property Name="onPremisesSamAccountName" Type="Edm.String"/><Property Name="onPremisesSecurityIdentifier" Type="Edm.String"/><Property Name="onPremisesSyncEnabled" Type="Edm.Boolean"/><Property Name="preferredDataLocation" Type="Edm.String"/><Property Name="preferredLanguage" Type="Edm.String"/><Property Name="proxyAddresses" Type="Collection(Edm.String)" Nullable="false"/><Property Name="renewedDateTime" Type="Edm.DateTimeOffset"/><Property Name="securityEnabled" Type="Edm.Boolean"/><Property Name="securityIdentifier" Type="Edm.String"/><Property Name="serviceProvisioningErrors" Type="Collection(graph.serviceProvisioningError)"/><Property Name="theme" Type="Edm.String"/><Property Name="uniqueName" Type="Edm.String"/><Property Name="visibility" Type="Edm.String"/><Property Name="allowExternalSenders" Type="Edm.Boolean"/><Property Name="autoSubscribeNewMembers" Type="Edm.Boolean"/><Property Name="hideFromAddressLists" Type="Edm.Boolean"/><Property Name="hideFromOutlookClients" Type="Edm.Boolean"/><Property Name="isSubscribedByMail" Type="Edm.Boolean"/><Property Name="unseenCount" Type="Edm.Int32"/><Property Name="isArchived" Type="Edm.Boolean"/><NavigationProperty Name="appRoleAssignments" Type="Collection(graph.appRoleAssignment)" ContainsTarget="true"/><NavigationProperty Name="createdOnBehalfOf" Type="graph.directoryObject"/><NavigationProperty Name="memberOf" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="members" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="membersWithLicenseErrors" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="owners" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="permissionGrants" Type="Collection(graph.resourceSpecificPermissionGrant)" ContainsTarget="true"/><NavigationProperty Name="settings" Type="Collection(graph.groupSetting)" ContainsTarget="true"/><NavigationProperty Name="transitiveMemberOf" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="transitiveMembers" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="acceptedSenders" Type="Collection(graph.directoryObject)" ContainsTarget="true"/><NavigationProperty Name="calendar" Type="graph.calendar" ContainsTarget="true"/><NavigationProperty Name="calendarView" Type="Collection(graph.event)" ContainsTarget="true"/><NavigationProperty Name="conversations" Type="Collection(graph.conversation)" ContainsTarget="true"/><NavigationProperty Name="events" Type="Collection(graph.event)" ContainsTarget="true"/><NavigationProperty Name="rejectedSenders" Type="Collection(graph.directoryObject)" ContainsTarget="true"/><NavigationProperty Name="threads" Type="Collection(graph.conversationThread)" ContainsTarget="true"/><NavigationProperty Name="drive" Type="graph.drive" ContainsTarget="true"/><NavigationProperty Name="drives" Type="Collection(graph.drive)" ContainsTarget="true"/><NavigationProperty Name="sites" Type="Collection(graph.site)" ContainsTarget="true"/><NavigationProperty Name="extensions" Type="Collection(graph.extension)" ContainsTarget="true"/><NavigationProperty Name="groupLifecyclePolicies" Type="Collection(graph.groupLifecyclePolicy)" ContainsTarget="true"/><NavigationProperty Name="planner" Type="graph.plannerGroup" ContainsTarget="true"/><NavigationProperty Name="onenote" Type="graph.onenote" ContainsTarget="true"/><NavigationProperty Name="photo" Type="graph.profilePhoto" ContainsTarget="true"/><NavigationProperty Name="photos" Type="Collection(graph.profilePhoto)" ContainsTarget="true"/><NavigationProperty Name="team" Type="graph.team" ContainsTarget="true"/><Annotation Term="Org.OData.Core.V1.AlternateKeys"><Collection><Record Type="Org.OData.Core.V1.AlternateKey"><PropertyValue Property="Key"><Collection><Record Type="Org.OData.Core.V1.PropertyRef"><PropertyValue Property="Alias" String="uniqueName"/><PropertyValue Property="Name" PropertyPath="uniqueName"/></Record></Collection></PropertyValue></Record></Collection></Annotation></EntityType></Schema></edmx:DataServices></edmx:Edmx>',
		users:
			'<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="microsoft.graph.identityGovernance" xmlns="http://docs.oasis-open.org/odata/ns/edm"></Schema><Schema Namespace="microsoft.graph" Alias="graph" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="entity" Abstract="true"><Key><PropertyRef Name="id"/></Key><Property Name="id" Type="Edm.String" Nullable="false"/></EntityType><EntityType Name="directoryObject" BaseType="graph.entity" OpenType="true"><Property Name="deletedDateTime" Type="Edm.DateTimeOffset"/></EntityType><EntityType Name="user" BaseType="graph.directoryObject" OpenType="true"><Property Name="signInActivity" Type="graph.signInActivity"/><Property Name="accountEnabled" Type="Edm.Boolean"/><Property Name="ageGroup" Type="Edm.String"/><Property Name="assignedLicenses" Type="Collection(graph.assignedLicense)" Nullable="false"/><Property Name="assignedPlans" Type="Collection(graph.assignedPlan)" Nullable="false"/><Property Name="authorizationInfo" Type="graph.authorizationInfo"/><Property Name="businessPhones" Type="Collection(Edm.String)" Nullable="false"/><Property Name="city" Type="Edm.String"/><Property Name="companyName" Type="Edm.String"/><Property Name="consentProvidedForMinor" Type="Edm.String"/><Property Name="country" Type="Edm.String"/><Property Name="createdDateTime" Type="Edm.DateTimeOffset"/><Property Name="creationType" Type="Edm.String"/><Property Name="customSecurityAttributes" Type="graph.customSecurityAttributeValue"/><Property Name="department" Type="Edm.String"/><Property Name="displayName" Type="Edm.String"/><Property Name="employeeHireDate" Type="Edm.DateTimeOffset"/><Property Name="employeeId" Type="Edm.String"/><Property Name="employeeLeaveDateTime" Type="Edm.DateTimeOffset"/><Property Name="employeeOrgData" Type="graph.employeeOrgData"/><Property Name="employeeType" Type="Edm.String"/><Property Name="externalUserState" Type="Edm.String"/><Property Name="externalUserStateChangeDateTime" Type="Edm.DateTimeOffset"/><Property Name="faxNumber" Type="Edm.String"/><Property Name="givenName" Type="Edm.String"/><Property Name="identities" Type="Collection(graph.objectIdentity)"/><Property Name="imAddresses" Type="Collection(Edm.String)"/><Property Name="isManagementRestricted" Type="Edm.Boolean"/><Property Name="isResourceAccount" Type="Edm.Boolean"/><Property Name="jobTitle" Type="Edm.String"/><Property Name="lastPasswordChangeDateTime" Type="Edm.DateTimeOffset"/><Property Name="legalAgeGroupClassification" Type="Edm.String"/><Property Name="licenseAssignmentStates" Type="Collection(graph.licenseAssignmentState)"/><Property Name="mail" Type="Edm.String"/><Property Name="mailNickname" Type="Edm.String"/><Property Name="mobilePhone" Type="Edm.String"/><Property Name="officeLocation" Type="Edm.String"/><Property Name="onPremisesDistinguishedName" Type="Edm.String"/><Property Name="onPremisesDomainName" Type="Edm.String"/><Property Name="onPremisesExtensionAttributes" Type="graph.onPremisesExtensionAttributes"/><Property Name="onPremisesImmutableId" Type="Edm.String"/><Property Name="onPremisesLastSyncDateTime" Type="Edm.DateTimeOffset"/><Property Name="onPremisesProvisioningErrors" Type="Collection(graph.onPremisesProvisioningError)"/><Property Name="onPremisesSamAccountName" Type="Edm.String"/><Property Name="onPremisesSecurityIdentifier" Type="Edm.String"/><Property Name="onPremisesSyncEnabled" Type="Edm.Boolean"/><Property Name="onPremisesUserPrincipalName" Type="Edm.String"/><Property Name="otherMails" Type="Collection(Edm.String)" Nullable="false"/><Property Name="passwordPolicies" Type="Edm.String"/><Property Name="passwordProfile" Type="graph.passwordProfile"/><Property Name="postalCode" Type="Edm.String"/><Property Name="preferredDataLocation" Type="Edm.String"/><Property Name="preferredLanguage" Type="Edm.String"/><Property Name="provisionedPlans" Type="Collection(graph.provisionedPlan)" Nullable="false"/><Property Name="proxyAddresses" Type="Collection(Edm.String)" Nullable="false"/><Property Name="securityIdentifier" Type="Edm.String"/><Property Name="serviceProvisioningErrors" Type="Collection(graph.serviceProvisioningError)"/><Property Name="showInAddressList" Type="Edm.Boolean"/><Property Name="signInSessionsValidFromDateTime" Type="Edm.DateTimeOffset"/><Property Name="state" Type="Edm.String"/><Property Name="streetAddress" Type="Edm.String"/><Property Name="surname" Type="Edm.String"/><Property Name="usageLocation" Type="Edm.String"/><Property Name="userPrincipalName" Type="Edm.String"/><Property Name="userType" Type="Edm.String"/><Property Name="mailboxSettings" Type="graph.mailboxSettings"/><Property Name="deviceEnrollmentLimit" Type="Edm.Int32" Nullable="false"/><Property Name="print" Type="graph.userPrint"/><Property Name="aboutMe" Type="Edm.String"/><Property Name="birthday" Type="Edm.DateTimeOffset" Nullable="false"/><Property Name="hireDate" Type="Edm.DateTimeOffset" Nullable="false"/><Property Name="interests" Type="Collection(Edm.String)"/><Property Name="mySite" Type="Edm.String"/><Property Name="pastProjects" Type="Collection(Edm.String)"/><Property Name="preferredName" Type="Edm.String"/><Property Name="responsibilities" Type="Collection(Edm.String)"/><Property Name="schools" Type="Collection(Edm.String)"/><Property Name="skills" Type="Collection(Edm.String)"/><NavigationProperty Name="appRoleAssignments" Type="Collection(graph.appRoleAssignment)" ContainsTarget="true"/><NavigationProperty Name="createdObjects" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="directReports" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="licenseDetails" Type="Collection(graph.licenseDetails)" ContainsTarget="true"/><NavigationProperty Name="manager" Type="graph.directoryObject"/><NavigationProperty Name="memberOf" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="oauth2PermissionGrants" Type="Collection(graph.oAuth2PermissionGrant)"/><NavigationProperty Name="ownedDevices" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="ownedObjects" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="registeredDevices" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="scopedRoleMemberOf" Type="Collection(graph.scopedRoleMembership)" ContainsTarget="true"/><NavigationProperty Name="sponsors" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="transitiveMemberOf" Type="Collection(graph.directoryObject)"/><NavigationProperty Name="calendar" Type="graph.calendar" ContainsTarget="true"/><NavigationProperty Name="calendarGroups" Type="Collection(graph.calendarGroup)" ContainsTarget="true"/><NavigationProperty Name="calendars" Type="Collection(graph.calendar)" ContainsTarget="true"/><NavigationProperty Name="calendarView" Type="Collection(graph.event)" ContainsTarget="true"/><NavigationProperty Name="contactFolders" Type="Collection(graph.contactFolder)" ContainsTarget="true"/><NavigationProperty Name="contacts" Type="Collection(graph.contact)" ContainsTarget="true"/><NavigationProperty Name="events" Type="Collection(graph.event)" ContainsTarget="true"/><NavigationProperty Name="inferenceClassification" Type="graph.inferenceClassification" ContainsTarget="true"/><NavigationProperty Name="mailFolders" Type="Collection(graph.mailFolder)" ContainsTarget="true"/><NavigationProperty Name="messages" Type="Collection(graph.message)" ContainsTarget="true"/><NavigationProperty Name="outlook" Type="graph.outlookUser" ContainsTarget="true"/><NavigationProperty Name="people" Type="Collection(graph.person)" ContainsTarget="true"/><NavigationProperty Name="drive" Type="graph.drive" ContainsTarget="true"/><NavigationProperty Name="drives" Type="Collection(graph.drive)" ContainsTarget="true"/><NavigationProperty Name="followedSites" Type="Collection(graph.site)"/><NavigationProperty Name="extensions" Type="Collection(graph.extension)" ContainsTarget="true"/><NavigationProperty Name="agreementAcceptances" Type="Collection(graph.agreementAcceptance)"/><NavigationProperty Name="managedDevices" Type="Collection(graph.managedDevice)" ContainsTarget="true"/><NavigationProperty Name="managedAppRegistrations" Type="Collection(graph.managedAppRegistration)"/><NavigationProperty Name="deviceManagementTroubleshootingEvents" Type="Collection(graph.deviceManagementTroubleshootingEvent)" ContainsTarget="true"/><NavigationProperty Name="planner" Type="graph.plannerUser" ContainsTarget="true"/><NavigationProperty Name="insights" Type="graph.itemInsights" ContainsTarget="true"/><NavigationProperty Name="settings" Type="graph.userSettings" ContainsTarget="true"/><NavigationProperty Name="onenote" Type="graph.onenote" ContainsTarget="true"/><NavigationProperty Name="cloudClipboard" Type="graph.cloudClipboardRoot" ContainsTarget="true"/><NavigationProperty Name="photo" Type="graph.profilePhoto" ContainsTarget="true"/><NavigationProperty Name="photos" Type="Collection(graph.profilePhoto)" ContainsTarget="true"/><NavigationProperty Name="activities" Type="Collection(graph.userActivity)" ContainsTarget="true"/><NavigationProperty Name="onlineMeetings" Type="Collection(graph.onlineMeeting)" ContainsTarget="true"/><NavigationProperty Name="presence" Type="graph.presence" ContainsTarget="true"/><NavigationProperty Name="authentication" Type="graph.authentication" ContainsTarget="true"/><NavigationProperty Name="chats" Type="Collection(graph.chat)" ContainsTarget="true"/><NavigationProperty Name="joinedTeams" Type="Collection(graph.team)" ContainsTarget="true"/><NavigationProperty Name="permissionGrants" Type="Collection(graph.resourceSpecificPermissionGrant)" ContainsTarget="true"/><NavigationProperty Name="teamwork" Type="graph.userTeamwork" ContainsTarget="true"/><NavigationProperty Name="solutions" Type="graph.userSolutionRoot" ContainsTarget="true"/><NavigationProperty Name="todo" Type="graph.todo" ContainsTarget="true"/><NavigationProperty Name="employeeExperience" Type="graph.employeeExperienceUser" ContainsTarget="true"/><Annotation Term="Org.OData.Core.V1.AlternateKeys"><Collection><Record Type="Org.OData.Core.V1.AlternateKey"><PropertyValue Property="Key"><Collection><Record Type="Org.OData.Core.V1.PropertyRef"><PropertyValue Property="Alias" String="userPrincipalName"/><PropertyValue Property="Name" PropertyPath="userPrincipalName"/></Record></Collection></PropertyValue></Record></Collection></Annotation></EntityType></Schema></edmx:DataServices></edmx:Edmx>',
	},
};

export const microsoftEntraNodeResponse = {
	createGroup: [
		{
			json: {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups/$entity',
				id: 'a8eb60e3-0145-4d7e-85ef-c6259784761b',
				deletedDateTime: null,
				classification: null,
				createdDateTime: '2024-11-17T15:46:32Z',
				creationOptions: [],
				displayName: 'Group Display Name',
				expirationDateTime: null,
				groupTypes: ['DynamicMembership', 'Unified'],
				isAssignableToRole: true,
				mail: null,
				mailEnabled: true,
				mailNickname: 'MailNickname',
				membershipRule: 'department -eq "Marketing"',
				membershipRuleProcessingState: 'On',
				onPremisesDomainName: null,
				onPremisesLastSyncDateTime: null,
				onPremisesNetBiosName: null,
				onPremisesSamAccountName: null,
				onPremisesSecurityIdentifier: null,
				onPremisesSyncEnabled: null,
				preferredLanguage: null,
				proxyAddresses: [],
				renewedDateTime: '2024-11-17T15:46:32Z',
				resourceBehaviorOptions: [],
				resourceProvisioningOptions: [],
				securityEnabled: true,
				securityIdentifier: 'S-1-12-1-2833998051-1300103493-633794437-460752023',
				theme: null,
				onPremisesProvisioningErrors: [],
				serviceProvisioningErrors: [],
				description: 'Group Description',
				preferredDataLocation: 'Preferred Data Location',
				uniqueName: 'UniqueName',
				visibility: 'Public',
			},
		},
	],

	deleteGroup: [
		{
			json: {
				deleted: true,
			},
		},
	],

	getGroup: [{ json: { ...microsoftEntraApiResponse.getGroup } }],

	getGroupWithProperties: [{ json: { ...microsoftEntraApiResponse.getGroupWithProperties } }],

	updateGroup: [
		{
			json: {
				updated: true,
			},
		},
	],

	addUserToGroup: [
		{
			json: {
				added: true,
			},
		},
	],

	createUser: [
		{
			json: {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
				id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
				businessPhones: ['0123456789'],
				displayName: 'John Doe',
				givenName: 'John',
				jobTitle: 'Project manager',
				mail: 'johndoe@contoso.com',
				mobilePhone: '+123456789',
				officeLocation: 'New York',
				preferredLanguage: 'en-US',
				// mailNickname: 'johndoe',
				userPrincipalName: 'johndoe@contoso.com',
				aboutMe: 'About me',
				ageGroup: 'Adult',
				birthday: '2024-11-12T00:00:00.000Z',
				city: 'New York',
				companyName: 'Contoso',
				consentProvidedForMinor: 'Granted',
				country: 'US',
				department: 'IT',
				employeeId: 'employee-id-123',
				employeeType: 'Contractor',
				employeeHireDate: '2024-11-13T00:00:00.000Z',
				employeeLeaveDateTime: '2024-11-18T00:00:00.000Z',
				employeeOrgData: {
					costCenter: 'Cost Center 1',
					division: 'Division 1',
				},
				interests: ['interest1', 'interest2'],
				surname: 'Doe',
				mySite: 'My Site',
				onPremisesImmutableId: 'premiseid123',
				otherMails: ['johndoe2@contoso.com', 'johndoe3@contoso.com'],
				passwordPolicies: 'DisablePasswordExpiration,DisableStrongPassword',
				passwordProfile: {
					forceChangePasswordNextSignInWithMfa: true,
				},
				pastProjects: ['project1', 'project2'],
				postalCode: '0123456',
				responsibilities: ['responsibility1', 'responsibility2'],
				schools: ['school1', 'school2'],
				skills: ['skill1', 'skill2'],
				state: 'New York',
				streetAddress: 'Street 123',
				usageLocation: 'US',
				userType: 'Guest',
			},
		},
	],

	deleteUser: [
		{
			json: {
				deleted: true,
			},
		},
	],

	getUser: [
		{
			json: {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
				businessPhones: ['0123456789'],
				displayName: 'John Doe',
				givenName: 'John',
				jobTitle: 'Project manager',
				mail: 'johndoe@contoso.com',
				mobilePhone: '+123456789',
				officeLocation: 'New York',
				preferredLanguage: 'en-US',
				surname: 'Doe',
				userPrincipalName: 'johndoe@contoso.com',
				id: '87d349ed-44d7-43e1-9a83-5f2406dee5bd',
			},
		},
	],

	removeUserFromGroup: [
		{
			json: {
				removed: true,
			},
		},
	],

	updateUser: [
		{
			json: {
				updated: true,
			},
		},
	],

	loadOptions: {
		getGroupProperties: [
			{
				name: 'allowExternalSenders',
				value: 'allowExternalSenders',
			},
			{
				name: 'assignedLabels',
				value: 'assignedLabels',
			},
			{
				name: 'assignedLicenses',
				value: 'assignedLicenses',
			},
			{
				name: 'autoSubscribeNewMembers',
				value: 'autoSubscribeNewMembers',
			},
			{
				name: 'classification',
				value: 'classification',
			},
			{
				name: 'createdDateTime',
				value: 'createdDateTime',
			},
			{
				name: 'deletedDateTime',
				value: 'deletedDateTime',
			},
			{
				name: 'description',
				value: 'description',
			},
			{
				name: 'displayName',
				value: 'displayName',
			},
			{
				name: 'expirationDateTime',
				value: 'expirationDateTime',
			},
			{
				name: 'groupTypes',
				value: 'groupTypes',
			},
			{
				name: 'hideFromAddressLists',
				value: 'hideFromAddressLists',
			},
			{
				name: 'hideFromOutlookClients',
				value: 'hideFromOutlookClients',
			},
			// {
			// 	name: 'id',
			// 	value: 'id',
			// },
			{
				name: 'isAssignableToRole',
				value: 'isAssignableToRole',
			},
			{
				name: 'isManagementRestricted',
				value: 'isManagementRestricted',
			},
			{
				name: 'isSubscribedByMail',
				value: 'isSubscribedByMail',
			},
			{
				name: 'licenseProcessingState',
				value: 'licenseProcessingState',
			},
			{
				name: 'mail',
				value: 'mail',
			},
			{
				name: 'mailEnabled',
				value: 'mailEnabled',
			},
			{
				name: 'mailNickname',
				value: 'mailNickname',
			},
			{
				name: 'membershipRule',
				value: 'membershipRule',
			},
			{
				name: 'membershipRuleProcessingState',
				value: 'membershipRuleProcessingState',
			},
			{
				name: 'onPremisesDomainName',
				value: 'onPremisesDomainName',
			},
			{
				name: 'onPremisesLastSyncDateTime',
				value: 'onPremisesLastSyncDateTime',
			},
			{
				name: 'onPremisesNetBiosName',
				value: 'onPremisesNetBiosName',
			},
			{
				name: 'onPremisesProvisioningErrors',
				value: 'onPremisesProvisioningErrors',
			},
			{
				name: 'onPremisesSamAccountName',
				value: 'onPremisesSamAccountName',
			},
			{
				name: 'onPremisesSecurityIdentifier',
				value: 'onPremisesSecurityIdentifier',
			},
			{
				name: 'onPremisesSyncEnabled',
				value: 'onPremisesSyncEnabled',
			},
			{
				name: 'preferredDataLocation',
				value: 'preferredDataLocation',
			},
			{
				name: 'preferredLanguage',
				value: 'preferredLanguage',
			},
			{
				name: 'proxyAddresses',
				value: 'proxyAddresses',
			},
			{
				name: 'renewedDateTime',
				value: 'renewedDateTime',
			},
			{
				name: 'securityEnabled',
				value: 'securityEnabled',
			},
			{
				name: 'securityIdentifier',
				value: 'securityIdentifier',
			},
			{
				name: 'serviceProvisioningErrors',
				value: 'serviceProvisioningErrors',
			},
			{
				name: 'theme',
				value: 'theme',
			},
			{
				name: 'uniqueName',
				value: 'uniqueName',
			},
			{
				name: 'unseenCount',
				value: 'unseenCount',
			},
			{
				name: 'visibility',
				value: 'visibility',
			},
		],

		getUserProperties: [
			{
				name: 'aboutMe',
				value: 'aboutMe',
			},
			{
				name: 'accountEnabled',
				value: 'accountEnabled',
			},
			{
				name: 'ageGroup',
				value: 'ageGroup',
			},
			{
				name: 'assignedLicenses',
				value: 'assignedLicenses',
			},
			{
				name: 'assignedPlans',
				value: 'assignedPlans',
			},
			{
				name: 'authorizationInfo',
				value: 'authorizationInfo',
			},
			{
				name: 'birthday',
				value: 'birthday',
			},
			{
				name: 'businessPhones',
				value: 'businessPhones',
			},
			{
				name: 'city',
				value: 'city',
			},
			{
				name: 'companyName',
				value: 'companyName',
			},
			{
				name: 'consentProvidedForMinor',
				value: 'consentProvidedForMinor',
			},
			{
				name: 'country',
				value: 'country',
			},
			{
				name: 'createdDateTime',
				value: 'createdDateTime',
			},
			{
				name: 'creationType',
				value: 'creationType',
			},
			{
				name: 'customSecurityAttributes',
				value: 'customSecurityAttributes',
			},
			{
				name: 'deletedDateTime',
				value: 'deletedDateTime',
			},
			{
				name: 'department',
				value: 'department',
			},
			{
				name: 'displayName',
				value: 'displayName',
			},
			{
				name: 'employeeHireDate',
				value: 'employeeHireDate',
			},
			{
				name: 'employeeId',
				value: 'employeeId',
			},
			{
				name: 'employeeLeaveDateTime',
				value: 'employeeLeaveDateTime',
			},
			{
				name: 'employeeOrgData',
				value: 'employeeOrgData',
			},
			{
				name: 'employeeType',
				value: 'employeeType',
			},
			{
				name: 'externalUserState',
				value: 'externalUserState',
			},
			{
				name: 'externalUserStateChangeDateTime',
				value: 'externalUserStateChangeDateTime',
			},
			{
				name: 'faxNumber',
				value: 'faxNumber',
			},
			{
				name: 'givenName',
				value: 'givenName',
			},
			{
				name: 'hireDate',
				value: 'hireDate',
			},
			// {
			// 	name: 'id',
			// 	value: 'id',
			// },
			{
				name: 'identities',
				value: 'identities',
			},
			{
				name: 'imAddresses',
				value: 'imAddresses',
			},
			{
				name: 'interests',
				value: 'interests',
			},
			{
				name: 'isManagementRestricted',
				value: 'isManagementRestricted',
			},
			{
				name: 'isResourceAccount',
				value: 'isResourceAccount',
			},
			{
				name: 'jobTitle',
				value: 'jobTitle',
			},
			{
				name: 'lastPasswordChangeDateTime',
				value: 'lastPasswordChangeDateTime',
			},
			{
				name: 'legalAgeGroupClassification',
				value: 'legalAgeGroupClassification',
			},
			{
				name: 'licenseAssignmentStates',
				value: 'licenseAssignmentStates',
			},
			{
				name: 'mail',
				value: 'mail',
			},
			{
				name: 'mailNickname',
				value: 'mailNickname',
			},
			// {
			// 	name: 'mailboxSettings',
			// 	value: 'mailboxSettings',
			// },
			{
				name: 'mobilePhone',
				value: 'mobilePhone',
			},
			{
				name: 'mySite',
				value: 'mySite',
			},
			{
				name: 'officeLocation',
				value: 'officeLocation',
			},
			{
				name: 'onPremisesDistinguishedName',
				value: 'onPremisesDistinguishedName',
			},
			{
				name: 'onPremisesDomainName',
				value: 'onPremisesDomainName',
			},
			{
				name: 'onPremisesExtensionAttributes',
				value: 'onPremisesExtensionAttributes',
			},
			{
				name: 'onPremisesImmutableId',
				value: 'onPremisesImmutableId',
			},
			{
				name: 'onPremisesLastSyncDateTime',
				value: 'onPremisesLastSyncDateTime',
			},
			{
				name: 'onPremisesProvisioningErrors',
				value: 'onPremisesProvisioningErrors',
			},
			{
				name: 'onPremisesSamAccountName',
				value: 'onPremisesSamAccountName',
			},
			{
				name: 'onPremisesSecurityIdentifier',
				value: 'onPremisesSecurityIdentifier',
			},
			{
				name: 'onPremisesSyncEnabled',
				value: 'onPremisesSyncEnabled',
			},
			{
				name: 'onPremisesUserPrincipalName',
				value: 'onPremisesUserPrincipalName',
			},
			{
				name: 'otherMails',
				value: 'otherMails',
			},
			{
				name: 'passwordPolicies',
				value: 'passwordPolicies',
			},
			{
				name: 'passwordProfile',
				value: 'passwordProfile',
			},
			{
				name: 'pastProjects',
				value: 'pastProjects',
			},
			{
				name: 'postalCode',
				value: 'postalCode',
			},
			{
				name: 'preferredDataLocation',
				value: 'preferredDataLocation',
			},
			{
				name: 'preferredLanguage',
				value: 'preferredLanguage',
			},
			{
				name: 'preferredName',
				value: 'preferredName',
			},
			{
				name: 'provisionedPlans',
				value: 'provisionedPlans',
			},
			{
				name: 'proxyAddresses',
				value: 'proxyAddresses',
			},
			{
				name: 'responsibilities',
				value: 'responsibilities',
			},
			{
				name: 'schools',
				value: 'schools',
			},
			{
				name: 'securityIdentifier',
				value: 'securityIdentifier',
			},
			{
				name: 'serviceProvisioningErrors',
				value: 'serviceProvisioningErrors',
			},
			{
				name: 'showInAddressList',
				value: 'showInAddressList',
			},
			// {
			// 	name: 'signInActivity',
			// 	value: 'signInActivity',
			// },
			{
				name: 'signInSessionsValidFromDateTime',
				value: 'signInSessionsValidFromDateTime',
			},
			{
				name: 'skills',
				value: 'skills',
			},
			{
				name: 'state',
				value: 'state',
			},
			{
				name: 'streetAddress',
				value: 'streetAddress',
			},
			{
				name: 'surname',
				value: 'surname',
			},
			{
				name: 'usageLocation',
				value: 'usageLocation',
			},
			{
				name: 'userPrincipalName',
				value: 'userPrincipalName',
			},
			{
				name: 'userType',
				value: 'userType',
			},
		],
	},
};
