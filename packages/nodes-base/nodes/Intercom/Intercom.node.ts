import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { companyFields, companyOperations } from './CompanyDescription';
import type { ICompany } from './CompanyInteface';
import { contactFields, contactOperations } from './ContactDescription';
import type { IAvatar, IContact, IContactCompany } from './ContactInterface';
import { intercomApiRequest, intercomApiRequestAllItems, validateJSON } from './GenericFunctions';

export class Intercom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Intercom',
		name: 'intercom',

		icon: 'file:intercom.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Intercom API',
		defaults: {
			name: 'Intercom',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						description:
							'Companies allow you to represent commercial organizations using your product',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Contacts represent your leads and users in Intercom',
					},
				],
				default: 'contact',
			},
			...contactOperations,
			...companyOperations,
			...contactFields,
			...companyFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available companies to display them to user so that they can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let response;
				try {
					response = await intercomApiRequest.call(this, '/companies', 'GET');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				const companies = response.companies;
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
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let qs: IDataObject;
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				qs = {};
				const resource = this.getNodeParameter('resource', 0);
				const operation = this.getNodeParameter('operation', 0);
				//https://developers.intercom.com/intercom-api-reference/reference#contacts
				if (resource === 'contact') {
					if (operation === 'create' || operation === 'update') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const jsonActive = this.getNodeParameter('jsonParameters', i);
						const body: IContact = {};

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
							const companies: IContactCompany[] = [];
							// @ts-ignore
							additionalFields.companies.forEach((o) => {
								const company: IContactCompany = {};
								company.company_id = o;
								companies.push(company);
							});
							body.companies = companies;
						}
						if (!jsonActive) {
							const customAttributesValues = (
								this.getNodeParameter('customAttributesUi', i) as IDataObject
							).customAttributesValues as IDataObject[];
							if (customAttributesValues) {
								const customAttributes = {};
								for (let index = 0; index < customAttributesValues.length; index++) {
									// @ts-ignore
									customAttributes[customAttributesValues[index].name] =
										customAttributesValues[index].value;
								}
								body.custom_attributes = customAttributes;
							}
						} else {
							const customAttributesJson = validateJSON(
								this.getNodeParameter('customAttributesJson', i) as string,
							);
							if (customAttributesJson) {
								body.custom_attributes = customAttributesJson;
							}
						}

						if (operation === 'update') {
							const updateBy = this.getNodeParameter('updateBy', 0) as string;
							const value = this.getNodeParameter('value', i) as string;
							let contactId: string | undefined;

							if (updateBy === 'id') {
								contactId = value;
								body.id = value;
							} else {
								const lookupQuery: IDataObject = {};
								if (updateBy === 'userId') {
									lookupQuery.user_id = value;
									body.user_id = value;
								} else if (updateBy === 'email') {
									lookupQuery.email = value;
									body.email = value;
								}

								const lookupResponse = await intercomApiRequest.call(
									this,
									'/contacts',
									'GET',
									{},
									lookupQuery,
								);
								const contacts = lookupResponse?.contacts as IDataObject[] | undefined;
								if (!contacts?.length || typeof contacts[0].id !== 'string') {
									throw new NodeOperationError(
										this.getNode(),
										'Matching contact not found for update',
										{ itemIndex: i },
									);
								}
								contactId = contacts[0].id as string;
							}

							if (!contactId) {
								throw new NodeOperationError(
									this.getNode(),
									'Unable to resolve contact ID for update',
									{ itemIndex: i },
								);
							}

							try {
								responseData = await intercomApiRequest.call(
									this,
									`/contacts/${contactId}`,
									'PUT',
									body,
								);
							} catch (error) {
								throw new NodeApiError(this.getNode(), error as JsonObject);
							}
						} else {
							try {
								responseData = await intercomApiRequest.call(this, '/contacts', 'POST', body);
							} catch (error) {
								throw new NodeApiError(this.getNode(), error as JsonObject);
							}
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
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						Object.assign(qs, filters);

						try {
							if (returnAll) {
								responseData = await intercomApiRequestAllItems.call(
									this,
									'contacts',
									'/contacts',
									'GET',
									{},
									qs,
								);
							} else {
								qs.per_page = this.getNodeParameter('limit', i);
								responseData = await intercomApiRequest.call(this, '/contacts', 'GET', {}, qs);
								responseData = responseData.contacts;
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
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
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
				}
				//https://developers.intercom.com/intercom-api-reference/reference#companies
				if (resource === 'company') {
					if (operation === 'create' || operation === 'update') {
						const id = this.getNodeParameter('companyId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const jsonActive = this.getNodeParameter('jsonParameters', i);
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
							const customAttributesValues = (
								this.getNodeParameter('customAttributesUi', i) as IDataObject
							).customAttributesValues as IDataObject[];
							if (customAttributesValues) {
								const customAttributes = {};
								for (let index = 0; index < customAttributesValues.length; index++) {
									// @ts-ignore
									customAttributes[customAttributesValues[index].name] =
										customAttributesValues[index].value;
								}
								body.custom_attributes = customAttributes;
							}
						} else {
							const customAttributesJson = validateJSON(
								this.getNodeParameter('customAttributesJson', i) as string,
							);
							if (customAttributesJson) {
								body.custom_attributes = customAttributesJson;
							}
						}
						try {
							responseData = await intercomApiRequest.call(this, '/companies', 'POST', body, qs);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Intercom Error: ${JSON.stringify(error)}`,
								{ itemIndex: i },
							);
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
								responseData = await intercomApiRequest.call(
									this,
									`/companies/${value}`,
									'GET',
									{},
									qs,
								);
							} else {
								responseData = await intercomApiRequest.call(this, '/companies', 'GET', {}, qs);
							}
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Intercom Error: ${JSON.stringify(error)}`,
								{ itemIndex: i },
							);
						}
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						Object.assign(qs, filters);

						try {
							if (returnAll) {
								responseData = await intercomApiRequestAllItems.call(
									this,
									'companies',
									'/companies',
									'GET',
									{},
									qs,
								);
							} else {
								qs.per_page = this.getNodeParameter('limit', i);
								responseData = await intercomApiRequest.call(this, '/companies', 'GET', {}, qs);
								responseData = responseData.companies;
							}
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Intercom Error: ${JSON.stringify(error)}`,
								{ itemIndex: i },
							);
						}
					}
					if (operation === 'users') {
						const listBy = this.getNodeParameter('listBy', 0) as string;
						const value = this.getNodeParameter('value', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);

						if (listBy === 'companyId') {
							qs.company_id = value;
						}

						try {
							if (listBy === 'id') {
								if (returnAll) {
									responseData = await intercomApiRequestAllItems.call(
										this,
										'users',
										`/companies/${value}/users`,
										'GET',
										{},
										qs,
									);
								} else {
									qs.per_page = this.getNodeParameter('limit', i);
									responseData = await intercomApiRequest.call(
										this,
										`/companies/${value}/users`,
										'GET',
										{},
										qs,
									);
									responseData = responseData.users;
								}
							} else {
								qs.type = 'users';

								if (returnAll) {
									responseData = await intercomApiRequestAllItems.call(
										this,
										'users',
										'/companies',
										'GET',
										{},
										qs,
									);
								} else {
									qs.per_page = this.getNodeParameter('limit', i);
									responseData = await intercomApiRequest.call(this, '/companies', 'GET', {}, qs);
									responseData = responseData.users;
								}
							}
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Intercom Error: ${JSON.stringify(error)}`,
								{ itemIndex: i },
							);
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
