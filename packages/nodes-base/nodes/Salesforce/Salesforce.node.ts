import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	salesforceApiRequest,
	salesforceApiRequestAllItems,
} from './GenericFunctions';
import {
	leadFields,
	leadOperations,
} from './LeadDescription';
import {
	contactFields,
	contactOperations,
} from './ContactDescription';
import {
	ICampaignMember,
} from './CampaignMemberInterface';
import {
	ILead,
} from './LeadInterface';

import {
	IContact,
 } from './ContactInterface';

export class Salesforce implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Salesforce',
		name: 'salesforce',
		icon: 'file:salesforce.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Salesforce API',
		defaults: {
			name: 'Salesforce',
			color: '#429fd9',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'salesforceApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Lead',
						value: 'lead',
						description: 'Represents a prospect or potential .',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Represents a contact, which is an individual associated with an account.',
					},
				],
				default: 'lead',
				description: 'Resource to consume.',
			},
			...leadOperations,
			...leadFields,
			...contactOperations,
			...contactFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the lead statuses to display them to user so that he can
			// select them easily
			async getLeadStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, MasterLabel FROM LeadStatus',
				};
				const statuses = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
				for (const status of statuses) {
					const statusName = status.MasterLabel;
					const statusId = status.Id;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},
			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, Name FROM User',
				};
				const users = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
				for (const user of users) {
					const userName = user.Name;
					const userId = user.Id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},
			// Get all the lead sources to display them to user so that he can
			// select them easily
			async getLeadSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				//find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead/describe');
				for (const field of fields) {
					if (field.name === 'LeadSource') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				return returnData;
			},
			// Get all the accounts to display them to user so that he can
			// select them easily
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, Name FROM Account',
				};
				const accounts = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
				for (const account of accounts) {
					const accountName = account.Name;
					const accountId = account.Id;
					returnData.push({
						name: accountName,
						value: accountId,
					});
				}
				return returnData;
			},
			// Get all the campaigns to display them to user so that he can
			// select them easily
			async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, Name FROM Campaign',
				};
				const campaigns = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
				for (const campaign of campaigns) {
					const campaignName = campaign.Name;
					const campaignId = campaign.Id;
					returnData.push({
						name: campaignName,
						value: campaignId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'lead') {
				//https://developer.salesforce.com/docs/api-explorer/sobject/Lead/post-lead
				if (operation === 'create') {
					const company = this.getNodeParameter('company', i) as string;
					const lastname = this.getNodeParameter('lastname', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: ILead = {
						Company: company,
						LastName: lastname,
					};
					if (additionalFields.email) {
						body.Email = additionalFields.email as string;
					}
					if (additionalFields.city) {
						body.City = additionalFields.city as string;
					}
					if (additionalFields.phone) {
						body.Phone = additionalFields.phone as string;
					}
					if (additionalFields.state) {
						body.State = additionalFields.state as string;
					}
					if (additionalFields.title) {
						body.Title = additionalFields.title as string;
					}
					if (additionalFields.jigsaw) {
						body.Jigsaw = additionalFields.jigsaw as string;
					}
					if (additionalFields.rating) {
						body.Rating = additionalFields.rating as string;
					}
					if (additionalFields.status) {
						body.Status = additionalFields.status as string;
					}
					if (additionalFields.street) {
						body.Street = additionalFields.street as string;
					}
					if (additionalFields.country) {
						body.Country = additionalFields.country as string;
					}
					if (additionalFields.ownerId) {
						body.OwnerId = additionalFields.ownerId as string;
					}
					if (additionalFields.website) {
						body.Website = additionalFields.website as string;
					}
					if (additionalFields.industry) {
						body.Industry = additionalFields.industry as string;
					}
					if (additionalFields.firstName) {
						body.FirstName = additionalFields.firstName as string;
					}
					if (additionalFields.leadSource) {
						body.LeadSource = additionalFields.leadSource as string;
					}
					if (additionalFields.postalCode) {
						body.PostalCode = additionalFields.postalCode as string;
					}
					if (additionalFields.salutation) {
						body.Salutation = additionalFields.salutation as string;
					}
					if (additionalFields.description) {
						body.Description = additionalFields.description as string;
					}
					if (additionalFields.annualRevenue) {
						body.AnnualRevenue = additionalFields.annualRevenue as number;
					}
					if (additionalFields.isUnreadByOwner) {
						body.IsUnreadByOwner = additionalFields.isUnreadByOwner as boolean;
					}
					if (additionalFields.numberOfEmployees) {
						body.NumberOfEmployees = additionalFields.numberOfEmployees as number;
					}
					responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/lead', body);
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Lead/patch-lead-id
				if (operation === 'update') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: ILead = {};
					if (!Object.keys(updateFields).length) {
						throw new Error('You must add at least one update field');
					}
					if (updateFields.lastname) {
						body.LastName = updateFields.lastname as string;
					}
					if (updateFields.company) {
						body.Company = updateFields.company as string;
					}
					if (updateFields.email) {
						body.Email = updateFields.email as string;
					}
					if (updateFields.city) {
						body.City = updateFields.city as string;
					}
					if (updateFields.phone) {
						body.Phone = updateFields.phone as string;
					}
					if (updateFields.state) {
						body.State = updateFields.state as string;
					}
					if (updateFields.title) {
						body.Title = updateFields.title as string;
					}
					if (updateFields.jigsaw) {
						body.Jigsaw = updateFields.jigsaw as string;
					}
					if (updateFields.rating) {
						body.Rating = updateFields.rating as string;
					}
					if (updateFields.status) {
						body.Status = updateFields.status as string;
					}
					if (updateFields.street) {
						body.Street = updateFields.street as string;
					}
					if (updateFields.country) {
						body.Country = updateFields.country as string;
					}
					if (updateFields.ownerId) {
						body.OwnerId = updateFields.ownerId as string;
					}
					if (updateFields.website) {
						body.Website = updateFields.website as string;
					}
					if (updateFields.industry) {
						body.Industry = updateFields.industry as string;
					}
					if (updateFields.firstName) {
						body.FirstName = updateFields.firstName as string;
					}
					if (updateFields.leadSource) {
						body.LeadSource = updateFields.leadSource as string;
					}
					if (updateFields.postalCode) {
						body.PostalCode = updateFields.postalCode as string;
					}
					if (updateFields.salutation) {
						body.Salutation = updateFields.salutation as string;
					}
					if (updateFields.description) {
						body.Description = updateFields.description as string;
					}
					if (updateFields.annualRevenue) {
						body.AnnualRevenue = updateFields.annualRevenue as number;
					}
					if (updateFields.isUnreadByOwner) {
						body.IsUnreadByOwner = updateFields.isUnreadByOwner as boolean;
					}
					if (updateFields.numberOfEmployees) {
						body.NumberOfEmployees = updateFields.numberOfEmployees as number;
					}
					responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/lead/${leadId}`, body);
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Lead/get-lead-id
				if (operation === 'get') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/lead/${leadId}`);
				}
				//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const qs: IDataObject = {};
					const fields = ['id'];
					if (options.fields) {
						// @ts-ignore
						fields.push(...options.fields.split(','))
					}
					try {
						if (returnAll) {
							qs.q = `SELECT ${fields.join(',')} FROM Lead`,
							responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.q = `SELECT ${fields.join(',')} FROM Lead Limit ${limit}`;
							responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
						}
					} catch(err) {
						throw new Error(`Salesforce Error: ${err}`);
					}
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Lead/delete-lead-id
				if (operation === 'delete') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					try {
						responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/lead/${leadId}`);
					} catch(err) {
						throw new Error(`Salesforce Error: ${err}`);
					}
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Lead/get-lead
				if (operation === 'getSummary') {
					responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead');
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/CampaignMember
				if (operation === 'addToCampaign') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					const campaignId = this.getNodeParameter('campaignId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: ICampaignMember = {
						LeadId: leadId,
						CampaignId: campaignId,
					};
					if (options.status) {
						body.Status = options.status as string;
					}
					responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/CampaignMember', body);
				}
			}
			if (resource === 'contact') {
				//https://developer.salesforce.com/docs/api-explorer/sobject/Contact/post-contact
				if (operation === 'create') {
					const lastname = this.getNodeParameter('lastname', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IContact = {
						LastName: lastname,
					};
					if (additionalFields.fax) {
						body.Fax = additionalFields.fax as string;
					}
					if (additionalFields.email) {
						body.Email = additionalFields.email as string;
					}
					if (additionalFields.phone) {
						body.Phone = additionalFields.phone as string;
					}
					if (additionalFields.title) {
						body.Title = additionalFields.title as string;
					}
					if (additionalFields.jigsaw) {
						body.Jigsaw = additionalFields.jigsaw as string;
					}
					if (additionalFields.ownerId) {
						body.OwnerId = additionalFields.ownerId as string;
					}
					if (additionalFields.acconuntId) {
						body.AccountId = additionalFields.acconuntId as string;
					}
					if (additionalFields.birthdate) {
						body.Birthdate = additionalFields.birthdate as string;
					}
					if (additionalFields.firstName) {
						body.FirstName = additionalFields.firstName as string;
					}
					if (additionalFields.homePhone) {
						body.HomePhone = additionalFields.homePhone as string;
					}
					if (additionalFields.otherCity) {
						body.OtherCity = additionalFields.otherCity as string;
					}
					if (additionalFields.department) {
						body.Department = additionalFields.department as string;
					}
					if (additionalFields.leadSource) {
						body.LeadSource = additionalFields.leadSource as string;
					}
					if (additionalFields.otherPhone) {
						body.OtherPhone = additionalFields.otherPhone as string;
					}
					if (additionalFields.otherState) {
						body.OtherState = additionalFields.otherState as string;
					}
					if (additionalFields.salutation) {
						body.Salutation = additionalFields.salutation as string;
					}
					if (additionalFields.description) {
						body.Description = additionalFields.description as string;
					}
					if (additionalFields.mailingCity) {
						body.MailingCity = additionalFields.mailingCity as string;
					}
					if (additionalFields.mobilePhone) {
						body.MobilePhone = additionalFields.mobilePhone as string;
					}
					if (additionalFields.otherStreet) {
						body.OtherStreet = additionalFields.otherStreet as string;
					}
					if (additionalFields.mailingState) {
						body.MailingState = additionalFields.mailingState as string;
					}
					if (additionalFields.otherCountry) {
						body.OtherCountry = additionalFields.otherCountry as string;
					}
					if (additionalFields.assistantName) {
						body.AssistantName = additionalFields.assistantName as string;
					}
					if (additionalFields.mailingStreet) {
						body.MailingStreet = additionalFields.mailingStreet as string;
					}
					if (additionalFields.assistantPhone) {
						body.AssistantPhone = additionalFields.assistantPhone as string;
					}
					if (additionalFields.mailingCountry) {
						body.MailingCountry = additionalFields.mailingCountry as string;
					}
					if (additionalFields.otherPostalCode) {
						body.OtherPostalCode = additionalFields.otherPostalCode as string;
					}
					if (additionalFields.emailBouncedDate) {
						body.EmailBouncedDate = additionalFields.emailBouncedDate as string;
					}
					if (additionalFields.mailingPostalCode) {
						body.MailingPostalCode = additionalFields.mailingPostalCode as string;
					}
					if (additionalFields.emailBouncedReason) {
						body.EmailBouncedReason = additionalFields.emailBouncedReason as string;
					}
					responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/contact', body);
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Contact/patch-contact-id
				if (operation === 'update') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IContact = {};
					if (!Object.keys(updateFields).length) {
						throw new Error('You must add at least one update field');
					}
					if (updateFields.fax) {
						body.Fax = updateFields.fax as string;
					}
					if (updateFields.email) {
						body.Email = updateFields.email as string;
					}
					if (updateFields.phone) {
						body.Phone = updateFields.phone as string;
					}
					if (updateFields.title) {
						body.Title = updateFields.title as string;
					}
					if (updateFields.jigsaw) {
						body.Jigsaw = updateFields.jigsaw as string;
					}
					if (updateFields.ownerId) {
						body.OwnerId = updateFields.ownerId as string;
					}
					if (updateFields.acconuntId) {
						body.AccountId = updateFields.acconuntId as string;
					}
					if (updateFields.birthdate) {
						body.Birthdate = updateFields.birthdate as string;
					}
					if (updateFields.firstName) {
						body.FirstName = updateFields.firstName as string;
					}
					if (updateFields.homePhone) {
						body.HomePhone = updateFields.homePhone as string;
					}
					if (updateFields.otherCity) {
						body.OtherCity = updateFields.otherCity as string;
					}
					if (updateFields.department) {
						body.Department = updateFields.department as string;
					}
					if (updateFields.leadSource) {
						body.LeadSource = updateFields.leadSource as string;
					}
					if (updateFields.otherPhone) {
						body.OtherPhone = updateFields.otherPhone as string;
					}
					if (updateFields.otherState) {
						body.OtherState = updateFields.otherState as string;
					}
					if (updateFields.salutation) {
						body.Salutation = updateFields.salutation as string;
					}
					if (updateFields.description) {
						body.Description = updateFields.description as string;
					}
					if (updateFields.mailingCity) {
						body.MailingCity = updateFields.mailingCity as string;
					}
					if (updateFields.mobilePhone) {
						body.MobilePhone = updateFields.mobilePhone as string;
					}
					if (updateFields.otherStreet) {
						body.OtherStreet = updateFields.otherStreet as string;
					}
					if (updateFields.mailingState) {
						body.MailingState = updateFields.mailingState as string;
					}
					if (updateFields.otherCountry) {
						body.OtherCountry = updateFields.otherCountry as string;
					}
					if (updateFields.assistantName) {
						body.AssistantName = updateFields.assistantName as string;
					}
					if (updateFields.mailingStreet) {
						body.MailingStreet = updateFields.mailingStreet as string;
					}
					if (updateFields.assistantPhone) {
						body.AssistantPhone = updateFields.assistantPhone as string;
					}
					if (updateFields.mailingCountry) {
						body.MailingCountry = updateFields.mailingCountry as string;
					}
					if (updateFields.otherPostalCode) {
						body.OtherPostalCode = updateFields.otherPostalCode as string;
					}
					if (updateFields.emailBouncedDate) {
						body.EmailBouncedDate = updateFields.emailBouncedDate as string;
					}
					if (updateFields.mailingPostalCode) {
						body.MailingPostalCode = updateFields.mailingPostalCode as string;
					}
					if (updateFields.emailBouncedReason) {
						body.EmailBouncedReason = updateFields.emailBouncedReason as string;
					}
					responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/contact/${contactId}`, body);
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Contact/get-contact-id
				if (operation === 'get') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/contact/${contactId}`);
				}
				//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const qs: IDataObject = {};
					const fields = ['id'];
					if (options.fields) {
						// @ts-ignore
						fields.push(...options.fields.split(','))
					}
					try {
						if (returnAll) {
							qs.q = `SELECT ${fields.join(',')} FROM Contact`,
							responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.q = `SELECT ${fields.join(',')} FROM Contact Limit ${limit}`;
							responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
						}
					} catch(err) {
						throw new Error(`Salesforce Error: ${err}`);
					}
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Contact/delete-contact-id
				if (operation === 'delete') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					try {
						responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/contact/${contactId}`);
					} catch(err) {
						throw new Error(`Salesforce Error: ${err}`);
					}
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/Contact/get-contact
				if (operation === 'getSummary') {
					responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/contact');
				}
				//https://developer.salesforce.com/docs/api-explorer/sobject/CampaignMember
				if (operation === 'addToCampaign') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					const campaignId = this.getNodeParameter('campaignId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: ICampaignMember = {
						ContactId: contactId,
						CampaignId: campaignId,
					};
					if (options.status) {
						body.Status = options.status as string;
					}
					responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/CampaignMember', body);
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
