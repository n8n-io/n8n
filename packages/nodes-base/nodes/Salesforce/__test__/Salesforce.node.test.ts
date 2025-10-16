import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Salesforce } from '../Salesforce.node';

jest.mock('../GenericFunctions', () => ({
	getQuery: jest.fn(),
	salesforceApiRequest: jest.fn(),
	salesforceApiRequestAllItems: jest.fn(),
	sortOptions: jest.fn(),
}));

describe('Salesforce', () => {
	let node: Salesforce;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;

	const salesforceApiRequestSpy = jest.spyOn(GenericFunctions, 'salesforceApiRequest');
	const salesforceApiRequestAllItemsSpy = jest.spyOn(
		GenericFunctions,
		'salesforceApiRequestAllItems',
	);
	const sortOptionsSpy = jest.spyOn(GenericFunctions, 'sortOptions');

	beforeEach(() => {
		node = new Salesforce();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = {
			id: 'test-node-id',
			name: 'Salesforce Test',
			type: 'n8n-nodes-base.salesforce',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.logger.debug = jest.fn();
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: unknown[], meta: unknown) =>
				data.map((item: unknown, index: number) => ({
					...(typeof item === 'object' && item !== null ? item : {}),
					pairedItem: (meta as any)?.itemData?.item || index,
				})),
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.displayName).toBe('Salesforce');
			expect(node.description.name).toBe('salesforce');
			expect(node.description.group).toEqual(['output']);
			expect(node.description.version).toBe(1);
			expect(node.description.usableAsTool).toBe(true);
		});

		it('should have correct node structure', () => {
			expect(node.description.inputs).toEqual([NodeConnectionTypes.Main]);
			expect(node.description.outputs).toEqual([NodeConnectionTypes.Main]);
			expect(node.description.subtitle).toBe(
				'={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			);
		});

		it('should have correct credentials configuration', () => {
			expect(node.description.credentials).toEqual([
				{
					name: 'salesforceOAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
						},
					},
				},
				{
					name: 'salesforceJwtApi',
					required: true,
					displayOptions: {
						show: {
							authentication: ['jwt'],
						},
					},
				},
			]);
		});

		it('should have correct authentication options', () => {
			const authProp = node.description.properties.find((p) => p.name === 'authentication');
			expect(authProp).toBeDefined();
			expect(authProp?.type).toBe('options');
			expect(authProp?.default).toBe('oAuth2');
			expect(authProp?.options).toEqual([
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
				{
					name: 'OAuth2 JWT',
					value: 'jwt',
				},
			]);
		});
	});

	describe('LoadOptions Methods', () => {
		let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

		beforeEach(() => {
			mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		});

		describe('getLeadStatuses', () => {
			it('should return lead statuses with sorted options', async () => {
				const mockStatuses = [
					{ Id: '1', MasterLabel: 'Qualified' },
					{ Id: '2', MasterLabel: 'New' },
					{ Id: '3', MasterLabel: 'Working' },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockStatuses);
				sortOptionsSpy.mockImplementation((options) => {
					return options.sort((a, b) => a.name.localeCompare(b.name));
				});

				const result =
					await node.methods.loadOptions.getLeadStatuses.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT id, MasterLabel FROM LeadStatus' },
				);
				expect(sortOptionsSpy).toHaveBeenCalled();

				expect(result).toEqual([
					{ name: 'New', value: 'New' },
					{ name: 'Qualified', value: 'Qualified' },
					{ name: 'Working', value: 'Working' },
				]);
			});

			it('should handle empty statuses response', async () => {
				salesforceApiRequestAllItemsSpy.mockResolvedValue([]);

				const result =
					await node.methods.loadOptions.getLeadStatuses.call(mockLoadOptionsFunctions);

				expect(result).toEqual([]);
			});
		});

		describe('getUsers', () => {
			it('should return users with sorted options', async () => {
				const mockUsers = [
					{ Id: 'user1', Name: 'John Doe' },
					{ Id: 'user2', Name: 'Jane Smith' },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockUsers);
				sortOptionsSpy.mockImplementation((options) => {
					return options.sort((a, b) => a.name.localeCompare(b.name));
				});

				const result = await node.methods.loadOptions.getUsers.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT id, Name FROM User' },
				);

				expect(result).toEqual([
					{ name: 'Jane Smith', value: 'user2' },
					{ name: 'John Doe', value: 'user1' },
				]);
			});
		});

		describe('getCaseOwners', () => {
			it('should return case owners with queues and users', async () => {
				const mockQueues = [
					{ Queue: { Id: 'queue1', Name: 'Support Queue' } },
					{ Queue: { Id: 'queue2', Name: 'Sales Queue' } },
				];
				const mockUsers = [
					{ Id: 'user1', Name: 'John Doe' },
					{ Id: 'user2', Name: 'Jane Smith' },
				];

				salesforceApiRequestAllItemsSpy
					.mockResolvedValueOnce(mockQueues)
					.mockResolvedValueOnce(mockUsers);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCaseOwners.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{
						q: "SELECT Queue.Id, Queue.Name FROM QueuesObject where Queue.Type='Queue' and SobjectType = 'Case'",
					},
				);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT id, Name FROM User' },
				);

				expect(result).toEqual([
					{ name: 'Queue: Support Queue', value: 'queue1' },
					{ name: 'Queue: Sales Queue', value: 'queue2' },
					{ name: 'User: John Doe', value: 'user1' },
					{ name: 'User: Jane Smith', value: 'user2' },
				]);
			});

			it('should handle users without queue prefix when no queues exist', async () => {
				salesforceApiRequestAllItemsSpy
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([{ Id: 'user1', Name: 'John Doe' }]);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCaseOwners.call(mockLoadOptionsFunctions);

				expect(result).toEqual([{ name: 'John Doe', value: 'user1' }]);
			});
		});

		describe('getLeadOwners', () => {
			it('should return lead owners with queues and users', async () => {
				const mockQueues = [{ Queue: { Id: 'queue1', Name: 'Lead Queue' } }];
				const mockUsers = [{ Id: 'user1', Name: 'John Doe' }];

				salesforceApiRequestAllItemsSpy
					.mockResolvedValueOnce(mockQueues)
					.mockResolvedValueOnce(mockUsers);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getLeadOwners.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{
						q: "SELECT Queue.Id, Queue.Name FROM QueuesObject where Queue.Type='Queue' and SobjectType = 'Lead'",
					},
				);

				expect(result).toEqual([
					{ name: 'Queue: Lead Queue', value: 'queue1' },
					{ name: 'User: John Doe', value: 'user1' },
				]);
			});
		});

		describe('getLeadSources', () => {
			it('should return lead sources from picklist values', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'LeadSource',
							picklistValues: [
								{ label: 'Web', value: 'Web' },
								{ label: 'Phone Inquiry', value: 'Phone Inquiry' },
								{ label: 'Partner Referral', value: 'Partner Referral' },
							],
						},
						{ name: 'OtherField', picklistValues: [] },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getLeadSources.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/lead/describe');
				expect(result).toEqual([
					{ name: 'Web', value: 'Web' },
					{ name: 'Phone Inquiry', value: 'Phone Inquiry' },
					{ name: 'Partner Referral', value: 'Partner Referral' },
				]);
			});
		});

		describe('getCustomFields', () => {
			it('should return custom fields for a resource', async () => {
				mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('Account');
				const mockDescribe = {
					fields: [
						{ name: 'CustomField1__c', label: 'Custom Field 1', custom: true },
						{ name: 'StandardField', label: 'Standard Field', custom: false },
						{ name: 'CustomField2__c', label: 'Custom Field 2', custom: true },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getCustomFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/Account/describe');
				expect(result).toEqual([
					{ name: 'Custom Field 1', value: 'CustomField1__c' },
					{ name: 'Custom Field 2', value: 'CustomField2__c' },
				]);
			});
		});

		describe('getRecordTypes', () => {
			it('should return active record types for a resource', async () => {
				mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('Account');
				const mockTypes = [
					{ Id: 'rt1', Name: 'Business Account', SobjectType: 'Account', IsActive: true },
					{ Id: 'rt2', Name: 'Personal Account', SobjectType: 'Account', IsActive: true },
					{ Id: 'rt3', Name: 'Inactive Type', SobjectType: 'Account', IsActive: false },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockTypes);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getRecordTypes.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{
						q: "SELECT Id, Name, SobjectType, IsActive FROM RecordType WHERE SobjectType = 'Account'",
					},
				);
				expect(result).toEqual([
					{ name: 'Business Account', value: 'rt1' },
					{ name: 'Personal Account', value: 'rt2' },
				]);
			});

			it('should handle custom objects for record types', async () => {
				mockLoadOptionsFunctions.getNodeParameter.mockImplementation((param) => {
					if (param === 'resource') return 'customObject';
					if (param === 'customObject') return 'CustomObject__c';
					return '';
				});

				const mockTypes = [
					{ Id: 'rt1', Name: 'Custom Type', SobjectType: 'CustomObject__c', IsActive: true },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockTypes);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getRecordTypes.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{
						q: "SELECT Id, Name, SobjectType, IsActive FROM RecordType WHERE SobjectType = 'CustomObject__c'",
					},
				);
				expect(result).toEqual([{ name: 'Custom Type', value: 'rt1' }]);
			});
		});

		describe('getExternalIdFields', () => {
			it('should return external ID and lookup fields', async () => {
				mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('Account');
				const mockDescribe = {
					fields: [
						{ name: 'ExternalId__c', label: 'External ID', externalId: true, idLookup: false },
						{ name: 'LookupField__c', label: 'Lookup Field', externalId: false, idLookup: true },
						{ name: 'RegularField', label: 'Regular Field', externalId: false, idLookup: false },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getExternalIdFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/Account/describe');
				expect(result).toEqual([
					{ name: 'External ID', value: 'ExternalId__c' },
					{ name: 'Lookup Field', value: 'LookupField__c' },
				]);
			});

			it('should handle custom object for external ID fields', async () => {
				mockLoadOptionsFunctions.getCurrentNodeParameter.mockImplementation((param) => {
					if (param === 'resource') return 'customObject';
					if (param === 'customObject') return 'CustomObject__c';
					return '';
				});

				const mockDescribe = {
					fields: [
						{ name: 'External__c', label: 'External Field', externalId: true, idLookup: false },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getExternalIdFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/sobjects/CustomObject__c/describe',
				);
				expect(result).toEqual([{ name: 'External Field', value: 'External__c' }]);
			});
		});

		describe('getAccounts', () => {
			it('should return accounts with sorted options', async () => {
				const mockAccounts = [
					{ Id: 'acc1', Name: 'ACME Corp' },
					{ Id: 'acc2', Name: 'ABC Inc' },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockAccounts);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getAccounts.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT id, Name FROM Account' },
				);
				expect(result).toEqual([
					{ name: 'ACME Corp', value: 'acc1' },
					{ name: 'ABC Inc', value: 'acc2' },
				]);
			});
		});

		describe('getCampaigns', () => {
			it('should return campaigns with sorted options', async () => {
				const mockCampaigns = [
					{ Id: 'camp1', Name: 'Spring Campaign' },
					{ Id: 'camp2', Name: 'Summer Campaign' },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockCampaigns);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCampaigns.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT id, Name FROM Campaign' },
				);
				expect(result).toEqual([
					{ name: 'Spring Campaign', value: 'camp1' },
					{ name: 'Summer Campaign', value: 'camp2' },
				]);
			});
		});

		describe('getStages', () => {
			it('should return opportunity stages from picklist values', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'StageName',
							picklistValues: [
								{ label: 'Prospecting', value: 'Prospecting' },
								{ label: 'Qualification', value: 'Qualification' },
								{ label: 'Closed Won', value: 'Closed Won' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getStages.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/sobjects/opportunity/describe',
				);
				expect(result).toEqual([
					{ name: 'Prospecting', value: 'Prospecting' },
					{ name: 'Qualification', value: 'Qualification' },
					{ name: 'Closed Won', value: 'Closed Won' },
				]);
			});
		});

		describe('getAccountTypes', () => {
			it('should return account types from picklist values', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Type',
							picklistValues: [
								{ label: 'Customer - Direct', value: 'Customer - Direct' },
								{ label: 'Customer - Channel', value: 'Customer - Channel' },
								{ label: 'Prospect', value: 'Prospect' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getAccountTypes.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/account/describe');
				expect(result).toEqual([
					{ name: 'Customer - Direct', value: 'Customer - Direct' },
					{ name: 'Customer - Channel', value: 'Customer - Channel' },
					{ name: 'Prospect', value: 'Prospect' },
				]);
			});
		});

		describe('getAccountSources', () => {
			it('should return account sources from picklist values', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'AccountSource',
							picklistValues: [
								{ label: 'Web', value: 'Web' },
								{ label: 'Phone Inquiry', value: 'Phone Inquiry' },
								{ label: 'Partner Referral', value: 'Partner Referral' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getAccountSources.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/account/describe');
				expect(result).toEqual([
					{ name: 'Web', value: 'Web' },
					{ name: 'Phone Inquiry', value: 'Phone Inquiry' },
					{ name: 'Partner Referral', value: 'Partner Referral' },
				]);
			});
		});

		describe('getCaseTypes', () => {
			it('should return case types from picklist values', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Type',
							picklistValues: [
								{ label: 'Feature Request', value: 'Feature Request' },
								{ label: 'Problem', value: 'Problem' },
								{ label: 'Question', value: 'Question' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCaseTypes.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/case/describe');
				expect(result).toEqual([
					{ name: 'Feature Request', value: 'Feature Request' },
					{ name: 'Problem', value: 'Problem' },
					{ name: 'Question', value: 'Question' },
				]);
			});
		});

		describe('getCaseStatuses', () => {
			it('should return case statuses from picklist values', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Status',
							picklistValues: [
								{ label: 'New', value: 'New' },
								{ label: 'Working', value: 'Working' },
								{ label: 'Closed', value: 'Closed' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getCaseStatuses.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/case/describe');
				expect(result).toEqual([
					{ name: 'New', value: 'New' },
					{ name: 'Working', value: 'Working' },
					{ name: 'Closed', value: 'Closed' },
				]);
			});
		});

		describe('getCustomObjects', () => {
			it('should return custom objects only', async () => {
				const mockSobjects = {
					sobjects: [
						{ name: 'Account', label: 'Account', custom: false },
						{ name: 'CustomObject1__c', label: 'Custom Object 1', custom: true },
						{ name: 'Contact', label: 'Contact', custom: false },
						{ name: 'CustomObject2__c', label: 'Custom Object 2', custom: true },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockSobjects);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getCustomObjects.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects');
				expect(result).toEqual([
					{ name: 'Custom Object 1', value: 'CustomObject1__c' },
					{ name: 'Custom Object 2', value: 'CustomObject2__c' },
				]);
			});
		});

		describe('getCustomObjectFields', () => {
			it('should return all fields for a custom object', async () => {
				mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('CustomObject__c');
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'ID' },
						{ name: 'Name', label: 'Name' },
						{ name: 'CustomField__c', label: 'Custom Field' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getCustomObjectFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/sobjects/CustomObject__c/describe',
				);
				expect(result).toEqual([
					{ name: 'ID', value: 'Id' },
					{ name: 'Name', value: 'Name' },
					{ name: 'Custom Field', value: 'CustomField__c' },
				]);
			});
		});

		describe('Field Methods', () => {
			it('should return account fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Account ID' },
						{ name: 'Name', label: 'Account Name' },
						{ name: 'Type', label: 'Account Type' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getAccountFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/account/describe');
				expect(result).toEqual([
					{ name: 'Account ID', value: 'Id' },
					{ name: 'Account Name', value: 'Name' },
					{ name: 'Account Type', value: 'Type' },
				]);
			});

			it('should return case fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Case ID' },
						{ name: 'Subject', label: 'Subject' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCaseFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/case/describe');
				expect(result).toEqual([
					{ name: 'Case ID', value: 'Id' },
					{ name: 'Subject', value: 'Subject' },
				]);
			});

			it('should return lead fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Lead ID' },
						{ name: 'FirstName', label: 'First Name' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getLeadFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/lead/describe');
				expect(result).toEqual([
					{ name: 'Lead ID', value: 'Id' },
					{ name: 'First Name', value: 'FirstName' },
				]);
			});

			it('should return opportunity fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Opportunity ID' },
						{ name: 'Name', label: 'Opportunity Name' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getOpportunityFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/sobjects/opportunity/describe',
				);
				expect(result).toEqual([
					{ name: 'Opportunity ID', value: 'Id' },
					{ name: 'Opportunity Name', value: 'Name' },
				]);
			});

			it('should return task fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Task ID' },
						{ name: 'Subject', label: 'Subject' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getTaskFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/task/describe');
				expect(result).toEqual([
					{ name: 'Task ID', value: 'Id' },
					{ name: 'Subject', value: 'Subject' },
				]);
			});

			it('should return user fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'User ID' },
						{ name: 'Name', label: 'Full Name' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getUserFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/user/describe');
				expect(result).toEqual([
					{ name: 'User ID', value: 'Id' },
					{ name: 'Full Name', value: 'Name' },
				]);
			});

			it('should return contact fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Contact ID' },
						{ name: 'FirstName', label: 'First Name' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getContactFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/contact/describe');
				expect(result).toEqual([
					{ name: 'Contact ID', value: 'Id' },
					{ name: 'First Name', value: 'FirstName' },
				]);
			});

			it('should return attachment fields', async () => {
				const mockDescribe = {
					fields: [
						{ name: 'Id', label: 'Attachment ID' },
						{ name: 'Name', label: 'File Name' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getAtachmentFields.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/sobjects/attachment/describe',
				);
				expect(result).toEqual([
					{ name: 'Attachment ID', value: 'Id' },
					{ name: 'File Name', value: 'Name' },
				]);
			});
		});

		describe('Task Picklist Methods', () => {
			it('should return task statuses', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Status',
							picklistValues: [
								{ label: 'Not Started', value: 'Not Started' },
								{ label: 'In Progress', value: 'In Progress' },
								{ label: 'Completed', value: 'Completed' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getTaskStatuses.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/task/describe');
				expect(result).toEqual([
					{ name: 'Not Started', value: 'Not Started' },
					{ name: 'In Progress', value: 'In Progress' },
					{ name: 'Completed', value: 'Completed' },
				]);
			});

			it('should return task types', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'TaskSubtype',
							picklistValues: [
								{ label: 'Call', value: 'Call' },
								{ label: 'Email', value: 'Email' },
								{ label: 'Meeting', value: 'Meeting' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getTaskTypes.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Call', value: 'Call' },
					{ name: 'Email', value: 'Email' },
					{ name: 'Meeting', value: 'Meeting' },
				]);
			});

			it('should return task subjects', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Subject',
							picklistValues: [
								{ label: 'Call', value: 'Call' },
								{ label: 'Send Letter/Quote', value: 'Send Letter/Quote' },
								{ label: 'Send Proposal/Price Quote', value: 'Send Proposal/Price Quote' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getTaskSubjects.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Call', value: 'Call' },
					{ name: 'Send Letter/Quote', value: 'Send Letter/Quote' },
					{ name: 'Send Proposal/Price Quote', value: 'Send Proposal/Price Quote' },
				]);
			});

			it('should return task call types', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'CallType',
							picklistValues: [
								{ label: 'Inbound', value: 'Inbound' },
								{ label: 'Outbound', value: 'Outbound' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getTaskCallTypes.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Inbound', value: 'Inbound' },
					{ name: 'Outbound', value: 'Outbound' },
				]);
			});

			it('should return task priorities', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Priority',
							picklistValues: [
								{ label: 'Low', value: 'Low' },
								{ label: 'Normal', value: 'Normal' },
								{ label: 'High', value: 'High' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getTaskPriorities.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Low', value: 'Low' },
					{ name: 'Normal', value: 'Normal' },
					{ name: 'High', value: 'High' },
				]);
			});

			it('should return task recurrence types', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'RecurrenceType',
							picklistValues: [
								{ label: 'RecursDaily', value: 'RecursDaily' },
								{ label: 'RecursWeekly', value: 'RecursWeekly' },
								{ label: 'RecursMonthly', value: 'RecursMonthly' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getTaskRecurrenceTypes.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'RecursDaily', value: 'RecursDaily' },
					{ name: 'RecursWeekly', value: 'RecursWeekly' },
					{ name: 'RecursMonthly', value: 'RecursMonthly' },
				]);
			});

			it('should return task recurrence instances', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'RecurrenceInstance',
							picklistValues: [
								{ label: 'First', value: 'First' },
								{ label: 'Second', value: 'Second' },
								{ label: 'Third', value: 'Third' },
								{ label: 'Fourth', value: 'Fourth' },
								{ label: 'Last', value: 'Last' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getTaskRecurrenceInstances.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'First', value: 'First' },
					{ name: 'Second', value: 'Second' },
					{ name: 'Third', value: 'Third' },
					{ name: 'Fourth', value: 'Fourth' },
					{ name: 'Last', value: 'Last' },
				]);
			});
		});

		describe('Case Picklist Methods', () => {
			it('should return case reasons', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Reason',
							picklistValues: [
								{ label: 'Installation', value: 'Installation' },
								{ label: 'Equipment Complexity', value: 'Equipment Complexity' },
								{ label: 'Performance', value: 'Performance' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCaseReasons.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Installation', value: 'Installation' },
					{ name: 'Equipment Complexity', value: 'Equipment Complexity' },
					{ name: 'Performance', value: 'Performance' },
				]);
			});

			it('should return case origins', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Origin',
							picklistValues: [
								{ label: 'Phone', value: 'Phone' },
								{ label: 'Email', value: 'Email' },
								{ label: 'Web', value: 'Web' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result = await node.methods.loadOptions.getCaseOrigins.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Phone', value: 'Phone' },
					{ name: 'Email', value: 'Email' },
					{ name: 'Web', value: 'Web' },
				]);
			});

			it('should return case priorities', async () => {
				const mockDescribe = {
					fields: [
						{
							name: 'Priority',
							picklistValues: [
								{ label: 'Low', value: 'Low' },
								{ label: 'Medium', value: 'Medium' },
								{ label: 'High', value: 'High' },
							],
						},
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockDescribe);
				sortOptionsSpy.mockImplementation((options) => options);

				const result =
					await node.methods.loadOptions.getCasePriorities.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Low', value: 'Low' },
					{ name: 'Medium', value: 'Medium' },
					{ name: 'High', value: 'High' },
				]);
			});
		});
	});

	describe('Execute Method', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { testData: 'value' } }]);
		});

		describe('Flow Resource', () => {
			it('should execute flow invoke operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'flow',
						operation: 'invoke',
						apiName: 'TestFlow',
						jsonParameters: true,
						variablesJson: { input1: 'value1', input2: 'value2' },
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/actions/custom/flow/TestFlow',
					{
						inputs: [{ input1: 'value1', input2: 'value2' }],
					},
				);
			});

			it('should execute flow invoke operation with UI variables', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'flow',
						operation: 'invoke',
						apiName: 'TestFlow',
						jsonParameters: false,
						variablesUi: {
							variablesValues: [
								{ name: 'VAR1', value: 'val1' },
								{ name: 'VAR2', value: 'val2' },
							],
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/actions/custom/flow/TestFlow',
					{
						inputs: [{ VAR1: 'val1', VAR2: 'val2' }],
					},
				);
			});

			it('should execute flow getAll operation with returnAll true', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'flow',
						operation: 'getAll',
						returnAll: true,
					};
					return params[param];
				});

				const mockFlows = {
					actions: [
						{ name: 'Flow1', label: 'Flow 1' },
						{ name: 'Flow2', label: 'Flow 2' },
						{ name: 'Flow3', label: 'Flow 3' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockFlows);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/actions/custom/flow');
			});

			it('should execute flow getAll operation with limit', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'flow',
						operation: 'getAll',
						returnAll: false,
						limit: 2,
					};
					return params[param];
				});

				const mockFlows = {
					actions: [
						{ name: 'Flow1', label: 'Flow 1' },
						{ name: 'Flow2', label: 'Flow 2' },
						{ name: 'Flow3', label: 'Flow 3' },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockFlows);

				await node.execute.call(mockExecuteFunctions);
			});
		});

		describe('Search Resource', () => {
			it('should execute search query operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'search',
						operation: 'query',
						query: 'SELECT Id, Name FROM Account',
					};
					return params[param];
				});

				const mockResults = [
					{ Id: '001000001', Name: 'Account 1' },
					{ Id: '001000002', Name: 'Account 2' },
				];

				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockResults);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT Id, Name FROM Account' },
				);
			});
		});

		describe('Opportunity Resource', () => {
			it('should handle opportunity create operation with all fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'opportunity',
						operation: 'create',
						name: 'Test Opportunity',
						closeDate: '2024-12-31',
						stageName: 'Qualification',
						additionalFields: {
							type: 'New Customer',
							amount: 50000,
							owner: 'user123',
							nextStep: 'Follow up call',
							accountId: 'acc123',
							campaignId: 'camp123',
							leadSource: 'Web',
							description: 'Test opportunity',
							probability: 75,
							pricebook2Id: 'pb123',
							forecastCategoryName: 'Pipeline',
							customFieldsUi: {
								customFieldsValues: [{ fieldId: 'Custom_Field__c', value: 'Custom Value' }],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'opp123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/opportunity',
					expect.objectContaining({
						Name: 'Test Opportunity',
						CloseDate: '2024-12-31',
						StageName: 'Qualification',
						Type: 'New Customer',
						Amount: 50000,
						OwnerId: 'user123',
						NextStep: 'Follow up call',
						AccountId: 'acc123',
						CampaignId: 'camp123',
						LeadSource: 'Web',
						Description: 'Test opportunity',
						Probability: 75,
						Pricebook2Id: 'pb123',
						ForecastCategoryName: 'Pipeline',
						Custom_Field__c: 'Custom Value',
					}),
				);
			});

			it('should handle opportunity upsert operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'opportunity',
						operation: 'upsert',
						name: 'Upsert Opportunity',
						closeDate: '2024-12-31',
						stageName: 'Negotiation',
						externalId: 'External_Id__c',
						externalIdValue: 'EXT123',
						additionalFields: {
							type: 'Existing Customer',
							External_Id__c: 'EXT123', // This should be removed from body
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'opp123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/opportunity/External_Id__c/EXT123',
					expect.objectContaining({
						Name: 'Upsert Opportunity',
						CloseDate: '2024-12-31',
						StageName: 'Negotiation',
						Type: 'Existing Customer',
					}),
				);

				// Ensure external ID field is removed from body
				const callArgs = salesforceApiRequestSpy.mock.calls[0];
				expect(callArgs[2]).not.toHaveProperty('External_Id__c');
			});

			it('should handle opportunity update operation with all fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'opportunity',
						operation: 'update',
						opportunityId: 'opp123',
						updateFields: {
							name: 'Updated Opportunity',
							closeDate: '2025-01-31',
							stageName: 'Closed Won',
							type: 'Existing Customer',
							amount: 75000,
							owner: 'user456',
							nextStep: 'Implementation',
							accountId: 'acc456',
							campaignId: 'camp456',
							leadSource: 'Referral',
							description: 'Updated description',
							probability: 90,
							pricebook2Id: 'pb456',
							forecastCategoryName: 'Closed',
							customFieldsUi: {
								customFieldsValues: [{ fieldId: 'Custom_Field__c', value: 'Updated Value' }],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/opportunity/opp123',
					expect.objectContaining({
						Name: 'Updated Opportunity',
						CloseDate: '2025-01-31',
						StageName: 'Closed Won',
						Type: 'Existing Customer',
						Amount: 75000,
						OwnerId: 'user456',
						NextStep: 'Implementation',
						AccountId: 'acc456',
						CampaignId: 'camp456',
						LeadSource: 'Referral',
						Description: 'Updated description',
						Probability: 90,
						Pricebook2Id: 'pb456',
						ForecastCategoryName: 'Closed',
						Custom_Field__c: 'Updated Value',
					}),
				);
			});
		});

		describe('Default Response Handling', () => {
			it('should return default response when responseData is undefined', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'create',
						company: 'Test Company',
						lastname: 'Test',
						additionalFields: {},
					};
					return params[param];
				});

				// Mock API to return undefined
				salesforceApiRequestSpy.mockResolvedValue(undefined);

				await node.execute.call(mockExecuteFunctions);
			});
		});

		describe('Error Handling', () => {
			it('should handle errors with continueOnFail true', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'create',
						company: 'Test Company',
						lastname: 'Test',
						additionalFields: {},
					};
					return params[param];
				});

				mockExecuteFunctions.continueOnFail.mockReturnValue(true);
				salesforceApiRequestSpy.mockRejectedValue(new Error('API Error'));

				await node.execute.call(mockExecuteFunctions);
			});

			it('should throw error with continueOnFail false', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'create',
						company: 'Test Company',
						lastname: 'Test',
						additionalFields: {},
					};
					return params[param];
				});

				mockExecuteFunctions.continueOnFail.mockReturnValue(false);
				const testError = new Error('API Error');
				salesforceApiRequestSpy.mockRejectedValue(testError);

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
			});
		});

		describe('Multiple Items Processing', () => {
			it('should process multiple input items', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{ json: { testData: 'value1' } },
					{ json: { testData: 'value2' } },
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'search',
						operation: 'query',
						query: 'SELECT Id FROM Account',
					};
					return params[param];
				});

				salesforceApiRequestAllItemsSpy
					.mockResolvedValueOnce([{ Id: '001000001', Name: 'Account 1' }])
					.mockResolvedValueOnce([{ Id: '001000002', Name: 'Account 2' }]);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledTimes(2);
			});
		});
	});
});
