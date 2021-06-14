import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	zohoApiRequest,
	zohoApiRequestAllItems,
} from './GenericFunctions';

import {
	leadFields,
	leadOperations,
} from './LeadDescription';

import {
	IAddress,
	ILead,
} from './LeadInterface';

export class ZohoCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho CRM',
		name: 'zohoCrm',
		icon: 'file:zoho.svg',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		group: ['input'],
		version: 1,
		description: 'Consume Zoho CRM API.',
		defaults: {
			name: 'Zoho CRM',
			color: '#CE2232',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zohoOAuth2Api',
				required: true,
			},
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
					},
				],
				default: 'lead',
				description: 'The resource to operate on.',
			},
			...leadOperations,
			...leadFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { users } = await zohoApiRequest.call(this, 'GET', '/users', {}, { type: 'AllUsers' });
				for (const user of users) {
					const userName = `${user.first_name} ${user.last_name}`;
					const userId = user.profile.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},
			// Get all the available accounts to display them to user so that he can
			// select them easily
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.sort_by = 'Created_Time';
				qs.sort_order = 'desc';
				const { data } = await zohoApiRequest.call(this, 'GET', '/accounts', {}, qs);
				for (const account of data) {
					const accountName = account.Account_Name;
					const accountId = account.id;
					returnData.push({
						name: accountName,
						value: accountId,
					});
				}
				return returnData;
			},
			// Get all the available lead statuses to display them to user so that he can
			// select them easily
			async getLeadStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.module = 'leads';
				const { fields } = await zohoApiRequest.call(this, 'GET', '/settings/fields', {}, qs);
				for (const field of fields) {
					if (field.api_name === 'Lead_Status') {
						for (const value of field.pick_list_values) {
							const valueName = value.display_value;
							const valueId = value.actual_value;
							returnData.push({
								name: valueName,
								value: valueId,
							});
							return returnData;
						}
					}
				}
				return returnData;
			},
			// Get all the available lead sources to display them to user so that he can
			// select them easily
			async getLeadSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.module = 'leads';
				const { fields } = await zohoApiRequest.call(this, 'GET', '/settings/fields', {}, qs);
				for (const field of fields) {
					if (field.api_name === 'Lead_Source') {
						for (const value of field.pick_list_values) {
							const valueName = value.display_value;
							const valueId = value.actual_value;
							returnData.push({
								name: valueName,
								value: valueId,
							});
							return returnData;
						}
					}
				}
				return returnData;
			},
			// Get all the available industries to display them to user so that he can
			// select them easily
			async getIndustries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.module = 'leads';
				const { fields } = await zohoApiRequest.call(this, 'GET', '/settings/fields', {}, qs);
				for (const field of fields) {
					if (field.api_name === 'Industry') {
						for (const value of field.pick_list_values) {
							const valueName = value.display_value;
							const valueId = value.actual_value;
							returnData.push({
								name: valueName,
								value: valueId,
							});
							return returnData;
						}
					}
				}
				return returnData;
			},
			// Get all the available lead fields to display them to user so that he can
			// select them easily
			async getLeadFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.module = 'leads';
				const { fields } = await zohoApiRequest.call(this, 'GET', '/settings/fields', {}, qs);
				for (const field of fields) {
					returnData.push({
						name: field.field_label,
						value: field.api_name,
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
		const qs: IDataObject = {};
		let responseData;
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			if (resource === 'lead') {
				//https://www.zoho.com/crm/developer/docs/api/insert-records.html
				if (operation === 'create') {
					const lastName = this.getNodeParameter('lastName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: ILead = {
						Last_Name: lastName,
					};
					if (additionalFields.owner) {
						body.Lead_Owner = additionalFields.owner as string;
					}
					if (additionalFields.company) {
						body.Company = additionalFields.company as string;
					}
					if (additionalFields.firstName) {
						body.First_Name = additionalFields.firstName as string;
					}
					if (additionalFields.email) {
						body.Email = additionalFields.email as string;
					}
					if (additionalFields.title) {
						body.Designation = additionalFields.title as string;
					}
					if (additionalFields.phone) {
						body.Phone = additionalFields.phone as string;
					}
					if (additionalFields.mobile) {
						body.Mobile = additionalFields.mobile as string;
					}
					if (additionalFields.leadStatus) {
						body.Lead_Status = additionalFields.leadStatus as string;
					}
					if (additionalFields.fax) {
						body.Fax = additionalFields.fax as string;
					}
					if (additionalFields.website) {
						body.Website = additionalFields.website as string;
					}
					if (additionalFields.leadSource) {
						body.Lead_Source = additionalFields.leadSource as string;
					}
					if (additionalFields.industry) {
						body.Industry = additionalFields.industry as string;
					}
					if (additionalFields.numberOfEmployees) {
						body.No_of_Employees = additionalFields.numberOfEmployees as number;
					}
					if (additionalFields.annualRevenue) {
						body.Annual_Revenue = additionalFields.annualRevenue as number;
					}
					if (additionalFields.emailOptOut) {
						body.Email_Opt_Out = additionalFields.emailOptOut as boolean;
					}
					if (additionalFields.skypeId) {
						body.Skype_ID = additionalFields.skypeId as string;
					}
					if (additionalFields.salutation) {
						body.Salutation = additionalFields.salutation as string;
					}
					if (additionalFields.secondaryEmail) {
						body.Secondary_Email = additionalFields.secondaryEmail as string;
					}
					if (additionalFields.twitter) {
						body.Twitter = additionalFields.twitter as string;
					}
					if (additionalFields.isRecordDuplicate) {
						body.Is_Record_Duplicate = additionalFields.isRecordDuplicate as boolean;
					}
					if (additionalFields.description) {
						body.Description = additionalFields.description as string;
					}
					const address = (this.getNodeParameter('addressUi', i) as IDataObject).addressValues as IAddress;
					if (address) {
						if (address.country) {
							body.Country = address.country as string;
						}
						if (address.city) {
							body.City = address.city as string;
						}
						if (address.state) {
							body.State = address.state as string;
						}
						if (address.street) {
							body.Street = address.street as string;
						}
						if (address.zipCode) {
							body.Zip_Code = address.zipCode as string;
						}
					}
					responseData = await zohoApiRequest.call(this, 'POST', '/leads', body);
					responseData = responseData.data;

					if (responseData.length) {
						responseData = responseData[0].details;
					}
				}
				//https://www.zoho.com/crm/developer/docs/api/update-specific-record.html
				if (operation === 'update') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: ILead = {};
					if (additionalFields.lastName) {
						body.Last_Name = additionalFields.lastName as string;
					}
					if (additionalFields.owner) {
						body.Lead_Owner = additionalFields.owner as string;
					}
					if (additionalFields.company) {
						body.Company = additionalFields.company as string;
					}
					if (additionalFields.firstName) {
						body.First_Name = additionalFields.firstName as string;
					}
					if (additionalFields.email) {
						body.Email = additionalFields.email as string;
					}
					if (additionalFields.title) {
						body.Designation = additionalFields.title as string;
					}
					if (additionalFields.phone) {
						body.Phone = additionalFields.phone as string;
					}
					if (additionalFields.mobile) {
						body.Mobile = additionalFields.mobile as string;
					}
					if (additionalFields.leadStatus) {
						body.Lead_Status = additionalFields.leadStatus as string;
					}
					if (additionalFields.fax) {
						body.Fax = additionalFields.fax as string;
					}
					if (additionalFields.website) {
						body.Website = additionalFields.website as string;
					}
					if (additionalFields.leadSource) {
						body.Lead_Source = additionalFields.leadSource as string;
					}
					if (additionalFields.industry) {
						body.Industry = additionalFields.industry as string;
					}
					if (additionalFields.numberOfEmployees) {
						body.No_of_Employees = additionalFields.numberOfEmployees as number;
					}
					if (additionalFields.annualRevenue) {
						body.Annual_Revenue = additionalFields.annualRevenue as number;
					}
					if (additionalFields.emailOptOut) {
						body.Email_Opt_Out = additionalFields.emailOptOut as boolean;
					}
					if (additionalFields.skypeId) {
						body.Skype_ID = additionalFields.skypeId as string;
					}
					if (additionalFields.salutation) {
						body.Salutation = additionalFields.salutation as string;
					}
					if (additionalFields.secondaryEmail) {
						body.Secondary_Email = additionalFields.secondaryEmail as string;
					}
					if (additionalFields.twitter) {
						body.Twitter = additionalFields.twitter as string;
					}
					if (additionalFields.isRecordDuplicate) {
						body.Is_Record_Duplicate = additionalFields.isRecordDuplicate as boolean;
					}
					if (additionalFields.description) {
						body.Description = additionalFields.description as string;
					}
					const address = (this.getNodeParameter('addressUi', i) as IDataObject).addressValues as IAddress;
					if (address) {
						if (address.country) {
							body.Country = address.country as string;
						}
						if (address.city) {
							body.City = address.city as string;
						}
						if (address.state) {
							body.State = address.state as string;
						}
						if (address.street) {
							body.Street = address.street as string;
						}
						if (address.zipCode) {
							body.Zip_Code = address.zipCode as string;
						}
					}
					responseData = await zohoApiRequest.call(this, 'PUT', `/leads/${leadId}`, body);
					responseData = responseData.data;

					if (responseData.length) {
						responseData = responseData[0].details;
					}
				}
				//https://www.zoho.com/crm/developer/docs/api/update-specific-record.html
				if (operation === 'get') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					responseData = await zohoApiRequest.call(this, 'GET', `/leads/${leadId}`);
					if (responseData !== undefined) {
						responseData = responseData.data;
					}

				}
				//https://www.zoho.com/crm/developer/docs/api/get-records.html
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.fields) {
						qs.fields = (options.fields as string[]).join(',');
					}
					if (options.approved) {
						qs.approved = options.approved as boolean;
					}
					if (options.converted) {
						qs.converted = options.converted as boolean;
					}
					if (options.includeChild) {
						qs.include_child = options.includeChild as boolean;
					}
					if (options.sortOrder) {
						qs.sort_order = options.sortOrder as string;
					}
					if (options.sortBy) {
						qs.sort_by = options.sortBy as string;
					}
					if (options.territoryId) {
						qs.territory_id = options.territoryId as string;
					}
					if (returnAll) {
						responseData = await zohoApiRequestAllItems.call(this, 'data', 'GET', '/leads', {}, qs);
					} else {
						qs.per_page = this.getNodeParameter('limit', i) as number;
						responseData = await zohoApiRequest.call(this, 'GET', '/leads', {}, qs);
						responseData = responseData.data;
					}
				}
				//https://www.zoho.com/crm/developer/docs/api/delete-specific-record.html
				if (operation === 'delete') {
					const leadId = this.getNodeParameter('leadId', i) as string;
					responseData = await zohoApiRequest.call(this, 'DELETE', `/leads/${leadId}`);
					responseData = responseData.data;
				}
				//https://www.zoho.com/crm/developer/docs/api/field-meta.html
				if (operation === 'getFields') {
					qs.module = 'leads';
					responseData = await zohoApiRequest.call(this, 'GET', '/settings/fields', {}, qs);
					responseData = responseData.fields;
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
