import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	leadOpeations,
	leadFields,
} from './LeadDescription';
import {
	intercomApiRequest,
	validateJSON,
} from './GenericFunctions';
import {
	ILead,
	ILeadCompany,
	IAvatar,
 } from './LeadInterface';
import { userOpeations, userFields } from './UserDescription';
import { IUser, IUserCompany } from './UserInterface';
import { companyOpeations, companyFields } from './CompanyDescription';
import { ICompany } from './CompanyInteface';

export class Intercom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Intercom',
		name: 'intercom',
		icon: 'file:intercom.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume intercom API',
		defaults: {
			name: 'Intercom',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'intercomApi',
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
						name: 'User',
						value: 'user',
						description: 'The Users resource is the primary way of interacting with Intercom',
					},
					{
						name: 'Lead',
						value: 'lead',
						description: 'Leads are useful for representing logged-out users of your application.',
					},
					{
						name: 'Company',
						value: 'company',
						description: 'Companies allow you to represent commercial organizations using your product.',
					},
				],
				default: '',
				description: 'Resource to consume.',
			},
			...leadOpeations,
			...userOpeations,
			...companyOpeations,
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
				} catch (err) {
					throw new Error(`Intercom Error: ${err}`);
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
		const length = items.length as unknown as number;
		let responseData;
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			//https://developers.intercom.com/intercom-api-reference/reference#leads
			if (resource === 'lead') {
				if (operation === 'create' || operation === 'update') {
					const email = this.getNodeParameter('email', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: ILead = {};
					if (email) {
						body.email = this.getNodeParameter('email', i) as string;
					}
					if (options.phone) {
						body.phone = options.phone as string;
					}
					if (options.name) {
						body.name = options.name as string;
					}
					if (options.unsubscribedFromEmails) {
						body.unsubscribed_from_emails = options.unsubscribedFromEmails as boolean;
					}
					if (options.updateLastRequestAt) {
						body.update_last_request_at = options.updateLastRequestAt as boolean;
					}
					if (options.utmSource) {
						body.utm_source = options.utmSource as string;
					}
					if (options.utmMedium) {
						body.utm_medium = options.utmMedium as string;
					}
					if (options.utmCampaign) {
						body.utm_campaign = options.utmCampaign as string;
					}
					if (options.utmTerm) {
						body.utm_term = options.utmTerm as string;
					}
					if (options.utmContent) {
						body.utm_content = options.utmContent as string;
					}
					if(options.avatar) {
						const avatar: IAvatar = {
							type: 'avatar',
							image_url: options.avatar as string,
						};
						body.avatar = avatar;
					}
					if (options.companies) {
						const companies: ILeadCompany[] = [];
						// @ts-ignore
						options.companies.forEach( o => {
							const company: ILeadCompany = {};
							company.company_id = o;
							companies.push(company);
						});
						body.companies = companies;
					}
					// console.log(options.segments)
					// if (options.segments) {
					// 	const segments: ISegment[] = [];
					// 	// @ts-ignore
					// 	options.segments.forEach( o => {
					// 		const segment: ISegment = {};
					// 		segment.id = o;
					// 		segment.type = 'segment';
					// 		segments.push(segment);
					// 	});
					// 	body.segments = { segments };
					// }
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
						// const socialProfilesValues = (this.getNodeParameter('socialProfilesUi', i) as IDataObject).socialProfilesValues as IDataObject[];
						// if (socialProfilesValues && socialProfilesValues.length > 0) {
						// 	const socialProfiles: ISocialProfile[] = [];
						// 	socialProfilesValues.forEach( o => {
						// 		const socialProfile: ISocialProfile = {};
						// 		socialProfile.name = o.name as string;
						// 		socialProfile.type = 'social_profile';
						// 		socialProfile.username = o.username as string;
						// 		socialProfile.url = o.url as string;
						// 		socialProfile.id = o.id as string;
						// 		socialProfiles.push(socialProfile);
						// 	});
						// 	body.social_profiles = socialProfiles;
						// }
					} else {
						// const  socialProfilesJson = validateJSON(this.getNodeParameter('socialProfilesJson', i) as string);
						// if (socialProfilesJson) {
						// 	body.social_profiles = socialProfilesJson;
						// }
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
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'view') {
					let query = '';
					const viewBy = this.getNodeParameter('viewBy', 0) as string;
					const value = this.getNodeParameter('value', i) as string;
					if (viewBy === 'userId') {
						query = `user_id=${value}`;
					}
					if (viewBy === 'phone') {
						query = `phone=${value}`;
					}
					try {
					if (viewBy === 'id') {
						responseData = await intercomApiRequest.call(this, `/contacts/${value}`, 'GET');
					} else {
						responseData = await intercomApiRequest.call(this, `/contacts?${query}`, 'GET');
					}
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'list') {
					let query = '';
					const listBy = this.getNodeParameter('listBy', 0) as string;
					if (listBy === 'email') {
						query = `email=${this.getNodeParameter('value', i) as string}`;
					}
					if (listBy === 'phone') {
						query = `phone=${this.getNodeParameter('value', i) as string}`;
					}
					try {
						responseData = await intercomApiRequest.call(this, `/contacts?${query}`, 'GET');
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'delete') {
					const deleteBy = this.getNodeParameter('deleteBy', 0) as string;
					const value = this.getNodeParameter('value', i) as string;
					try {
						if (deleteBy === 'id') {
							responseData = await intercomApiRequest.call(this, `/contacts/${value}`, 'DELETE');
						} else {
							responseData = await intercomApiRequest.call(this, `/contacts?user_id=${value}`, 'DELETE');
						}
						} catch (err) {
							throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
						}
				}
			}
			//https://developers.intercom.com/intercom-api-reference/reference#users
			if (resource === 'user') {
				if (operation === 'create' || operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: IUser = {};
					if (id === 'email') {
						body.email =  this.getNodeParameter('idValue', i) as string;
					}
					if (id === 'userId') {
						body.user_id =  this.getNodeParameter('idValue', i) as string;
					}
					if (options.phone) {
						body.phone = options.phone as string;
					}
					if (options.name) {
						body.name = options.name as string;
					}
					if (options.unsubscribedFromEmails) {
						body.unsubscribed_from_emails = options.unsubscribedFromEmails as boolean;
					}
					if (options.updateLastRequestAt) {
						body.update_last_request_at = options.updateLastRequestAt as boolean;
					}
					if (options.sessionCount) {
						body.session_count = options.sessionCount as number;
					}
					if(options.avatar) {
						const avatar: IAvatar = {
							type: 'avatar',
							image_url: options.avatar as string,
						};
						body.avatar = avatar;
					}
					if (options.utmSource) {
						body.utm_source = options.utmSource as string;
					}
					if (options.utmMedium) {
						body.utm_medium = options.utmMedium as string;
					}
					if (options.utmCampaign) {
						body.utm_campaign = options.utmCampaign as string;
					}
					if (options.utmTerm) {
						body.utm_term = options.utmTerm as string;
					}
					if (options.utmContent) {
						body.utm_content = options.utmContent as string;
					}
					if (options.companies) {
						const companies: IUserCompany[] = [];
						// @ts-ignore
						options.companies.forEach( o => {
							const company: IUserCompany = {};
							company.company_id = o;
							companies.push(company);
						});
						body.companies = companies;
					}
					if (options.sessionCount) {
						body.session_count = options.sessionCount as number;
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
						const id = this.getNodeParameter('id', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const userId = this.getNodeParameter('userId', i) as string;
						if (id) {
							body.id = id;
						}
						if (email) {
							body.email = email;
						}
						if (userId) {
							body.user_id = userId;
						}
					}
					try {
						responseData = await intercomApiRequest.call(this, '/users', 'POST', body);
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'view') {
					let query = '';
					const viewBy = this.getNodeParameter('viewBy', 0) as string;
					const value = this.getNodeParameter('value', i) as string;
					if (viewBy === 'userId') {
						query = `user_id=${value}`;
					}
					try {
					if (viewBy === 'id') {
						responseData = await intercomApiRequest.call(this, `/users/${value}`, 'GET');
					} else {
						responseData = await intercomApiRequest.call(this, `/users?${query}`, 'GET');
					}
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'list') {
					let query = '';
					const listBy = this.getNodeParameter('listBy', 0) as string;
					if (listBy === 'email') {
						query = `email=${this.getNodeParameter('value', i) as string}`;
					}
					if (listBy === 'segmentId') {
						query = `segment_id=${this.getNodeParameter('value', i) as string}`;
					}
					if (listBy === 'tagId') {
						query = `tag_id=${this.getNodeParameter('value', i) as string}`;
					}
					try {
						responseData = await intercomApiRequest.call(this, `/users?${query}`, 'GET');
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'delete') {
					const id = this.getNodeParameter('id', i) as string;
					try {
						responseData = await intercomApiRequest.call(this, `/users/${id}`, 'DELETE');
						} catch (err) {
							throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
						}
				}
			}
			//https://developers.intercom.com/intercom-api-reference/reference#companies
			if (resource === 'company') {
				if (operation === 'create' || operation === 'update') {
					const id = this.getNodeParameter('companyId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: ICompany = {
						company_id: id,
					};
					if (options.monthlySpend) {
						body.monthly_spend = options.monthlySpend as number;
					}
					if (options.name) {
						body.name = options.name as string;
					}
					if (options.plan) {
						body.plan = options.plan as string;
					}
					if (options.size) {
						body.size = options.size as number;
					}
					if (options.website) {
						body.website = options.website as string;
					}
					if (options.industry) {
						body.industry = options.industry as string;
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
						responseData = await intercomApiRequest.call(this, '/companies', 'POST', body);
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'view') {
					let query = '';
					const viewBy = this.getNodeParameter('viewBy', 0) as string;
					const value = this.getNodeParameter('value', i) as string;
					if (viewBy === 'companyId') {
						query = `company_id=${value}`;
					}
					if (viewBy === 'name') {
						query = `name=${value}`;
					}
					try {
					if (viewBy === 'id') {
						responseData = await intercomApiRequest.call(this, `/companies/${value}`, 'GET');
					} else {
						responseData = await intercomApiRequest.call(this, `/companies?${query}`, 'GET');
					}
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'list') {
					let query = '';
					const listBy = this.getNodeParameter('listBy', 0) as string;
					if (listBy === 'segmentId') {
						query = `segment_id=${this.getNodeParameter('value', i) as string}`;
					}
					if (listBy === 'tagId') {
						query = `tag_id=${this.getNodeParameter('value', i) as string}`;
					}
					try {
						responseData = await intercomApiRequest.call(this, `/companies?${query}`, 'GET');
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'users') {
					let query = '';
					const listBy = this.getNodeParameter('listBy', 0) as string;
					const value = this.getNodeParameter('value', i) as string;
					if (listBy === 'companyId') {
						query = `company_id=${value}`;
					}
					try {
						if (listBy === 'id') {
							responseData = await intercomApiRequest.call(this, `/companies/${value}/users`, 'GET');
						} else {
							responseData = await intercomApiRequest.call(this, `/companies?${query}&type=users`, 'GET');
						}
					} catch (err) {
						throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
					}
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
