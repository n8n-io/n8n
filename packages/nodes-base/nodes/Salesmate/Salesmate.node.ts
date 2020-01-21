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
	salesmateApiRequest,
	salesmateApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';
import {
	companyFields,
	companyOperations,
} from './CompanyDescription';
import {
	ICompany,
 } from './CompanyInterface';

export class Salesmate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Salesmate',
		name: 'salesmate',
		icon: 'file:salesmate.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume Salesmate API',
		defaults: {
			name: 'Salesmate',
			color: '#004ef6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'salesmateApi',
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
						name: 'Company',
						value: 'company',
					},
				],
				default: 'company',
				description: 'Resource to consume.',
			},
			...companyOperations,
			...companyFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available users to display them to user so that he can
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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'company') {
				if (operation === 'create') {
					const owner = this.getNodeParameter('owner', i) as number;
					const name = this.getNodeParameter('name', i) as string;
					const rawData = this.getNodeParameter('rawData', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
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
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const rawData = this.getNodeParameter('rawData', i) as boolean;
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
					responseData = await salesmateApiRequest.call(this, 'PUT', `/v1/companies/${companyId}`, body);
					responseData = responseData.Data;
					if (!rawData) {
						delete responseData.detail;
					}
				}
				if (operation === 'get') {
					const companyId = this.getNodeParameter('id', i) as string;
					const rawData = this.getNodeParameter('rawData', i) as boolean;
					responseData = await salesmateApiRequest.call(this, 'GET', `/v1/companies/${companyId}`);
					responseData = responseData.Data;
					if (!rawData) {
						responseData = responseData.map((company: IDataObject) => {
							const aux: IDataObject = {};
							aux[company.fieldName as string] = company.value;
							return aux;
						});
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
					let body: IDataObject = {
						query: {
							group: {
							},
						},
					};
					if (options.sortBy) {
						qs.sortBy = options.sortBy as string;
					}
					if (options.sortOrder) {
						qs.sortOrder = options.sortOrder as string;
					}
					if (options.fields) {
						body.fields = (options.fields as string).split(',') as string[];
					} else {
						throw new Error('You have to add at least one field');
					}
					if (!jsonActive) {
						const filters: IDataObject[] = [];
						const filtersUi = (this.getNodeParameter('filters', i) as IDataObject).filtersUi as IDataObject;
						if (filtersUi.conditions) {
							const conditions = filtersUi.conditions as IDataObject;
							if (conditions.conditionsUi) {
								for (const condition of conditions.conditionsUi as IDataObject[]) {
									console.log(condition)
									const filter: IDataObject = {};
									filter.moduleName = 'Company';
									filter.field = {
										fieldName: condition.field,
									};
									filter.condition = condition.condition;
									filter.data = condition.value;
									filters.push(filter)
								}
							}
						}
						//@ts-ignore
						body.query.group = {
							operator: filtersUi.operator,
							rules: filters,
						};
					} else {
						const json = validateJSON(this.getNodeParameter('filtersJson', i) as string);
						body = json;
					}
					if (returnAll) {
						responseData = await salesmateApiRequestAllItems.call(this, 'Data', 'POST', '/v2/companies/search', body, qs);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.rows = limit;
						responseData = await salesmateApiRequest.call(this, 'POST', '/v2/companies/search', body, qs);
						responseData = responseData.Data.data;
					}
				}
				if (operation === 'delete') {
					const companyId = parseInt(this.getNodeParameter('id', i) as string, 10);
					responseData = await salesmateApiRequest.call(this, 'DELETE', `/v1/companies/${companyId}`);
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
