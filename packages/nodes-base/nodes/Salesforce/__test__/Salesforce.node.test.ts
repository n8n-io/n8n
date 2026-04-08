import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, ILoadOptionsFunctions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

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

		// Set up common mock implementations that are used in most tests
		sortOptionsSpy.mockImplementation((options) => options);
	});

	afterEach(() => {
		jest.resetAllMocks();
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

	describe('Execute Method - Lead Resource', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { testData: 'value' } }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index?: number): any => {
					return mockExecuteFunctions.getNodeParameter.mock.results[0]?.value?.[param] || '';
				},
			);
		});

		describe('Lead Create Operation', () => {
			it('should handle lead create with minimal fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'create',
						company: 'Test Company',
						lastname: 'Test Lead',
						additionalFields: {},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'lead123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/lead',
					expect.objectContaining({
						Company: 'Test Company',
						LastName: 'Test Lead',
					}),
				);
			});

			it('should handle lead create with all additional fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'create',
						company: 'ACME Corp',
						lastname: 'Doe',
						additionalFields: {
							hasOptedOutOfEmail: true,
							hasOptedOutOfFax: false,
							email: 'test@example.com',
							city: 'New York',
							phone: '+1234567890',
							state: 'NY',
							title: 'Manager',
							jigsaw: 'JIGSAW123',
							rating: 'Hot',
							status: 'Qualified',
							street: '123 Main St',
							country: 'USA',
							owner: 'user123',
							website: 'https://example.com',
							industry: 'Technology',
							fax: 1234567890,
							firstname: 'John',
							leadSource: 'Web',
							postalCode: '10001',
							salutation: 'Mr.',
							description: 'Test lead description',
							annualRevenue: 50000,
							isUnreadByOwner: true,
							numberOfEmployees: 100,
							mobilePhone: '+1987654321',
							recordTypeId: 'rt123',
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Custom_Field1__c', value: 'Custom Value 1' },
									{ fieldId: 'Custom_Field2__c', value: 'Custom Value 2' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'lead456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/lead',
					expect.objectContaining({
						Company: 'ACME Corp',
						LastName: 'Doe',
						HasOptedOutOfEmail: true,
						HasOptedOutOfFax: false,
						Email: 'test@example.com',
						City: 'New York',
						Phone: '+1234567890',
						State: 'NY',
						Title: 'Manager',
						Jigsaw: 'JIGSAW123',
						Rating: 'Hot',
						Status: 'Qualified',
						Street: '123 Main St',
						Country: 'USA',
						OwnerId: 'user123',
						Website: 'https://example.com',
						Industry: 'Technology',
						Fax: 1234567890,
						FirstName: 'John',
						LeadSource: 'Web',
						PostalCode: '10001',
						Salutation: 'Mr.',
						Description: 'Test lead description',
						AnnualRevenue: 50000,
						IsUnreadByOwner: true,
						NumberOfEmployees: 100,
						MobilePhone: '+1987654321',
						RecordTypeId: 'rt123',
						Custom_Field1__c: 'Custom Value 1',
						Custom_Field2__c: 'Custom Value 2',
					}),
				);
			});

			it('should handle lead upsert operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(param: string, index?: number): any => {
						const params: Record<string, unknown> = {
							resource: 'lead',
							operation: 'upsert',
							company: 'Upsert Company',
							lastname: 'Upsert Lead',
							externalId: 'External_Id__c',
							externalIdValue: 'EXT123',
							additionalFields: {
								email: 'upsert@example.com',
								External_Id__c: 'EXT123', // Should be removed from body
							},
						};
						if (param === 'externalId' && index === 0) {
							return params.externalId;
						}
						if (param === 'externalIdValue') {
							return params.externalIdValue;
						}
						return params[param];
					},
				);

				salesforceApiRequestSpy.mockResolvedValue({ id: 'lead789', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/lead/External_Id__c/EXT123',
					expect.objectContaining({
						Company: 'Upsert Company',
						LastName: 'Upsert Lead',
						Email: 'upsert@example.com',
					}),
				);

				// Ensure external ID field is removed from body
				const callArgs = salesforceApiRequestSpy.mock.calls[0];
				expect(callArgs[2]).not.toHaveProperty('External_Id__c');
			});
		});

		describe('Lead Update Operation', () => {
			it('should handle lead update with all fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'update',
						leadId: 'lead123',
						updateFields: {
							hasOptedOutOfEmail: false,
							hasOptedOutOfFax: true,
							lastname: 'Updated Doe',
							company: 'Updated Company',
							email: 'updated@example.com',
							city: 'Updated City',
							phone: '+1111111111',
							state: 'CA',
							title: 'Senior Manager',
							jigsaw: 'UPDATED123',
							rating: 'Warm',
							status: 'Working',
							street: '456 Updated St',
							country: 'Canada',
							owner: 'user456',
							website: 'https://updated.com',
							industry: 'Healthcare',
							firstname: 'Jane',
							fax: 9876543210,
							leadSource: 'Referral',
							postalCode: '90210',
							salutation: 'Ms.',
							description: 'Updated description',
							annualRevenue: 75000,
							isUnreadByOwner: false,
							numberOfEmployees: 200,
							mobilePhone: '+1555555555',
							recordTypeId: 'rt456',
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Custom_Field3__c', value: 'Updated Custom Value' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/lead/lead123',
					expect.objectContaining({
						HasOptedOutOfEmail: false,
						hasOptedOutOfFax: true, // Note: This is a bug in the original code (should be HasOptedOutOfFax)
						LastName: 'Updated Doe',
						Company: 'Updated Company',
						Email: 'updated@example.com',
						City: 'Updated City',
						Phone: '+1111111111',
						State: 'CA',
						Title: 'Senior Manager',
						Jigsaw: 'UPDATED123',
						Rating: 'Warm',
						Status: 'Working',
						Street: '456 Updated St',
						Country: 'Canada',
						OwnerId: 'user456',
						Website: 'https://updated.com',
						Industry: 'Healthcare',
						FirstName: 'Jane',
						Fax: 9876543210,
						LeadSource: 'Referral',
						PostalCode: '90210',
						Salutation: 'Ms.',
						Description: 'Updated description',
						AnnualRevenue: 75000,
						IsUnreadByOwner: false,
						NumberOfEmployees: 200,
						MobilePhone: '+1555555555',
						RecordTypeId: 'rt456',
						Custom_Field3__c: 'Updated Custom Value',
					}),
				);
			});

			it('should throw error when no update fields provided', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'update',
						leadId: 'lead123',
						updateFields: {},
					};
					return params[param];
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'You must add at least one update field',
				);
			});
		});

		describe('Lead Other Operations', () => {
			it('should handle lead get operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'get',
						leadId: 'lead123',
					};
					return params[param];
				});

				const mockLead = { Id: 'lead123', FirstName: 'John', LastName: 'Doe' };
				salesforceApiRequestSpy.mockResolvedValue(mockLead);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/lead/lead123');
			});

			it('should handle lead getAll operation with returnAll true', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'getAll',
						returnAll: true,
						options: { fields: 'Id,FirstName,LastName' },
					};
					return params[param];
				});

				const mockLeads = [
					{ Id: 'lead1', FirstName: 'John', LastName: 'Doe' },
					{ Id: 'lead2', FirstName: 'Jane', LastName: 'Smith' },
				];

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id,FirstName,LastName FROM Lead');
				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockLeads);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith({ fields: 'Id,FirstName,LastName' }, 'Lead', true);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT Id,FirstName,LastName FROM Lead' },
				);
			});

			it('should handle lead getAll operation with limit', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'getAll',
						returnAll: false,
						limit: 50,
						options: {},
					};
					return params[param];
				});

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT * FROM Lead LIMIT 50');
				salesforceApiRequestAllItemsSpy.mockResolvedValue([]);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith({}, 'Lead', false, 50);
			});

			it('should handle lead delete operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'delete',
						leadId: 'lead123',
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('DELETE', '/sobjects/lead/lead123');
			});

			it('should handle lead getSummary operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'getSummary',
					};
					return params[param];
				});

				const mockSummary = { objectDescribe: { name: 'Lead', fields: [] } };
				salesforceApiRequestSpy.mockResolvedValue(mockSummary);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/lead');
			});

			it('should handle lead addToCampaign operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'addToCampaign',
						leadId: 'lead123',
						campaignId: 'campaign456',
						options: { status: 'Sent' },
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'cm123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/CampaignMember',
					expect.objectContaining({
						LeadId: 'lead123',
						CampaignId: 'campaign456',
						Status: 'Sent',
					}),
				);
			});

			it('should handle lead addNote operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'lead',
						operation: 'addNote',
						leadId: 'lead123',
						title: 'Important Note',
						options: {
							body: 'This is the note body',
							owner: 'user789',
							isPrivate: true,
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'note123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/note',
					expect.objectContaining({
						Title: 'Important Note',
						ParentId: 'lead123',
						Body: 'This is the note body',
						OwnerId: 'user789',
						IsPrivate: true,
					}),
				);
			});
		});
	});

	describe('Execute Method - Case Resource', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { testData: 'value' } }]);
		});

		describe('Case Create Operation', () => {
			it('should handle case create with minimal fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'create',
						type: 'Problem',
						additionalFields: {},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'case123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/case',
					expect.objectContaining({
						Type: 'Problem',
					}),
				);
			});

			it('should handle case create with all additional fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'create',
						type: 'Feature Request',
						additionalFields: {
							origin: 'Web',
							reason: 'Installation',
							status: 'New',
							owner: 'user123',
							subject: 'Test Case Subject',
							parentId: 'parent123',
							priority: 'High',
							accountId: 'acc123',
							contactId: 'contact123',
							description: 'Test case description',
							isEscalated: true,
							suppliedName: 'John Doe',
							suppliedEmail: 'john@example.com',
							suppliedPhone: '+1234567890',
							suppliedCompany: 'Test Company',
							recordTypeId: 'rt123',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'case456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/case',
					expect.objectContaining({
						Type: 'Feature Request',
						Origin: 'Web',
						Reason: 'Installation',
						Status: 'New',
						OwnerId: 'user123',
						Subject: 'Test Case Subject',
						ParentId: 'parent123',
						Priority: 'High',
						AccountId: 'acc123',
						ContactId: 'contact123',
						Description: 'Test case description',
						IsEscalated: true,
						SuppliedName: 'John Doe',
						SuppliedEmail: 'john@example.com',
						SuppliedPhone: '+1234567890',
						SuppliedCompany: 'Test Company',
						RecordTypeId: 'rt123',
					}),
				);
			});

			it('should handle case create with custom fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'create',
						type: 'Question',
						additionalFields: {
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Custom_Field1__c', value: 'Custom Value 1' },
									{ fieldId: 'Custom_Field2__c', value: 'Custom Value 2' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'case789', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/case',
					expect.objectContaining({
						Type: 'Question',
						Custom_Field1__c: 'Custom Value 1',
						Custom_Field2__c: 'Custom Value 2',
					}),
				);
			});
		});

		describe('Case Update Operation', () => {
			it('should handle case update with all fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'update',
						caseId: 'case123',
						updateFields: {
							type: 'Updated Problem',
							origin: 'Email',
							reason: 'Performance',
							status: 'Working',
							owner: 'user456',
							subject: 'Updated Case Subject',
							parentId: 'parent456',
							priority: 'Medium',
							accountId: 'acc456',
							recordTypeId: 'rt456',
							contactId: 'contact456',
							description: 'Updated case description',
							isEscalated: false,
							suppliedName: 'Jane Smith',
							suppliedEmail: 'jane@example.com',
							suppliedPhone: '+1987654321',
							suppliedCompany: 'Updated Company',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/case/case123',
					expect.objectContaining({
						Type: 'Updated Problem',
						Origin: 'Email',
						Reason: 'Performance',
						Status: 'Working',
						OwnerId: 'user456',
						Subject: 'Updated Case Subject',
						ParentId: 'parent456',
						Priority: 'Medium',
						AccountId: 'acc456',
						RecordTypeId: 'rt456',
						ContactId: 'contact456',
						Description: 'Updated case description',
						IsEscalated: false,
						SuppliedName: 'Jane Smith',
						SuppliedEmail: 'jane@example.com',
						SuppliedPhone: '+1987654321',
						SuppliedCompany: 'Updated Company',
					}),
				);
			});

			it('should handle case update with custom fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'update',
						caseId: 'case789',
						updateFields: {
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Updated_Custom_Field__c', value: 'Updated Custom Value' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/case/case789',
					expect.objectContaining({
						Updated_Custom_Field__c: 'Updated Custom Value',
					}),
				);
			});
		});

		describe('Case Other Operations', () => {
			it('should handle case get operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'get',
						caseId: 'case123',
					};
					return params[param];
				});

				const mockCase = { Id: 'case123', Subject: 'Test Case', Type: 'Problem' };
				salesforceApiRequestSpy.mockResolvedValue(mockCase);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/case/case123');
			});

			it('should handle case getAll operation with returnAll true', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'getAll',
						returnAll: true,
						options: { fields: 'Id,Subject,Type' },
					};
					return params[param];
				});

				const mockCases = [
					{ Id: 'case1', Subject: 'Case 1', Type: 'Problem' },
					{ Id: 'case2', Subject: 'Case 2', Type: 'Question' },
				];

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id,Subject,Type FROM Case');
				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockCases);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith({ fields: 'Id,Subject,Type' }, 'Case', true);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT Id,Subject,Type FROM Case' },
				);
			});

			it('should handle case getAll operation with limit', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'getAll',
						returnAll: false,
						limit: 25,
						options: {},
					};
					return params[param];
				});

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT * FROM Case LIMIT 25');
				salesforceApiRequestAllItemsSpy.mockResolvedValue([]);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith({}, 'Case', false, 25);
			});

			it('should handle case getAll operation error handling', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'getAll',
						returnAll: true,
						options: {},
					};
					return params[param];
				});

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT * FROM Case');
				salesforceApiRequestAllItemsSpy.mockRejectedValue(new Error('API Error'));

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});

			it('should handle case delete operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'delete',
						caseId: 'case123',
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('DELETE', '/sobjects/case/case123');
			});

			it('should handle case delete operation error handling', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'delete',
						caseId: 'case123',
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockRejectedValue(new Error('Delete error'));

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});

			it('should handle case getSummary operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'getSummary',
					};
					return params[param];
				});

				const mockSummary = { objectDescribe: { name: 'Case', fields: [] } };
				salesforceApiRequestSpy.mockResolvedValue(mockSummary);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/case');
			});

			it('should handle case addComment operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'addComment',
						caseId: 'case123',
						options: {
							commentBody: 'This is a test comment',
							isPublished: true,
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'comment123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/casecomment',
					expect.objectContaining({
						ParentId: 'case123',
						CommentBody: 'This is a test comment',
						IsPublished: true,
					}),
				);
			});

			it('should handle case addComment operation with minimal options', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'case',
						operation: 'addComment',
						caseId: 'case456',
						options: {},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'comment456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/casecomment',
					expect.objectContaining({
						ParentId: 'case456',
					}),
				);
			});
		});
	});

	describe('Execute Method - Contact Resource', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { testData: 'value' } }]);
		});

		describe('Contact Create Operation', () => {
			it('should handle contact create with minimal fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'create',
						lastname: 'Test Contact',
						additionalFields: {},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'contact123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/contact',
					expect.objectContaining({
						LastName: 'Test Contact',
					}),
				);
			});

			it('should handle contact create with all additional fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'create',
						lastname: 'Smith',
						additionalFields: {
							fax: '1234567890',
							email: 'contact@example.com',
							phone: '+1234567890',
							title: 'Director',
							jigsaw: 'JIGSAW456',
							recordTypeId: 'rt789',
							owner: 'user456',
							acconuntId: 'acc123', // Note: This is a typo in the original code
							birthdate: '1990-01-01',
							firstName: 'Jane',
							homePhone: '+1987654321',
							otherCity: 'Other City',
							department: 'Sales',
							leadSource: 'Cold Call',
							otherPhone: '+1555555555',
							otherState: 'TX',
							salutation: 'Mrs.',
							description: 'Contact description',
							mailingCity: 'Mailing City',
							mobilePhone: '+1777777777',
							otherStreet: '789 Other St',
							mailingState: 'FL',
							otherCountry: 'Mexico',
							assistantName: 'Assistant Name',
							mailingStreet: '456 Mailing St',
							assistantPhone: '+1666666666',
							mailingCountry: 'USA',
							otherPostalCode: '54321',
							emailBouncedDate: '2023-01-01',
							mailingPostalCode: '12345',
							emailBouncedReason: 'Mailbox full',
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Contact_Custom__c', value: 'Contact Custom Value' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'contact456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/contact',
					expect.objectContaining({
						LastName: 'Smith',
						Fax: '1234567890',
						Email: 'contact@example.com',
						Phone: '+1234567890',
						Title: 'Director',
						Jigsaw: 'JIGSAW456',
						RecordTypeId: 'rt789',
						OwnerId: 'user456',
						AccountId: 'acc123',
						Birthdate: '1990-01-01',
						FirstName: 'Jane',
						HomePhone: '+1987654321',
						OtherCity: 'Other City',
						Department: 'Sales',
						LeadSource: 'Cold Call',
						OtherPhone: '+1555555555',
						OtherState: 'TX',
						Salutation: 'Mrs.',
						Description: 'Contact description',
						MailingCity: 'Mailing City',
						MobilePhone: '+1777777777',
						OtherStreet: '789 Other St',
						MailingState: 'FL',
						OtherCountry: 'Mexico',
						AssistantName: 'Assistant Name',
						MailingStreet: '456 Mailing St',
						AssistantPhone: '+1666666666',
						MailingCountry: 'USA',
						OtherPostalCode: '54321',
						EmailBouncedDate: '2023-01-01',
						MailingPostalCode: '12345',
						EmailBouncedReason: 'Mailbox full',
						Contact_Custom__c: 'Contact Custom Value',
					}),
				);
			});

			it('should handle contact upsert operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(param: string, index?: number): any => {
						const params: Record<string, unknown> = {
							resource: 'contact',
							operation: 'upsert',
							lastname: 'Upsert Contact',
							externalId: 'External_Contact_Id__c',
							externalIdValue: 'EXT_CONTACT_123',
							additionalFields: {
								email: 'upsert@contact.com',
								External_Contact_Id__c: 'EXT_CONTACT_123', // Should be removed from body
							},
						};
						if (param === 'externalId' && index === 0) {
							return params.externalId;
						}
						if (param === 'externalIdValue') {
							return params.externalIdValue;
						}
						return params[param];
					},
				);

				salesforceApiRequestSpy.mockResolvedValue({ id: 'contact789', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/contact/External_Contact_Id__c/EXT_CONTACT_123',
					expect.objectContaining({
						LastName: 'Upsert Contact',
						Email: 'upsert@contact.com',
					}),
				);

				// Ensure external ID field is removed from body
				const callArgs = salesforceApiRequestSpy.mock.calls[0];
				expect(callArgs[2]).not.toHaveProperty('External_Contact_Id__c');
			});
		});

		describe('Contact Update Operation', () => {
			it('should handle contact update with all fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'update',
						contactId: 'contact123',
						updateFields: {
							lastName: 'Updated Contact',
							fax: '9876543210',
							email: 'updated@contact.com',
							recordTypeId: 'rt999',
							phone: '+1999999999',
							title: 'Updated Director',
							jigsaw: 'UPDATED_JIGSAW',
							owner: 'user999',
							acconuntId: 'acc999', // Note: This is a typo in the original code
							birthdate: '1985-05-05',
							firstName: 'Updated Jane',
							homePhone: '+1888888888',
							otherCity: 'Updated Other City',
							department: 'Updated Sales',
							leadSource: 'Updated Cold Call',
							otherPhone: '+1777777777',
							otherState: 'Updated TX',
							salutation: 'Dr.',
							description: 'Updated contact description',
							mailingCity: 'Updated Mailing City',
							mobilePhone: '+1666666666',
							otherStreet: 'Updated 789 Other St',
							mailingState: 'Updated FL',
							otherCountry: 'Updated Mexico',
							assistantName: 'Updated Assistant Name',
							mailingStreet: 'Updated 456 Mailing St',
							assistantPhone: '+1555555555',
							mailingCountry: 'Updated USA',
							otherPostalCode: 'Updated 54321',
							emailBouncedDate: '2024-01-01',
							mailingPostalCode: 'Updated 12345',
							emailBouncedReason: 'Updated Mailbox full',
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Updated_Contact_Custom__c', value: 'Updated Contact Custom Value' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/contact/contact123',
					expect.objectContaining({
						LastName: 'Updated Contact',
						Fax: '9876543210',
						Email: 'updated@contact.com',
						RecordTypeId: 'rt999',
						Phone: '+1999999999',
						Title: 'Updated Director',
						Jigsaw: 'UPDATED_JIGSAW',
						OwnerId: 'user999',
						AccountId: 'acc999',
						Birthdate: '1985-05-05',
						FirstName: 'Updated Jane',
						HomePhone: '+1888888888',
						OtherCity: 'Updated Other City',
						Department: 'Updated Sales',
						LeadSource: 'Updated Cold Call',
						OtherPhone: '+1777777777',
						OtherState: 'Updated TX',
						Salutation: 'Dr.',
						Description: 'Updated contact description',
						MailingCity: 'Updated Mailing City',
						MobilePhone: '+1666666666',
						OtherStreet: 'Updated 789 Other St',
						MailingState: 'Updated FL',
						OtherCountry: 'Updated Mexico',
						AssistantName: 'Updated Assistant Name',
						MailingStreet: 'Updated 456 Mailing St',
						AssistantPhone: '+1555555555',
						MailingCountry: 'Updated USA',
						OtherPostalCode: 'Updated 54321',
						EmailBouncedDate: '2024-01-01',
						MailingPostalCode: 'Updated 12345',
						EmailBouncedReason: 'Updated Mailbox full',
						Updated_Contact_Custom__c: 'Updated Contact Custom Value',
					}),
				);
			});

			it('should throw error when no update fields provided for contact', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'update',
						contactId: 'contact123',
						updateFields: {},
					};
					return params[param];
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'You must add at least one update field',
				);
			});
		});

		describe('Contact Other Operations', () => {
			it('should handle contact get operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'get',
						contactId: 'contact123',
					};
					return params[param];
				});

				const mockContact = { Id: 'contact123', FirstName: 'John', LastName: 'Doe' };
				salesforceApiRequestSpy.mockResolvedValue(mockContact);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/contact/contact123');
			});

			it('should handle contact getAll operation with returnAll true', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'getAll',
						returnAll: true,
						options: { fields: 'Id,FirstName,LastName' },
					};
					return params[param];
				});

				const mockContacts = [
					{ Id: 'contact1', FirstName: 'John', LastName: 'Doe' },
					{ Id: 'contact2', FirstName: 'Jane', LastName: 'Smith' },
				];

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id,FirstName,LastName FROM Contact');
				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockContacts);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith(
					{ fields: 'Id,FirstName,LastName' },
					'Contact',
					true,
				);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT Id,FirstName,LastName FROM Contact' },
				);
			});

			it('should handle contact delete operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'delete',
						contactId: 'contact123',
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'DELETE',
					'/sobjects/contact/contact123',
				);
			});

			it('should handle contact getSummary operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'getSummary',
					};
					return params[param];
				});

				const mockSummary = { objectDescribe: { name: 'Contact', fields: [] } };
				salesforceApiRequestSpy.mockResolvedValue(mockSummary);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/contact');
			});

			it('should handle contact addToCampaign operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'addToCampaign',
						contactId: 'contact123',
						campaignId: 'campaign456',
						options: { status: 'Responded' },
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'cm456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/CampaignMember',
					expect.objectContaining({
						ContactId: 'contact123',
						CampaignId: 'campaign456',
						Status: 'Responded',
					}),
				);
			});

			it('should handle contact addNote operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'contact',
						operation: 'addNote',
						contactId: 'contact123',
						title: 'Contact Note',
						options: {
							body: 'This is the contact note body',
							owner: 'user888',
							isPrivate: false,
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'note456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/note',
					expect.objectContaining({
						Title: 'Contact Note',
						ParentId: 'contact123',
						Body: 'This is the contact note body',
						OwnerId: 'user888',
						IsPrivate: false,
					}),
				);
			});
		});
	});

	describe('Execute Method - CustomObject Resource', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { testData: 'value' } }]);
		});

		describe('CustomObject Create Operation', () => {
			it('should handle customObject create with custom fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'customObject',
						operation: 'create',
						customObject: 'CustomObject__c',
						customFieldsUi: {
							customFieldsValues: [
								{ fieldId: 'Name', value: 'Test Custom Object' },
								{ fieldId: 'Custom_Field1__c', value: 'Custom Value 1' },
								{ fieldId: 'Custom_Field2__c', value: 'Custom Value 2' },
							],
						},
						additionalFields: {
							recordTypeId: 'rt123',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'custom123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/CustomObject__c',
					expect.objectContaining({
						Name: 'Test Custom Object',
						Custom_Field1__c: 'Custom Value 1',
						Custom_Field2__c: 'Custom Value 2',
						RecordTypeId: 'rt123',
					}),
				);
			});

			it('should handle customObject upsert operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(param: string, index?: number): any => {
						const params: Record<string, unknown> = {
							resource: 'customObject',
							operation: 'upsert',
							customObject: 'CustomObject__c',
							externalId: 'External_Id__c',
							externalIdValue: 'EXT_CUSTOM_123',
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Name', value: 'Upsert Custom Object' },
									{ fieldId: 'External_Id__c', value: 'EXT_CUSTOM_123' }, // Should be removed
								],
							},
							additionalFields: {},
						};
						if (param === 'externalId' && index === 0) {
							return params.externalId;
						}
						if (param === 'externalIdValue') {
							return params.externalIdValue;
						}
						return params[param];
					},
				);

				salesforceApiRequestSpy.mockResolvedValue({ id: 'custom456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/CustomObject__c/External_Id__c/EXT_CUSTOM_123',
					expect.objectContaining({
						Name: 'Upsert Custom Object',
					}),
				);

				// Ensure external ID field is removed from body
				const callArgs = salesforceApiRequestSpy.mock.calls[0];
				expect(callArgs[2]).not.toHaveProperty('External_Id__c');
			});
		});

		describe('CustomObject Update Operation', () => {
			it('should handle customObject update operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'customObject',
						operation: 'update',
						recordId: 'custom123',
						customObject: 'CustomObject__c',
						customFieldsUi: {
							customFieldsValues: [
								{ fieldId: 'Name', value: 'Updated Custom Object' },
								{ fieldId: 'Custom_Field1__c', value: 'Updated Custom Value 1' },
							],
						},
						updateFields: {
							recordTypeId: 'rt456',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/CustomObject__c/custom123',
					expect.objectContaining({
						Name: 'Updated Custom Object',
						Custom_Field1__c: 'Updated Custom Value 1',
						RecordTypeId: 'rt456',
					}),
				);
			});
		});

		describe('CustomObject Other Operations', () => {
			it('should handle customObject get operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'customObject',
						operation: 'get',
						customObject: 'CustomObject__c',
						recordId: 'custom123',
					};
					return params[param];
				});

				const mockCustomObject = { Id: 'custom123', Name: 'Test Custom Object' };
				salesforceApiRequestSpy.mockResolvedValue(mockCustomObject);

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/sobjects/CustomObject__c/custom123',
				);
			});

			it('should handle customObject getAll operation with returnAll true', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'customObject',
						operation: 'getAll',
						customObject: 'CustomObject__c',
						returnAll: true,
						options: {},
					};
					return params[param];
				});

				const mockCustomObjects = [
					{ Id: 'custom1', Name: 'Custom Object 1' },
					{ Id: 'custom2', Name: 'Custom Object 2' },
				];

				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT * FROM CustomObject__c');
				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockCustomObjects);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith({}, 'CustomObject__c', true);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{ q: 'SELECT * FROM CustomObject__c' },
				);
			});

			it('should handle customObject delete operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'customObject',
						operation: 'delete',
						customObject: 'CustomObject__c',
						recordId: 'custom123',
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'DELETE',
					'/sobjects/CustomObject__c/custom123',
				);
			});
		});
	});

	describe('Execute Method - Document Resource', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { testData: 'value' } }]);
		});

		describe('Document Upload Operation', () => {
			it('should handle document upload operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'document',
						operation: 'upload',
						title: 'Test Document',
						binaryPropertyName: 'data',
						additionalFields: {
							ownerId: 'user123',
							linkToObjectId: 'record456',
							fileExtension: 'pdf',
						},
					};
					return params[param];
				});

				const mockBinaryData = {
					data: Buffer.from('test file content'),
					mimeType: 'application/pdf',
					fileExtension: 'pdf',
					fileName: 'test.pdf',
				};

				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(
					mockBinaryData,
				);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					mockBinaryData.data,
				);

				salesforceApiRequestSpy.mockResolvedValue({ id: 'cv123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
				expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/sobjects/ContentVersion',
					{},
					{},
					undefined,
					expect.objectContaining({
						formData: expect.objectContaining({
							entity_content: expect.objectContaining({
								value: expect.any(String),
								options: { contentType: 'application/json' },
							}),
							VersionData: expect.objectContaining({
								value: mockBinaryData.data,
								options: { filename: 'Test Document.pdf' },
							}),
						}),
					}),
				);

				// Check entity_content JSON structure
				const callArgs = salesforceApiRequestSpy.mock.calls[0];
				const formData = (callArgs[5] as { formData: any }).formData;
				const entityContent = jsonParse(formData.entity_content.value as string);

				expect(entityContent).toEqual({
					Title: 'Test Document',
					ContentLocation: 'S',
					ownerId: 'user123',
					FirstPublishLocationId: 'record456',
					PathOnClient: 'Test Document.pdf',
				});
			});

			it('should handle document upload with minimal fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'document',
						operation: 'upload',
						title: 'Minimal Document',
						binaryPropertyName: 'data',
						additionalFields: {},
					};
					return params[param];
				});

				const mockBinaryData = {
					data: Buffer.from('minimal content'),
					mimeType: 'text/plain',
					fileExtension: 'txt',
					fileName: 'test.txt',
				};

				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(
					mockBinaryData,
				);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					mockBinaryData.data,
				);

				salesforceApiRequestSpy.mockResolvedValue({ id: 'cv456', success: true });

				await node.execute.call(mockExecuteFunctions);

				const callArgs = salesforceApiRequestSpy.mock.calls[0];
				expect(callArgs).toBeDefined();
				expect(callArgs[5]).toBeDefined();
				expect((callArgs[5] as { formData: any }).formData).toBeDefined();

				const formData = (callArgs[5] as { formData: any }).formData;
				const entityContent = jsonParse(formData.entity_content.value as string);

				expect(entityContent).toEqual({
					Title: 'Minimal Document',
					ContentLocation: 'S',
					PathOnClient: 'Minimal Document.txt',
				});

				expect(entityContent).not.toHaveProperty('ownerId');
				expect(entityContent).not.toHaveProperty('FirstPublishLocationId');
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

	describe('Execute Method - Account Resource Extended Fields', () => {
		describe('Account Create Operation - Additional Fields', () => {
			it('should handle account create with all additional fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'account',
						operation: 'create',
						name: 'Test Account',
						additionalFields: {
							fax: '555-0199',
							type: 'Customer - Direct',
							jigsaw: 'JIG123',
							phone: '555-0100',
							owner: 'user123',
							sicDesc: 'Technology Services',
							website: 'https://test.com',
							industry: 'Technology',
							parentId: 'parent123',
							billingCity: 'San Francisco',
							description: 'Test account description',
							billingState: 'CA',
							shippingCity: 'San Francisco',
							accountNumber: 'ACC-001',
							accountSource: 'Web',
							annualRevenue: 1000000,
							billingStreet: '123 Main St',
							shippingState: 'CA',
							billingCountry: 'USA',
							shippingStreet: '456 Oak Ave',
							shippingCountry: 'USA',
							billingPostalCode: '94105',
							numberOfEmployees: '50',
							shippingPostalCode: '94105',
							recordTypeId: 'rt123',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'acc123', success: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/account', {
					Name: 'Test Account',
					Fax: '555-0199',
					Type: 'Customer - Direct',
					Jigsaw: 'JIG123',
					Phone: '555-0100',
					OwnerId: 'user123',
					SicDesc: 'Technology Services',
					Website: 'https://test.com',
					Industry: 'Technology',
					ParentId: 'parent123',
					BillingCity: 'San Francisco',
					Description: 'Test account description',
					BillingState: 'CA',
					ShippingCity: 'San Francisco',
					AccountNumber: 'ACC-001',
					AccountSource: 'Web',
					AnnualRevenue: 1000000,
					BillingStreet: '123 Main St',
					ShippingState: 'CA',
					BillingCountry: 'USA',
					ShippingStreet: '456 Oak Ave',
					ShippingCountry: 'USA',
					BillingPostalCode: '94105',
					NumberOfEmployees: '50',
					ShippingPostalCode: '94105',
					RecordTypeId: 'rt123',
				});

				expect(result).toEqual([[{ json: { id: 'acc123', success: true }, pairedItem: 0 }]]);
			});

			it('should handle account create with custom fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'account',
						operation: 'create',
						name: 'Test Account',
						additionalFields: {
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Custom_Field__c', value: 'Custom Value 1' },
									{ fieldId: 'Another_Field__c', value: 'Custom Value 2' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'acc123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/account', {
					Name: 'Test Account',
					Custom_Field__c: 'Custom Value 1',
					Another_Field__c: 'Custom Value 2',
				});
			});

			it('should handle account upsert operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(param: string, index?: number): any => {
						if (param === 'externalId' && index === 0) return 'AccountNumber';
						if (param === 'externalIdValue') return 'ACC-001';
						const params: Record<string, unknown> = {
							resource: 'account',
							operation: 'upsert',
							name: 'Test Account',
							additionalFields: {
								fax: '555-0199',
								type: 'Customer - Direct',
							},
						};
						return params[param];
					},
				);

				salesforceApiRequestSpy.mockResolvedValue({ id: 'acc123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/account/AccountNumber/ACC-001',
					{
						Name: 'Test Account',
						Fax: '555-0199',
						Type: 'Customer - Direct',
					},
				);
			});
		});
	});

	describe('Execute Method - Task Resource Extended Fields', () => {
		describe('Task Create Operation - Additional Fields', () => {
			it('should handle task create with basic additional fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'create',
						status: 'Not Started',
						additionalFields: {
							type: 'Call',
							whoId: 'contact123',
							whatId: 'account123',
							owner: 'user123',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'task123', success: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/task', {
					Status: 'Not Started',
					TaskSubtype: 'Call',
					WhoId: 'contact123',
					WhatId: 'account123',
					OwnerId: 'user123',
				});

				expect(result).toEqual([[{ json: { id: 'task123', success: true }, pairedItem: 0 }]]);
			});

			it('should handle task create with all extended additional fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'create',
						status: 'In Progress',
						additionalFields: {
							activityDate: '2025-01-15',
							isReminderSet: true,
							recurrenceType: 'RecursDaily',
							callDisposition: 'Completed',
							reminderDateTime: '2025-01-15T10:00:00Z',
							recurrenceInstance: 'First',
							recurrenceInterval: 1,
							recurrenceDayOfMonth: 15,
							callDurationInSeconds: 1800,
							recurrenceEndDateOnly: '2025-12-31',
							recurrenceMonthOfYear: 'January',
							recurrenceDayOfWeekMask: 'Monday',
							recurrenceStartDateOnly: '2025-01-01',
							recurrenceTimeZoneSidKey: 'America/Los_Angeles',
							recurrenceRegeneratedType: 'RecurEvery',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'task123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/task', {
					Status: 'In Progress',
					ActivityDate: '2025-01-15',
					IsReminderSet: true,
					RecurrenceType: 'RecursDaily',
					CallDisposition: 'Completed',
					ReminderDateTime: '2025-01-15T10:00:00Z',
					RecurrenceInstance: 'First',
					RecurrenceInterval: 1,
					RecurrenceDayOfMonth: 15,
					CallDurationInSeconds: 1800,
					RecurrenceEndDateOnly: '2025-12-31',
					RecurrenceMonthOfYear: 'January',
					RecurrenceDayOfWeekMask: 'Monday',
					RecurrenceStartDateOnly: '2025-01-01',
					RecurrenceTimeZoneSidKey: 'America/Los_Angeles',
					RecurrenceRegeneratedType: 'RecurEvery',
				});
			});

			it('should handle task create with custom fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'create',
						status: 'Not Started',
						additionalFields: {
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Custom_Priority__c', value: 'High' },
									{ fieldId: 'Custom_Category__c', value: 'Sales' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'task123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/task', {
					Status: 'Not Started',
					Custom_Priority__c: 'High',
					Custom_Category__c: 'Sales',
				});
			});
		});

		describe('Task Update Operation - Update Fields', () => {
			it('should handle task update with basic fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'update',
						taskId: 'task123',
						updateFields: {
							type: 'Email',
							whoId: 'contact456',
							status: 'Completed',
							whatId: 'account456',
							owner: 'user456',
							subject: 'Updated Task',
							callType: 'Outbound',
							priority: 'High',
							callObject: 'Lead',
							description: 'Updated description',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'task123', success: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('PATCH', '/sobjects/task/task123', {
					TaskSubtype: 'Email',
					WhoId: 'contact456',
					Status: 'Completed',
					WhatId: 'account456',
					OwnerId: 'user456',
					Subject: 'Updated Task',
					CallType: 'Outbound',
					Priority: 'High',
					CallObject: 'Lead',
					Description: 'Updated description',
				});

				expect(result).toEqual([[{ json: { id: 'task123', success: true }, pairedItem: 0 }]]);
			});

			it('should handle task update with all extended fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'update',
						taskId: 'task123',
						updateFields: {
							activityDate: '2025-01-20',
							isReminderSet: false,
							recurrenceType: 'RecursWeekly',
							callDisposition: 'No Answer',
							reminderDateTime: '2025-01-20T14:00:00Z',
							recurrenceInstance: 'Second',
							recurrenceInterval: 2,
							recurrenceDayOfMonth: 20,
							callDurationInSeconds: 900,
							recurrenceEndDateOnly: '2025-06-30',
							recurrenceMonthOfYear: 'June',
							recurrenceDayOfWeekMask: 'Friday',
							recurrenceStartDateOnly: '2025-01-20',
							recurrenceTimeZoneSidKey: 'America/New_York',
							recurrenceRegeneratedType: 'RecurChild',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'task123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('PATCH', '/sobjects/task/task123', {
					ActivityDate: '2025-01-20',
					IsReminderSet: false,
					RecurrenceType: 'RecursWeekly',
					CallDisposition: 'No Answer',
					ReminderDateTime: '2025-01-20T14:00:00Z',
					RecurrenceInstance: 'Second',
					RecurrenceInterval: 2,
					RecurrenceDayOfMonth: 20,
					CallDurationInSeconds: 900,
					RecurrenceEndDateOnly: '2025-06-30',
					RecurrenceMonthOfYear: 'June',
					RecurrenceDayOfWeekMask: 'Friday',
					RecurrenceStartDateOnly: '2025-01-20',
					RecurrenceTimeZoneSidKey: 'America/New_York',
					RecurrenceRegeneratedType: 'RecurChild',
				});
			});

			it('should handle task update with custom fields', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'update',
						taskId: 'task123',
						updateFields: {
							subject: 'Updated Task',
							customFieldsUi: {
								customFieldsValues: [
									{ fieldId: 'Custom_Status__c', value: 'In Review' },
									{ fieldId: 'Custom_Notes__c', value: 'Updated notes' },
								],
							},
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'task123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('PATCH', '/sobjects/task/task123', {
					Subject: 'Updated Task',
					Custom_Status__c: 'In Review',
					Custom_Notes__c: 'Updated notes',
				});
			});
		});

		describe('Task GetAll Operation - Query and Error Handling', () => {
			it('should handle task getAll with limit', async () => {
				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id,Subject,Status FROM Task LIMIT 10');

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'getAll',
						returnAll: false,
						limit: 10,
						options: { fields: 'Id,Subject,Status' },
					};
					return params[param];
				});

				salesforceApiRequestAllItemsSpy.mockResolvedValue([
					{ Id: 'task1', Subject: 'Task 1', Status: 'Open' },
					{ Id: 'task2', Subject: 'Task 2', Status: 'Completed' },
				]);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith(
					{ fields: 'Id,Subject,Status' },
					'Task',
					false,
					10,
				);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{
						q: 'SELECT Id,Subject,Status FROM Task LIMIT 10',
					},
				);

				expect(result).toEqual([
					[
						{ json: { Id: 'task1', Subject: 'Task 1', Status: 'Open' }, pairedItem: 0 },
						{ json: { Id: 'task2', Subject: 'Task 2', Status: 'Completed' }, pairedItem: 1 },
					],
				]);
			});

			it('should handle task getAll operation error handling', async () => {
				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id FROM Task LIMIT 5');

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'task',
						operation: 'getAll',
						returnAll: false,
						limit: 5,
						options: {},
					};
					return params[param];
				});

				const testError = new Error('Query failed');
				salesforceApiRequestAllItemsSpy.mockRejectedValue(testError);

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Query failed');
			});
		});
	});

	describe('Execute Method - Attachment Resource', () => {
		describe('Attachment Create Operation', () => {
			it('should handle attachment create with minimal fields', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {},
						binary: {
							data: {
								data: 'SGVsbG8gV29ybGQ=',
								mimeType: 'text/plain',
								fileName: 'test.txt',
							},
						},
					},
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'create',
						name: 'Test File',
						parentId: 'parent123',
						binaryPropertyName: 'data',
						additionalFields: {},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'att123', success: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/attachment', {
					Name: 'Test File',
					ParentId: 'parent123',
					Body: 'SGVsbG8gV29ybGQ=',
					ContentType: 'text/plain',
				});

				expect(result).toEqual([[{ json: { id: 'att123', success: true }, pairedItem: 0 }]]);
			});

			it('should handle attachment create with all additional fields', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {},
						binary: {
							document: {
								data: 'UERGIGRhdGE=',
								mimeType: 'application/pdf',
								fileName: 'document.pdf',
							},
						},
					},
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'create',
						name: 'Important Document',
						parentId: 'parent456',
						binaryPropertyName: 'document',
						additionalFields: {
							description: 'Important business document',
							owner: 'user123',
							isPrivate: true,
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'att456', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('POST', '/sobjects/attachment', {
					Name: 'Important Document',
					ParentId: 'parent456',
					Body: 'UERGIGRhdGE=',
					ContentType: 'application/pdf',
					Description: 'Important business document',
					OwnerId: 'user123',
					IsPrivate: true,
				});
			});

			it('should throw error when binary property does not exist', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {},
						binary: {},
					},
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'create',
						name: 'Test File',
						parentId: 'parent123',
						binaryPropertyName: 'nonexistent',
						additionalFields: {},
					};
					return params[param];
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'The property nonexistent does not exist',
				);
			});
		});

		describe('Attachment Update Operation', () => {
			it('should handle attachment update with binary data', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {},
						binary: {
							newFile: {
								data: 'VXBkYXRlZCBkYXRh',
								mimeType: 'text/plain',
								fileName: 'updated.txt',
							},
						},
					},
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'update',
						attachmentId: 'att123',
						updateFields: {
							name: 'Updated File Name',
							binaryPropertyName: 'newFile',
							description: 'Updated description',
							owner: 'user456',
							isPrivate: false,
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'att123', success: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/attachment/att123',
					{
						Name: 'Updated File Name',
						Body: 'VXBkYXRlZCBkYXRh',
						ContentType: 'text/plain',
						Description: 'Updated description',
						OwnerId: 'user456',
						IsPrivate: false,
					},
				);

				expect(result).toEqual([[{ json: { id: 'att123', success: true }, pairedItem: 0 }]]);
			});

			it('should handle attachment update without binary data', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {},
					},
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'update',
						attachmentId: 'att123',
						updateFields: {
							name: 'Updated Name Only',
							description: 'Updated description',
						},
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'att123', success: true });

				await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'PATCH',
					'/sobjects/attachment/att123',
					{
						Name: 'Updated Name Only',
						Description: 'Updated description',
					},
				);
			});

			it('should throw error when binary property does not exist for update', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {},
						binary: {},
					},
				]);

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'update',
						attachmentId: 'att123',
						updateFields: {
							binaryPropertyName: 'missing',
						},
					};
					return params[param];
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'The property missing does not exist',
				);
			});
		});

		describe('Attachment Get Operation', () => {
			it('should handle attachment get operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'get',
						attachmentId: 'att123',
					};
					return params[param];
				});

				const mockAttachment = {
					Id: 'att123',
					Name: 'Test File',
					ParentId: 'parent123',
					ContentType: 'text/plain',
				};
				salesforceApiRequestSpy.mockResolvedValue(mockAttachment);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/attachment/att123');

				expect(result).toEqual([[{ json: mockAttachment, pairedItem: 0 }]]);
			});
		});

		describe('Attachment GetAll Operation', () => {
			it('should handle attachment getAll with returnAll true', async () => {
				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id,Name,ParentId FROM Attachment');

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'getAll',
						returnAll: true,
						options: { fields: 'Id,Name,ParentId' },
					};
					return params[param];
				});

				const mockAttachments = [
					{ Id: 'att1', Name: 'File 1', ParentId: 'parent1' },
					{ Id: 'att2', Name: 'File 2', ParentId: 'parent2' },
				];
				salesforceApiRequestAllItemsSpy.mockResolvedValue(mockAttachments);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith(
					{ fields: 'Id,Name,ParentId' },
					'Attachment',
					true,
				);
				expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'records',
					'GET',
					'/query',
					{},
					{
						q: 'SELECT Id,Name,ParentId FROM Attachment',
					},
				);

				expect(result).toEqual([
					[
						{ json: { Id: 'att1', Name: 'File 1', ParentId: 'parent1' }, pairedItem: 0 },
						{ json: { Id: 'att2', Name: 'File 2', ParentId: 'parent2' }, pairedItem: 1 },
					],
				]);
			});

			it('should handle attachment getAll with limit', async () => {
				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id,Name FROM Attachment LIMIT 5');

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'getAll',
						returnAll: false,
						limit: 5,
						options: {},
					};
					return params[param];
				});

				salesforceApiRequestAllItemsSpy.mockResolvedValue([{ Id: 'att1', Name: 'File 1' }]);

				await node.execute.call(mockExecuteFunctions);

				expect(getQuerySpy).toHaveBeenCalledWith({}, 'Attachment', false, 5);
			});

			it('should handle attachment getAll operation error handling', async () => {
				const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
				getQuerySpy.mockReturnValue('SELECT Id FROM Attachment');

				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'getAll',
						returnAll: true,
						options: {},
					};
					return params[param];
				});

				const testError = new Error('Query execution failed');
				salesforceApiRequestAllItemsSpy.mockRejectedValue(testError);

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Query execution failed',
				);
			});
		});

		describe('Attachment Delete Operation', () => {
			it('should handle attachment delete operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'delete',
						attachmentId: 'att123',
					};
					return params[param];
				});

				salesforceApiRequestSpy.mockResolvedValue({ id: 'att123', success: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith(
					'DELETE',
					'/sobjects/attachment/att123',
				);

				expect(result).toEqual([[{ json: { id: 'att123', success: true }, pairedItem: 0 }]]);
			});

			it('should handle attachment delete operation error handling', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'delete',
						attachmentId: 'att123',
					};
					return params[param];
				});

				const testError = new Error('Delete operation failed');
				salesforceApiRequestSpy.mockRejectedValue(testError);

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Delete operation failed',
				);
			});
		});

		describe('Attachment GetSummary Operation', () => {
			it('should handle attachment getSummary operation', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string): any => {
					const params: Record<string, unknown> = {
						resource: 'attachment',
						operation: 'getSummary',
					};
					return params[param];
				});

				const mockSummary = {
					objectDescribe: {
						name: 'Attachment',
						label: 'Attachment',
						fields: [{ name: 'Id' }, { name: 'Name' }],
					},
				};
				salesforceApiRequestSpy.mockResolvedValue(mockSummary);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects/attachment');

				expect(result).toEqual([[{ json: mockSummary, pairedItem: 0 }]]);
			});
		});
	});
});
