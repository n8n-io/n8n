import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	salesmateApiRequest,
	salesmateApiRequestAllItems,
	simplifySalesmateData,
	validateJSON,
} from './GenericFunctions';
import { companyFields, companyOperations } from './CompanyDescription';
import { activityFields, activityOperations } from './ActivityDescription';
import type { ICompany } from './CompanyInterface';
import type { IActivity } from './ActivityInterface';
import type { IDeal } from './DealInterface';
import { dealFields, dealOperations } from './DealDescription';

export class Salesmate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Salesmate',
		name: 'salesmate',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:salesmate.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume Salesmate API',
		defaults: {
			name: 'Salesmate',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'salesmateApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
				],
				default: 'activity',
			},
			...companyOperations,
			...activityOperations,
			...dealOperations,
			...companyFields,
			...activityFields,
			...dealFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available users to display them to user so that they can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await salesmateApiRequest.call(this, 'GET', '/v1/users/active');
				for (const user of users.Data) {
					const userName = user.nickname;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},
			// Get all the available contacs to display them to user so that they can
			// select them easily
			async getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					fields: ['name', 'id'],
					query: {},
				};
				const contacts = await salesmateApiRequest.call(this, 'POST', '/v2/contacts/search', qs);
				for (const contact of contacts.Data.data) {
					const contactName = contact.name;
					const contactId = contact.id;
					returnData.push({
						name: contactName,
						value: contactId,
					});
				}
				return returnData;
			},
			// Get all the available companies to display them to user so that they can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					fields: ['name', 'id'],
					query: {},
				};
				const companies = await salesmateApiRequest.call(this, 'POST', '/v2/companies/search', qs);
				for (const company of companies.Data.data) {
					const companyName = company.name;
					const companyId = company.id;
					returnData.push({
						name: companyName,
						value: companyId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			if (resource === 'company') {
				if (operation === 'create') {
					const owner = this.getNodeParameter('owner', i) as number;
					const name = this.getNodeParameter('name', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const body: ICompany = {
						name,
						owner,
					};
					if (additionalFields.website) {
						body.website = additionalFields.website as string;
					}
					if (additionalFields.phone) {
						body.phone = additionalFields.phone as string;
					}
					if (additionalFields.otherPhone) {
						body.otherPhone = additionalFields.otherPhone as string;
					}
					if (additionalFields.facebookHandle) {
						body.facebookHandle = additionalFields.facebookHandle as string;
					}
					if (additionalFields.googlePlusHandle) {
						body.googlePlusHandle = additionalFields.googlePlusHandle as string;
					}
					if (additionalFields.linkedInHandle) {
						body.linkedInHandle = additionalFields.linkedInHandle as string;
					}
					if (additionalFields.skypeId) {
						body.skypeId = additionalFields.skypeId as string;
					}
					if (additionalFields.twitterHandle) {
						body.twitterHandle = additionalFields.twitterHandle as string;
					}
					if (additionalFields.currency) {
						body.currency = additionalFields.currency as string;
					}
					if (additionalFields.billingAddressLine1) {
						body.billingAddressLine1 = additionalFields.billingAddressLine1 as string;
					}
					if (additionalFields.billingAddressLine2) {
						body.billingAddressLine2 = additionalFields.billingAddressLine2 as string;
					}
					if (additionalFields.billingCity) {
						body.billingCity = additionalFields.billingCity as string;
					}
					if (additionalFields.billingZipCode) {
						body.billingZipCode = additionalFields.billingZipCode as string;
					}
					if (additionalFields.billingState) {
						body.billingState = additionalFields.billingState as string;
					}
					if (additionalFields.description) {
						body.description = additionalFields.description as string;
					}
					if (additionalFields.tags) {
						body.tags = additionalFields.tags as string;
					}
					responseData = await salesmateApiRequest.call(this, 'POST', '/v1/companies', body);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'update') {
					const companyId = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i);
					const rawData = this.getNodeParameter('rawData', i);
					const body: ICompany = {};
					if (updateFields.owner) {
						body.owner = updateFields.owner as number;
					}
					if (updateFields.name) {
						body.name = updateFields.name as string;
					}
					if (updateFields.website) {
						body.website = updateFields.website as string;
					}
					if (updateFields.phone) {
						body.phone = updateFields.phone as string;
					}
					if (updateFields.otherPhone) {
						body.otherPhone = updateFields.otherPhone as string;
					}
					if (updateFields.facebookHandle) {
						body.facebookHandle = updateFields.facebookHandle as string;
					}
					if (updateFields.googlePlusHandle) {
						body.googlePlusHandle = updateFields.googlePlusHandle as string;
					}
					if (updateFields.linkedInHandle) {
						body.linkedInHandle = updateFields.linkedInHandle as string;
					}
					if (updateFields.skypeId) {
						body.skypeId = updateFields.skypeId as string;
					}
					if (updateFields.twitterHandle) {
						body.twitterHandle = updateFields.twitterHandle as string;
					}
					if (updateFields.currency) {
						body.currency = updateFields.currency as string;
					}
					if (updateFields.billingAddressLine1) {
						body.billingAddressLine1 = updateFields.billingAddressLine1 as string;
					}
					if (updateFields.billingAddressLine2) {
						body.billingAddressLine2 = updateFields.billingAddressLine2 as string;
					}
					if (updateFields.billingCity) {
						body.billingCity = updateFields.billingCity as string;
					}
					if (updateFields.billingZipCode) {
						body.billingZipCode = updateFields.billingZipCode as string;
					}
					if (updateFields.billingState) {
						body.billingState = updateFields.billingState as string;
					}
					if (updateFields.description) {
						body.description = updateFields.description as string;
					}
					if (updateFields.tags) {
						body.tags = updateFields.tags as string;
					}
					responseData = await salesmateApiRequest.call(
						this,
						'PUT',
						`/v1/companies/${companyId}`,
						body,
					);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'get') {
					const companyId = this.getNodeParameter('id', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					responseData = await salesmateApiRequest.call(this, 'GET', `/v1/companies/${companyId}`);
					responseData = responseData.Data;

					if (!rawData) {
						responseData = simplifySalesmateData(responseData as IDataObject[]);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const options = this.getNodeParameter('options', i);
					const jsonActive = this.getNodeParameter('jsonParameters', i);
					let body: IDataObject = {
						query: {
							group: {},
						},
					};
					if (options.sortBy) {
						qs.sortBy = options.sortBy as string;
					}
					if (options.sortOrder) {
						qs.sortOrder = options.sortOrder as string;
					}
					if (options.fields) {
						if ((options.fields as string).trim() === '') {
							throw new NodeOperationError(this.getNode(), 'You have to add at least one field', {
								itemIndex: i,
							});
						}
						body.fields = (options.fields as string).split(',');
					} else {
						body.fields = [
							'name',
							'description',
							'billingAddressLine1',
							'billingAddressLine2',
							'billingCity',
							'billingZipCode',
							'billingState',
							'billingCountry',
							'website',
							'owner',
							'tags',
							'photo',
							'createdAt',
						];
					}
					if (!jsonActive) {
						const filters: IDataObject[] = [];
						const filtersUi = this.getNodeParameter('filters', i).filtersUi as IDataObject;
						if (filtersUi?.conditions) {
							const conditions = filtersUi.conditions as IDataObject;
							if (conditions.conditionsUi) {
								for (const condition of conditions.conditionsUi as IDataObject[]) {
									const filter: IDataObject = {};
									filter.moduleName = 'Company';
									filter.field = {
										fieldName: condition.field,
									};
									filter.condition = condition.condition;
									filter.data = condition.value;
									filters.push(filter);
								}
							}
						}
						if (filtersUi?.operator) {
							//@ts-ignore
							body.query.group = {
								operator: filtersUi.operator,
								rules: filters,
							};
						}
					} else {
						const json = validateJSON(this.getNodeParameter('filtersJson', i) as string);
						body = json;
					}
					if (returnAll) {
						responseData = await salesmateApiRequestAllItems.call(
							this,
							'Data',
							'POST',
							'/v2/companies/search',
							body,
							qs,
						);
					} else {
						const limit = this.getNodeParameter('limit', i);
						qs.rows = limit;
						responseData = await salesmateApiRequest.call(
							this,
							'POST',
							'/v2/companies/search',
							body,
							qs,
						);
						responseData = responseData.Data.data;
					}
				}
				if (operation === 'delete') {
					const companyId = parseInt(this.getNodeParameter('id', i) as string, 10);
					responseData = await salesmateApiRequest.call(
						this,
						'DELETE',
						`/v1/companies/${companyId}`,
					);
				}
			}
			if (resource === 'activity') {
				if (operation === 'create') {
					const owner = this.getNodeParameter('owner', i) as number;
					const title = this.getNodeParameter('title', i) as string;
					const type = this.getNodeParameter('type', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const body: IActivity = {
						title,
						owner,
						type,
					};
					if (additionalFields.dueDate) {
						body.dueDate = new Date(additionalFields.dueDate as string).getTime();
					}
					if (additionalFields.duration) {
						body.duration = additionalFields.duration as number;
					}
					if (additionalFields.isCalendarInvite) {
						body.isCalendarInvite = additionalFields.isCalendarInvite as boolean;
					}
					if (additionalFields.isCompleted) {
						body.isCompleted = additionalFields.isCompleted as boolean;
					}
					if (additionalFields.description) {
						body.description = additionalFields.description as string;
					}
					if (additionalFields.tags) {
						body.tags = additionalFields.tags as string;
					}
					responseData = await salesmateApiRequest.call(this, 'POST', '/v1/activities', body);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'update') {
					const activityId = this.getNodeParameter('id', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					const updateFields = this.getNodeParameter('updateFields', i);
					const body: IActivity = {};
					if (updateFields.title) {
						body.title = updateFields.title as string;
					}
					if (updateFields.type) {
						body.type = updateFields.type as string;
					}
					if (updateFields.owner) {
						body.owner = updateFields.owner as number;
					}
					if (updateFields.dueDate) {
						body.dueDate = new Date(updateFields.dueDate as string).getTime();
					}
					if (updateFields.duration) {
						body.duration = updateFields.duration as number;
					}
					if (updateFields.isCalendarInvite) {
						body.isCalendarInvite = updateFields.isCalendarInvite as boolean;
					}
					if (updateFields.isCompleted) {
						body.isCompleted = updateFields.isCompleted as boolean;
					}
					if (updateFields.description) {
						body.description = updateFields.description as string;
					}
					if (updateFields.tags) {
						body.tags = updateFields.tags as string;
					}
					responseData = await salesmateApiRequest.call(
						this,
						'PUT',
						`/v1/activities/${activityId}`,
						body,
					);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'get') {
					const activityId = this.getNodeParameter('id', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					responseData = await salesmateApiRequest.call(
						this,
						'GET',
						`/v1/activities/${activityId}`,
					);
					responseData = responseData.Data;

					if (!rawData) {
						responseData = simplifySalesmateData(responseData as IDataObject[]);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const options = this.getNodeParameter('options', i);
					const jsonActive = this.getNodeParameter('jsonParameters', i);
					let body: IDataObject = {
						query: {
							group: {},
						},
					};
					if (options.sortBy) {
						qs.sortBy = options.sortBy as string;
					}
					if (options.sortOrder) {
						qs.sortOrder = options.sortOrder as string;
					}
					if (options.fields) {
						if ((options.fields as string).trim() === '') {
							throw new NodeOperationError(this.getNode(), 'You have to add at least one field', {
								itemIndex: i,
							});
						}
						body.fields = (options.fields as string).split(',');
					} else {
						body.fields = [
							'title',
							'dueDate',
							'description',
							'duration',
							'owner',
							'Deal.title',
							'PrimaryContact.name',
							'PrimaryContact.email',
							'PrimaryCompany.name',
							'PrimaryCompany.email',
							'tags',
							'type',
							'createdAt',
							'isCompleted',
						];
					}
					if (!jsonActive) {
						const filters: IDataObject[] = [];
						const filtersUi = this.getNodeParameter('filters', i).filtersUi as IDataObject;
						if (filtersUi?.conditions) {
							const conditions = filtersUi.conditions as IDataObject;
							if (conditions.conditionsUi) {
								for (const condition of conditions.conditionsUi as IDataObject[]) {
									const filter: IDataObject = {};
									filter.moduleName = 'Task';
									filter.field = {
										fieldName: condition.field,
									};
									filter.condition = condition.condition;
									filter.data = condition.value;
									filters.push(filter);
								}
							}
						}
						if (filtersUi?.operator) {
							//@ts-ignore
							body.query.group = {
								operator: filtersUi.operator,
								rules: filters,
							};
						}
					} else {
						const json = validateJSON(this.getNodeParameter('filtersJson', i) as string);
						body = json;
					}
					if (returnAll) {
						responseData = await salesmateApiRequestAllItems.call(
							this,
							'Data',
							'POST',
							'/v2/activities/search',
							body,
							qs,
						);
					} else {
						const limit = this.getNodeParameter('limit', i);
						qs.rows = limit;
						responseData = await salesmateApiRequest.call(
							this,
							'POST',
							'/v2/activities/search',
							body,
							qs,
						);
						responseData = responseData.Data.data;
					}
				}
				if (operation === 'delete') {
					const activityId = this.getNodeParameter('id', i) as string;
					responseData = await salesmateApiRequest.call(
						this,
						'DELETE',
						`/v1/activities/${activityId}`,
					);
				}
			}
			if (resource === 'deal') {
				if (operation === 'create') {
					const title = this.getNodeParameter('title', i) as string;
					const owner = this.getNodeParameter('owner', i) as number;
					const primaryContact = this.getNodeParameter('primaryContact', i) as number;
					const pipeline = this.getNodeParameter('pipeline', i) as string;
					const status = this.getNodeParameter('status', i) as string;
					const stage = this.getNodeParameter('stage', i) as string;
					const currency = this.getNodeParameter('currency', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const body: IDeal = {
						title,
						owner,
						primaryContact,
						pipeline,
						status,
						stage,
						currency,
					};
					if (additionalFields.description) {
						body.description = additionalFields.description as string;
					}
					if (additionalFields.tags) {
						body.tags = additionalFields.tags as string;
					}
					if (additionalFields.primaryCompany) {
						body.primaryCompany = additionalFields.primaryCompany as number;
					}
					if (additionalFields.source) {
						body.source = additionalFields.source as string;
					}
					if (additionalFields.estimatedCloseDate) {
						body.estimatedCloseDate = additionalFields.estimatedCloseDate as string;
					}
					if (additionalFields.dealValue) {
						body.dealValue = additionalFields.dealValue as number;
					}
					if (additionalFields.priority) {
						body.priority = additionalFields.priority as string;
					}
					responseData = await salesmateApiRequest.call(this, 'POST', '/v1/deals', body);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'update') {
					const dealId = this.getNodeParameter('id', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					const updateFields = this.getNodeParameter('updateFields', i);
					const body: IDeal = {};
					if (updateFields.title) {
						body.title = updateFields.title as string;
					}
					if (updateFields.owner) {
						body.owner = updateFields.owner as number;
					}
					if (updateFields.primaryContact) {
						body.primaryContact = updateFields.primaryContact as number;
					}
					if (updateFields.status) {
						body.status = updateFields.status as string;
					}
					if (updateFields.currency) {
						body.currency = updateFields.currency as string;
					}
					if (updateFields.stage) {
						body.stage = updateFields.stage as string;
					}
					if (updateFields.pipeline) {
						body.pipeline = updateFields.pipeline as string;
					}
					if (updateFields.description) {
						body.description = updateFields.description as string;
					}
					if (updateFields.tags) {
						body.tags = updateFields.tags as string;
					}
					if (updateFields.primaryCompany) {
						body.primaryCompany = updateFields.primaryCompany as number;
					}
					if (updateFields.source) {
						body.source = updateFields.source as string;
					}
					if (updateFields.estimatedCloseDate) {
						body.estimatedCloseDate = updateFields.estimatedCloseDate as string;
					}
					if (updateFields.dealValue) {
						body.dealValue = updateFields.dealValue as number;
					}
					if (updateFields.priority) {
						body.priority = updateFields.priority as string;
					}
					responseData = await salesmateApiRequest.call(this, 'PUT', `/v1/deals/${dealId}`, body);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'get') {
					const dealId = this.getNodeParameter('id', i) as string;
					const rawData = this.getNodeParameter('rawData', i);
					responseData = await salesmateApiRequest.call(this, 'GET', `/v1/deals/${dealId}`);
					responseData = responseData.Data;

					if (!rawData) {
						responseData = simplifySalesmateData(responseData as IDataObject[]);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const options = this.getNodeParameter('options', i);
					const jsonActive = this.getNodeParameter('jsonParameters', i);
					let body: IDataObject = {
						query: {
							group: {},
						},
					};
					if (options.sortBy) {
						qs.sortBy = options.sortBy as string;
					}
					if (options.sortOrder) {
						qs.sortOrder = options.sortOrder as string;
					}
					if (options.fields !== undefined) {
						if ((options.fields as string).trim() === '') {
							throw new NodeOperationError(this.getNode(), 'You have to add at least one field', {
								itemIndex: i,
							});
						}
						body.fields = (options.fields as string).split(',');
					} else {
						body.fields = [
							'title',
							'PrimaryContact.name',
							'PrimaryContact.email',
							'PrimaryCompany.name',
							'PrimaryCompany.email',
							'dealValue',
							'priority',
							'stage',
							'status',
							'owner',
							'tags',
							'createdAt',
						];
					}
					if (!jsonActive) {
						const filters: IDataObject[] = [];
						const filtersUi = this.getNodeParameter('filters', i).filtersUi as IDataObject;
						if (filtersUi?.conditions) {
							const conditions = filtersUi.conditions as IDataObject;
							if (conditions.conditionsUi) {
								for (const condition of conditions.conditionsUi as IDataObject[]) {
									const filter: IDataObject = {};
									filter.moduleName = 'Task';
									filter.field = {
										fieldName: condition.field,
									};
									filter.condition = condition.condition;
									filter.data = condition.value;
									filters.push(filter);
								}
							}
						}
						if (filtersUi?.operator) {
							//@ts-ignore
							body.query.group = {
								operator: filtersUi.operator,
								rules: filters,
							};
						}
					} else {
						const json = validateJSON(this.getNodeParameter('filtersJson', i) as string);
						body = json;
					}
					if (returnAll) {
						responseData = await salesmateApiRequestAllItems.call(
							this,
							'Data',
							'POST',
							'/v2/deals/search',
							body,
							qs,
						);
					} else {
						const limit = this.getNodeParameter('limit', i);
						qs.rows = limit;
						responseData = await salesmateApiRequest.call(
							this,
							'POST',
							'/v2/deals/search',
							body,
							qs,
						);
						responseData = responseData.Data.data;
					}
				}
				if (operation === 'delete') {
					const dealId = this.getNodeParameter('id', i) as string;
					responseData = await salesmateApiRequest.call(this, 'DELETE', `/v1/deals/${dealId}`);
				}
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
