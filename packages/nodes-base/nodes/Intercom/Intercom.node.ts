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
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import {
	leadFields,
	leadOpeations,
} from './LeadDescription';
import {
	intercomApiRequest,
	intercomApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';
import {
	IAvatar,
	ILead,
	ILeadCompany,
} from './LeadInterface';
import {
	userFields,
	userOpeations,
} from './UserDescription';
import {
	IUser,
	IUserCompany,
} from './UserInterface';
import {
	companyFields,
	companyOperations,
} from './CompanyDescription';
import { ICompany } from './CompanyInteface';

export class Intercom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Intercom',
		name: 'intercom',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:intercom.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Intercom API',
		defaults: {
			name: 'Intercom',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'intercomApi',
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
						name: 'Company',
						value: 'company',
						description: 'Companies allow you to represent commercial organizations using your product',
					},
					{
						name: 'Lead',
						value: 'lead',
						description: 'Leads are useful for representing logged-out users of your application',
					},
					{
						name: 'User',
						value: 'user',
						description: 'The Users resource is the primary way of interacting with Intercom',
					},
				],
				default: 'user',
			},
			...leadOpeations,
			...userOpeations,
			...companyOperations,
			...userFields,
			...leadFields,
			...companyFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let companies, response;
				try {
					response = await intercomApiRequest.call(this, '/companies', 'GET');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
				companies = response.companies;
				for (const company of companies) {
					const companyName = company.name;
					const companyId = company.company_id;
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
		const returnData: IDataObject[] = [];
		const length = items.length;
		let qs: IDataObject;
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				qs = {};
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;
				//https://developers.intercom.com/intercom-api-reference/reference#leads
				if (resource === 'lead') {
					if (operation === 'create' || operation === 'update') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
						const body: ILead = {};
						if (operation === 'create') {
							body.email = this.getNodeParameter('email', i) as string;
						}
						if (additionalFields.email) {
							body.email = additionalFields.email as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.unsubscribedFromEmails) {
							body.unsubscribed_from_emails = additionalFields.unsubscribedFromEmails as boolean;
						}
						if (additionalFields.updateLastRequestAt) {
							body.update_last_request_at = additionalFields.updateLastRequestAt as boolean;
						}
						if (additionalFields.utmSource) {
							body.utm_source = additionalFields.utmSource as string;
						}
						if (additionalFields.utmMedium) {
							body.utm_medium = additionalFields.utmMedium as string;
						}
						if (additionalFields.utmCampaign) {
							body.utm_campaign = additionalFields.utmCampaign as string;
						}
						if (additionalFields.utmTerm) {
							body.utm_term = additionalFields.utmTerm as string;
						}
						if (additionalFields.utmContent) {
							body.utm_content = additionalFields.utmContent as string;
						}
						if (additionalFields.avatar) {
							const avatar: IAvatar = {
								type: 'avatar',
								image_url: additionalFields.avatar as string,
							};
							body.avatar = avatar;
						}
						if (additionalFields.companies) {
							const companies: ILeadCompany[] = [];
							// @ts-ignore
							additionalFields.companies.forEach(o => {
								const company: ILeadCompany = {};
								company.company_id = o;
								companies.push(company);
							});
							body.companies = companies;
						}
						if (!jsonActive) {
							const customAttributesValues = (this.getNodeParameter('customAttributesUi', i) as IDataObject).customAttributesValues as IDataObject[];
							if (customAttributesValues) {
								const customAttributes = {};
								for (let i = 0; i < customAttributesValues.length; i++) {
									// @ts-ignore
									customAttributes[customAttributesValues[i].name] = customAttributesValues[i].value;
								}
								body.custom_attributes = customAttributes;
							}
						} else {
							const customAttributesJson = validateJSON(this.getNodeParameter('customAttributesJson', i) as string);
							if (customAttributesJson) {
								body.custom_attributes = customAttributesJson;
							}
						}

						if (operation === 'update') {
							const updateBy = this.getNodeParameter('updateBy', 0) as string;
							const value = this.getNodeParameter('value', i) as string;
							if (updateBy === 'userId') {
								body.user_id = value;
							}
							if (updateBy === 'id') {
								body.id = value;
							}
						}

						try {
							responseData = await intercomApiRequest.call(this, '/contacts', 'POST', body);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					if (operation === 'get') {
						const selectBy = this.getNodeParameter('selectBy', 0) as string;
						const value = this.getNodeParameter('value', i) as string;
						if (selectBy === 'email') {
							qs.email = value;
						}
						if (selectBy === 'userId') {
							qs.user_id = value;
						}
						if (selectBy === 'phone') {
							qs.phone = value;
						}
						try {
							if (selectBy === 'id') {
								responseData = await intercomApiRequest.call(this, `/contacts/${value}`, 'GET');
							} else {
								responseData = await intercomApiRequest.call(this, '/contacts', 'GET', {}, qs);
								responseData = responseData.contacts;
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						Object.assign(qs, filters);

						try {
							if (returnAll === true) {
								responseData = await intercomApiRequestAllItems.call(this, 'contacts', '/contacts', 'GET', {}, qs);
							} else {
								qs.per_page = this.getNodeParameter('limit', i) as number;
								responseData = await intercomApiRequest.call(this, '/contacts', 'GET', {}, qs);
								responseData = responseData.contacts;
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					if (operation === 'delete') {
						const deleteBy = this.getNodeParameter('deleteBy', 0) as string;
						const value = this.getNodeParameter('value', i) as string;
						try {
							if (deleteBy === 'id') {
								responseData = await intercomApiRequest.call(this, `/contacts/${value}`, 'DELETE');
							} else {
								qs.user_id = value;
								responseData = await intercomApiRequest.call(this, '/contacts', 'DELETE', {}, qs);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
				}
				//https://developers.intercom.com/intercom-api-reference/reference#users
				if (resource === 'user') {
					if (operation === 'create' || operation === 'update') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
						const body: IUser = {};

						if (operation === 'create') {
							const identifierType = this.getNodeParameter('identifierType', i) as string;
							if (identifierType === 'email') {
								body.email = this.getNodeParameter('idValue', i) as string;
							} else if (identifierType === 'userId') {
								body.user_id = this.getNodeParameter('idValue', i) as string;
							}
						}

						if (additionalFields.email) {
							body.email = additionalFields.email as string;
						}
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.unsubscribedFromEmails) {
							body.unsubscribed_from_emails = additionalFields.unsubscribedFromEmails as boolean;
						}
						if (additionalFields.updateLastRequestAt) {
							body.update_last_request_at = additionalFields.updateLastRequestAt as boolean;
						}
						if (additionalFields.sessionCount) {
							body.session_count = additionalFields.sessionCount as number;
						}
						if (additionalFields.avatar) {
							const avatar: IAvatar = {
								type: 'avatar',
								image_url: additionalFields.avatar as string,
							};
							body.avatar = avatar;
						}
						if (additionalFields.utmSource) {
							body.utm_source = additionalFields.utmSource as string;
						}
						if (additionalFields.utmMedium) {
							body.utm_medium = additionalFields.utmMedium as string;
						}
						if (additionalFields.utmCampaign) {
							body.utm_campaign = additionalFields.utmCampaign as string;
						}
						if (additionalFields.utmTerm) {
							body.utm_term = additionalFields.utmTerm as string;
						}
						if (additionalFields.utmContent) {
							body.utm_content = additionalFields.utmContent as string;
						}
						if (additionalFields.companies) {
							const companies: IUserCompany[] = [];
							// @ts-ignore
							additionalFields.companies.forEach(o => {
								const company: IUserCompany = {};
								company.company_id = o;
								companies.push(company);
							});
							body.companies = companies;
						}
						if (additionalFields.sessionCount) {
							body.session_count = additionalFields.sessionCount as number;
						}
						if (!jsonActive) {
							const customAttributesValues = (this.getNodeParameter('customAttributesUi', i) as IDataObject).customAttributesValues as IDataObject[];
							if (customAttributesValues) {
								const customAttributes = {};
								for (let i = 0; i < customAttributesValues.length; i++) {
									// @ts-ignore
									customAttributes[customAttributesValues[i].name] = customAttributesValues[i].value;
								}
								body.custom_attributes = customAttributes;
							}
						} else {
							const customAttributesJson = validateJSON(this.getNodeParameter('customAttributesJson', i) as string);
							if (customAttributesJson) {
								body.custom_attributes = customAttributesJson;
							}
						}

						if (operation === 'update') {
							const updateBy = this.getNodeParameter('updateBy', 0) as string;
							const value = this.getNodeParameter('value', i) as string;
							if (updateBy === 'userId') {
								body.user_id = value;
							}
							if (updateBy === 'id') {
								body.id = value;
							}
							if (updateBy === 'email') {
								body.email = value;
							}
						}

						try {
							responseData = await intercomApiRequest.call(this, '/users', 'POST', body, qs);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					if (operation === 'get') {
						const selectBy = this.getNodeParameter('selectBy', 0) as string;
						const value = this.getNodeParameter('value', i) as string;
						if (selectBy === 'userId') {
							qs.user_id = value;
						}
						try {
							if (selectBy === 'id') {
								responseData = await intercomApiRequest.call(this, `/users/${value}`, 'GET', {}, qs);
							} else {
								responseData = await intercomApiRequest.call(this, '/users', 'GET', {}, qs);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						Object.assign(qs, filters);

						try {
							if (returnAll === true) {
								responseData = await intercomApiRequestAllItems.call(this, 'users', '/users', 'GET', {}, qs);
							} else {
								qs.per_page = this.getNodeParameter('limit', i) as number;
								responseData = await intercomApiRequest.call(this, '/users', 'GET', {}, qs);
								responseData = responseData.users;
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					if (operation === 'delete') {
						const id = this.getNodeParameter('id', i) as string;
						try {
							responseData = await intercomApiRequest.call(this, `/users/${id}`, 'DELETE');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `Intercom Error: ${JSON.stringify(error)}`, { itemIndex: i });
						}
					}
				}
				//https://developers.intercom.com/intercom-api-reference/reference#companies
				if (resource === 'company') {
					if (operation === 'create' || operation === 'update') {
						const id = this.getNodeParameter('companyId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
						const body: ICompany = {
							company_id: id,
						};
						if (additionalFields.monthlySpend) {
							body.monthly_spend = additionalFields.monthlySpend as number;
						}
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.plan) {
							body.plan = additionalFields.plan as string;
						}
						if (additionalFields.size) {
							body.size = additionalFields.size as number;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						if (additionalFields.industry) {
							body.industry = additionalFields.industry as string;
						}
						if (!jsonActive) {
							const customAttributesValues = (this.getNodeParameter('customAttributesUi', i) as IDataObject).customAttributesValues as IDataObject[];
							if (customAttributesValues) {
								const customAttributes = {};
								for (let i = 0; i < customAttributesValues.length; i++) {
									// @ts-ignore
									customAttributes[customAttributesValues[i].name] = customAttributesValues[i].value;
								}
								body.custom_attributes = customAttributes;
							}
						} else {
							const customAttributesJson = validateJSON(this.getNodeParameter('customAttributesJson', i) as string);
							if (customAttributesJson) {
								body.custom_attributes = customAttributesJson;
							}
						}
						try {
							responseData = await intercomApiRequest.call(this, '/companies', 'POST', body, qs);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `Intercom Error: ${JSON.stringify(error)}`, { itemIndex: i });
						}
					}
					if (operation === 'get') {
						const selectBy = this.getNodeParameter('selectBy', 0) as string;
						const value = this.getNodeParameter('value', i) as string;
						if (selectBy === 'companyId') {
							qs.company_id = value;
						}
						if (selectBy === 'name') {
							qs.name = value;
						}
						try {
							if (selectBy === 'id') {
								responseData = await intercomApiRequest.call(this, `/companies/${value}`, 'GET', {}, qs);
							} else {
								responseData = await intercomApiRequest.call(this, '/companies', 'GET', {}, qs);
							}
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `Intercom Error: ${JSON.stringify(error)}`, { itemIndex: i });
						}
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						Object.assign(qs, filters);

						try {
							if (returnAll === true) {
								responseData = await intercomApiRequestAllItems.call(this, 'companies', '/companies', 'GET', {}, qs);
							} else {
								qs.per_page = this.getNodeParameter('limit', i) as number;
								responseData = await intercomApiRequest.call(this, '/companies', 'GET', {}, qs);
								responseData = responseData.companies;
							}
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `Intercom Error: ${JSON.stringify(error)}`, { itemIndex: i });
						}
					}
					if (operation === 'users') {
						const listBy = this.getNodeParameter('listBy', 0) as string;
						const value = this.getNodeParameter('value', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (listBy === 'companyId') {
							qs.company_id = value;
						}

						try {
							if (listBy === 'id') {
								if (returnAll === true) {
									responseData = await intercomApiRequestAllItems.call(this, 'users', `/companies/${value}/users`, 'GET', {}, qs);
								} else {
									qs.per_page = this.getNodeParameter('limit', i) as number;
									responseData = await intercomApiRequest.call(this, `/companies/${value}/users`, 'GET', {}, qs);
									responseData = responseData.users;
								}

							} else {
								qs.type = 'users';

								if (returnAll === true) {
									responseData = await intercomApiRequestAllItems.call(this, 'users', '/companies', 'GET', {}, qs);
								} else {
									qs.per_page = this.getNodeParameter('limit', i) as number;
									responseData = await intercomApiRequest.call(this, '/companies', 'GET', {}, qs);
									responseData = responseData.users;
								}
							}
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `Intercom Error: ${JSON.stringify(error)}`, { itemIndex: i });
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
