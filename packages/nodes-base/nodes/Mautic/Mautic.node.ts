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
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	mauticApiRequest,
	mauticApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import {
	segmentEmailFields,
	segmentEmailOperations,
} from './SegmentEmailDescription';

import {
	companyFields,
	companyOperations,
} from './CompanyDescription';

import {
	companyContactFields,
	companyContactOperations,
} from './CompanyContactDescription';

import {
	contactSegmentFields,
	contactSegmentOperations,
} from './ContactSegmentDescription';

import {
	campaignContactFields,
	campaignContactOperations,
} from './CampaignContactDescription';

import {
	snakeCase,
} from 'change-case';

export class Mautic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mautic',
		name: 'mautic',
		icon: 'file:mautic.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mautic API',
		defaults: {
			name: 'Mautic',
			color: '#52619b',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mauticApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'credentials',
						],
					},
				},
			},
			{
				name: 'mauticOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Credentials',
						value: 'credentials',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'credentials',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Campaign Contact',
						value: 'campaignContact',
						description: 'Add/remove contacts to/from a campaign',
					},
					{
						name: 'Company',
						value: 'company',
						description: 'Create or modify a company',
					},
					{
						name: 'Company Contact',
						value: 'companyContact',
						description: 'Add/remove contacts to/from a company',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Create & modify contacts',
					},
					{
						name: 'Contact Segment',
						value: 'contactSegment',
						description: 'Add/remove contacts to/from a segment',
					},
					{
						name: 'Segment Email',
						value: 'segmentEmail',
						description: 'Send an email',
					},
				],
				default: 'contact',
				description: 'Resource to consume',
			},
			...companyOperations,
			...companyFields,
			...contactOperations,
			...contactFields,
			...contactSegmentOperations,
			...contactSegmentFields,
			...campaignContactOperations,
			...campaignContactFields,
			...companyContactOperations,
			...companyContactFields,
			...segmentEmailOperations,
			...segmentEmailFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const companies = await mauticApiRequestAllItems.call(this, 'companies', 'GET', '/companies');
				for (const company of companies) {
					returnData.push({
						name: company.fields.all.companyname,
						value: company.fields.all.companyname,
					});
				}
				return returnData;
			},
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await mauticApiRequestAllItems.call(this, 'tags', 'GET', '/tags');
				for (const tag of tags) {
					returnData.push({
						name: tag.tag,
						value: tag.tag,
					});
				}
				return returnData;
			},
			// Get all the available stages to display them to user so that he can
			// select them easily
			async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const stages = await mauticApiRequestAllItems.call(this, 'stages', 'GET', '/stages');
				for (const stage of stages) {
					returnData.push({
						name: stage.name,
						value: stage.id,
					});
				}
				return returnData;
			},
			// Get all the available company fields to display them to user so that he can
			// select them easily
			async getCompanyFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await mauticApiRequestAllItems.call(this, 'fields', 'GET', '/fields/company');
				for (const field of fields) {
					returnData.push({
						name: field.label,
						value: field.alias,
					});
				}
				return returnData;
			},
			async getIndustries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await mauticApiRequestAllItems.call(this, 'fields', 'GET', '/fields/company');
				for (const field of fields) {
					if (field.alias === 'companyindustry') {
						for (const { label, value } of field.properties.list) {
							returnData.push({
								name: label,
								value,
							});
						}
					}
				}
				return returnData;
			},
			// Get all the available contact fields to display them to user so that he can
			// select them easily
			async getContactFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await mauticApiRequestAllItems.call(this, 'fields', 'GET', '/fields/contact');
				for (const field of fields) {
					returnData.push({
						name: field.label,
						value: field.alias,
					});
				}
				return returnData;
			},
			// Get all the available segments to display them to user so that he can
			// select them easily
			async getSegments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const segments = await mauticApiRequestAllItems.call(this, 'lists', 'GET', '/segments');
				for (const segment of segments) {
					returnData.push({
						name: segment.name,
						value: segment.id,
					});
				}
				return returnData;
			},
			// Get all the available campaings to display them to user so that he can
			// select them easily
			async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const campaings = await mauticApiRequestAllItems.call(this, 'campaigns', 'GET', '/campaigns');
				for (const campaign of campaings) {
					returnData.push({
						name: campaign.name,
						value: campaign.id,
					});
				}
				return returnData;
			},
			// Get all the available emails to display them to user so that he can
			// select them easily
			async getEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
				for (const email of emails) {
					returnData.push({
						name: email.name,
						value: email.id,
					});
				}
				return returnData;
			},
			// Get all the available list / segment emails to display them to user so that he can
			// select them easily
			async getSegmentEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
				for (const email of emails) {
					if (email.emailType === 'list') {
						returnData.push({
							name: email.name,
							value: email.id,
						});
					}
				}
				return returnData;
			},
			// Get all the available campaign / template emails to display them to user so that he can
			// select them easily
			async getCampaignEmails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
				for (const email of emails) {
					if (email.emailType === 'template') {
						returnData.push({
							name: email.name,
							value: email.id,
						});
					}
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let qs: IDataObject;
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			qs = {};
			try {

				if (resource === 'company') {
					//https://developer.mautic.org/#create-company
					if (operation === 'create') {
						const simple = this.getNodeParameter('simple', i) as boolean;
						const name = this.getNodeParameter('name', i) as string;
						const body: IDataObject = {
							companyname: name,
						};
						const {
							addressUi,
							customFieldsUi,
							companyEmail,
							fax,
							industry,
							numberOfEmpoyees,
							phone,
							website,
							annualRevenue,
							description,
							...rest
						} = this.getNodeParameter('additionalFields', i) as {
							addressUi: {
								addressValues: IDataObject,
							},
							customFieldsUi: {
								customFieldValues: [
									{
										fieldId: string,
										fieldValue: string,
									},
								],
							}
							companyEmail: string,
							fax: string,
							industry: string,
							numberOfEmpoyees: number,
							phone: string,
							website: string,
							annualRevenue: number,
							description: string,
						};
						if (addressUi?.addressValues) {
							const { addressValues } = addressUi;
							body.companyaddress1 = addressValues.address1 as string;
							body.companyaddress2 = addressValues.address2 as string;
							body.companycity = addressValues.city as string;
							body.companystate = addressValues.state as string;
							body.companycountry = addressValues.country as string;
							body.companyzipcode = addressValues.zipCode as string;
						}

						if (companyEmail) {
							body.companyemail = companyEmail;
						}

						if (fax) {
							body.companyfax = fax;
						}

						if (industry) {
							body.companyindustry = industry;
						}

						if (industry) {
							body.companyindustry = industry;
						}

						if (numberOfEmpoyees) {
							body.companynumber_of_employees = numberOfEmpoyees;
						}

						if (phone) {
							body.companyphone = phone;
						}

						if (website) {
							body.companywebsite = website;
						}

						if (annualRevenue) {
							body.companyannual_revenue = annualRevenue;
						}

						if (description) {
							body.companydescription = description;
						}

						if (customFieldsUi?.customFieldValues) {
							const { customFieldValues } = customFieldsUi;
							const data = customFieldValues.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
							Object.assign(body, data);
						}

						Object.assign(body, rest);
						responseData = await mauticApiRequest.call(this, 'POST', '/companies/new', body);
						responseData = responseData.company;
						if (simple === true) {
							responseData = responseData.fields.all;
						}
					}
					//https://developer.mautic.org/#edit-company
					if (operation === 'update') {
						const companyId = this.getNodeParameter('companyId', i) as string;
						const simple = this.getNodeParameter('simple', i) as boolean;
						const body: IDataObject = {};
						const {
							addressUi,
							customFieldsUi,
							companyEmail,
							name,
							fax,
							industry,
							numberOfEmpoyees,
							phone,
							website,
							annualRevenue,
							description,
							...rest
						} = this.getNodeParameter('updateFields', i) as {
							addressUi: {
								addressValues: IDataObject,
							},
							customFieldsUi: {
								customFieldValues: [
									{
										fieldId: string,
										fieldValue: string,
									},
								],
							}
							companyEmail: string,
							name: string,
							fax: string,
							industry: string,
							numberOfEmpoyees: number,
							phone: string,
							website: string,
							annualRevenue: number,
							description: string,
						};
						if (addressUi?.addressValues) {
							const { addressValues } = addressUi;
							body.companyaddress1 = addressValues.address1 as string;
							body.companyaddress2 = addressValues.address2 as string;
							body.companycity = addressValues.city as string;
							body.companystate = addressValues.state as string;
							body.companycountry = addressValues.country as string;
							body.companyzipcode = addressValues.zipCode as string;
						}

						if (companyEmail) {
							body.companyemail = companyEmail;
						}

						if (name) {
							body.companyname = name;
						}

						if (fax) {
							body.companyfax = fax;
						}

						if (industry) {
							body.companyindustry = industry;
						}

						if (industry) {
							body.companyindustry = industry;
						}

						if (numberOfEmpoyees) {
							body.companynumber_of_employees = numberOfEmpoyees;
						}

						if (phone) {
							body.companyphone = phone;
						}

						if (website) {
							body.companywebsite = website;
						}

						if (annualRevenue) {
							body.companyannual_revenue = annualRevenue;
						}

						if (description) {
							body.companydescription = description;
						}

						if (customFieldsUi?.customFieldValues) {
							const { customFieldValues } = customFieldsUi;
							const data = customFieldValues.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
							Object.assign(body, data);
						}

						Object.assign(body, rest);

						responseData = await mauticApiRequest.call(this, 'PATCH', `/companies/${companyId}/edit`, body);
						responseData = responseData.company;
						if (simple === true) {
							responseData = responseData.fields.all;
						}
					}
					//https://developer.mautic.org/#get-company
					if (operation === 'get') {
						const companyId = this.getNodeParameter('companyId', i) as string;
						const simple = this.getNodeParameter('simple', i) as boolean;
						responseData = await mauticApiRequest.call(this, 'GET', `/companies/${companyId}`);
						responseData = responseData.company;
						if (simple === true) {
							responseData = responseData.fields.all;
						}
					}
					//https://developer.mautic.org/#list-contact-companies
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simple = this.getNodeParameter('simple', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						qs = Object.assign(qs, additionalFields);
						if (returnAll === true) {
							responseData = await mauticApiRequestAllItems.call(this, 'companies', 'GET', '/companies', {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							qs.start = 0;
							responseData = await mauticApiRequest.call(this, 'GET', '/companies', {}, qs);
							if (responseData.errors) {
								throw new NodeApiError(this.getNode(), responseData);
							}
							responseData = responseData.companies;
							responseData = Object.values(responseData);
						}
						if (simple === true) {
							//@ts-ignore
							responseData = responseData.map(item => item.fields.all);
						}
					}
					//https://developer.mautic.org/#delete-company
					if (operation === 'delete') {
						const simple = this.getNodeParameter('simple', i) as boolean;
						const companyId = this.getNodeParameter('companyId', i) as string;
						responseData = await mauticApiRequest.call(this, 'DELETE', `/companies/${companyId}/delete`);
						responseData = responseData.company;
						if (simple === true) {
							responseData = responseData.fields.all;
						}
					}
				}

				if (resource === 'contact') {
					//https://developer.mautic.org/?php#create-contact
					if (operation === 'create') {
						const options = this.getNodeParameter('options', i) as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
						let body: IDataObject = {};
						if (!jsonActive) {
							body.email = this.getNodeParameter('email', i) as string;
							body.firstname = this.getNodeParameter('firstName', i) as string;
							body.lastname = this.getNodeParameter('lastName', i) as string;
							body.company = this.getNodeParameter('company', i) as string;
							body.position = this.getNodeParameter('position', i) as string;
							body.title = this.getNodeParameter('title', i) as string;
						} else {
							const json = validateJSON(this.getNodeParameter('bodyJson', i) as string);
							if (json !== undefined) {
								body = { ...json };
							} else {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON');
							}
						}
						if (additionalFields.ipAddress) {
							body.ipAddress = additionalFields.ipAddress as string;
						}
						if (additionalFields.lastActive) {
							body.lastActive = additionalFields.lastActive as string;
						}
						if (additionalFields.ownerId) {
							body.ownerId = additionalFields.ownerId as string;
						}
						if (additionalFields.addressUi) {
							const addressValues = (additionalFields.addressUi as IDataObject).addressValues as IDataObject;
							if (addressValues) {
								body.address1 = addressValues.address1 as string;
								body.address2 = addressValues.address2 as string;
								body.city = addressValues.city as string;
								body.state = addressValues.state as string;
								body.country = addressValues.country as string;
								body.zipcode = addressValues.zipCode as string;
							}
						}
						if (additionalFields.socialMediaUi) {
							const socialMediaValues = (additionalFields.socialMediaUi as IDataObject).socialMediaValues as IDataObject;
							if (socialMediaValues) {
								body.facebook = socialMediaValues.facebook as string;
								body.foursquare = socialMediaValues.foursquare as string;
								body.instagram = socialMediaValues.instagram as string;
								body.linkedin = socialMediaValues.linkedIn as string;
								body.skype = socialMediaValues.skype as string;
								body.twitter = socialMediaValues.twitter as string;
							}
						}
						if (additionalFields.customFieldsUi) {
							const customFields = (additionalFields.customFieldsUi as IDataObject).customFieldValues as IDataObject[];
							if (customFields) {
								const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
								Object.assign(body, data);
							}
						}
						if (additionalFields.b2bOrb2c) {
							body.b2b_or_b2c = additionalFields.b2bOrb2c as string;
						}
						if (additionalFields.crmId) {
							body.crm_id = additionalFields.crmId as string;
						}
						if (additionalFields.fax) {
							body.fax = additionalFields.fax as string;
						}
						if (additionalFields.hasPurchased) {
							body.haspurchased = additionalFields.hasPurchased as boolean;
						}
						if (additionalFields.mobile) {
							body.mobile = additionalFields.mobile as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.prospectOrCustomer) {
							body.prospect_or_customer = additionalFields.prospectOrCustomer as string;
						}
						if (additionalFields.sandbox) {
							body.sandbox = additionalFields.sandbox as boolean;
						}
						if (additionalFields.stage) {
							body.stage = additionalFields.stage as string;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						responseData = await mauticApiRequest.call(this, 'POST', '/contacts/new', body);
						responseData = [responseData.contact];
						if (options.rawData === false) {
							responseData = responseData.map(item => item.fields.all);
						}
					}
					//https://developer.mautic.org/?php#edit-contact
					if (operation === 'update') {
						const options = this.getNodeParameter('options', i) as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const contactId = this.getNodeParameter('contactId', i) as string;
						let body: IDataObject = {};
						if (updateFields.email) {
							body.email = updateFields.email as string;
						}
						if (updateFields.firstName) {
							body.firstname = updateFields.firstName as string;
						}
						if (updateFields.lastName) {
							body.lastname = updateFields.lastName as string;
						}
						if (updateFields.company) {
							body.company = updateFields.company as string;
						}
						if (updateFields.position) {
							body.position = updateFields.position as string;
						}
						if (updateFields.title) {
							body.title = updateFields.title as string;
						}
						if (updateFields.bodyJson) {
							const json = validateJSON(updateFields.bodyJson as string);
							if (json !== undefined) {
								body = { ...json };
							} else {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON');
							}
						}
						if (updateFields.ipAddress) {
							body.ipAddress = updateFields.ipAddress as string;
						}
						if (updateFields.lastActive) {
							body.lastActive = updateFields.lastActive as string;
						}
						if (updateFields.ownerId) {
							body.ownerId = updateFields.ownerId as string;
						}
						if (updateFields.addressUi) {
							const addressValues = (updateFields.addressUi as IDataObject).addressValues as IDataObject;
							if (addressValues) {
								body.address1 = addressValues.address1 as string;
								body.address2 = addressValues.address2 as string;
								body.city = addressValues.city as string;
								body.state = addressValues.state as string;
								body.country = addressValues.country as string;
								body.zipcode = addressValues.zipCode as string;
							}
						}
						if (updateFields.socialMediaUi) {
							const socialMediaValues = (updateFields.socialMediaUi as IDataObject).socialMediaValues as IDataObject;
							if (socialMediaValues) {
								body.facebook = socialMediaValues.facebook as string;
								body.foursquare = socialMediaValues.foursquare as string;
								body.instagram = socialMediaValues.instagram as string;
								body.linkedin = socialMediaValues.linkedIn as string;
								body.skype = socialMediaValues.skype as string;
								body.twitter = socialMediaValues.twitter as string;
							}
						}
						if (updateFields.customFieldsUi) {
							const customFields = (updateFields.customFieldsUi as IDataObject).customFieldValues as IDataObject[];
							if (customFields) {
								const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
								Object.assign(body, data);
							}
						}
						if (updateFields.b2bOrb2c) {
							body.b2b_or_b2c = updateFields.b2bOrb2c as string;
						}
						if (updateFields.crmId) {
							body.crm_id = updateFields.crmId as string;
						}
						if (updateFields.fax) {
							body.fax = updateFields.fax as string;
						}
						if (updateFields.hasPurchased) {
							body.haspurchased = updateFields.hasPurchased as boolean;
						}
						if (updateFields.mobile) {
							body.mobile = updateFields.mobile as string;
						}
						if (updateFields.phone) {
							body.phone = updateFields.phone as string;
						}
						if (updateFields.prospectOrCustomer) {
							body.prospect_or_customer = updateFields.prospectOrCustomer as string;
						}
						if (updateFields.sandbox) {
							body.sandbox = updateFields.sandbox as boolean;
						}
						if (updateFields.stage) {
							body.stage = updateFields.stage as string;
						}
						if (updateFields.tags) {
							body.tags = updateFields.tags as string;
						}
						if (updateFields.website) {
							body.website = updateFields.website as string;
						}
						responseData = await mauticApiRequest.call(this, 'PATCH', `/contacts/${contactId}/edit`, body);
						responseData = [responseData.contact];
						if (options.rawData === false) {
							responseData = responseData.map(item => item.fields.all);
						}
					}
					//https://developer.mautic.org/?php#get-contact
					if (operation === 'get') {
						const options = this.getNodeParameter('options', i) as IDataObject;
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await mauticApiRequest.call(this, 'GET', `/contacts/${contactId}`);
						responseData = [responseData.contact];
						if (options.rawData === false) {
							responseData = responseData.map(item => item.fields.all);
						}
					}
					//https://developer.mautic.org/?php#list-contacts
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						qs = Object.assign(qs, options);
						if (qs.orderBy) {
							// For some reason does camelCase get used in the returned data
							// but snake_case here. So convert it automatically to not confuse
							// the users.
							qs.orderBy = snakeCase(qs.orderBy as string);
						}

						if (returnAll === true) {
							responseData = await mauticApiRequestAllItems.call(this, 'contacts', 'GET', '/contacts', {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							qs.start = 0;
							responseData = await mauticApiRequest.call(this, 'GET', '/contacts', {}, qs);
							if (responseData.errors) {
								throw new NodeApiError(this.getNode(), responseData);
							}
							responseData = responseData.contacts;
							responseData = Object.values(responseData);
						}
						if (options.rawData === false) {
							//@ts-ignore
							responseData = responseData.map(item => item.fields.all);
						}
					}
					//https://developer.mautic.org/?php#delete-contact
					if (operation === 'delete') {
						const options = this.getNodeParameter('options', i) as IDataObject;
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await mauticApiRequest.call(this, 'DELETE', `/contacts/${contactId}/delete`);
						responseData = [responseData.contact];
						if (options.rawData === false) {
							responseData = responseData.map(item => item.fields.all);
						}
					}
					//https://developer.mautic.org/#send-email-to-contact
					if (operation === 'sendEmail') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const campaignEmailId = this.getNodeParameter('campaignEmailId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/emails/${campaignEmailId}/contact/${contactId}/send`);
					}
					//https://developer.mautic.org/#add-do-not-contact
					//https://developer.mautic.org/#remove-from-do-not-contact
					if (operation === 'editDoNotContactList') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const action = this.getNodeParameter('action', i) as string;
						const channel = this.getNodeParameter('channel', i) as string;
						const body: IDataObject = {};
						if (action === 'add') {
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							Object.assign(body, additionalFields);
						}
						responseData = await mauticApiRequest.call(this, 'POST', `/contacts/${contactId}/dnc/${channel}/${action}`, body);
						responseData = responseData.contact;
					}

					//https://developer.mautic.org/#add-points
					//https://developer.mautic.org/#subtract-points
					if (operation === 'editContactPoint') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const action = this.getNodeParameter('action', i) as string;
						const points = this.getNodeParameter('points', i) as string;
						const path = (action === 'add') ? 'plus' : 'minus';
						responseData = await mauticApiRequest.call(this, 'POST', `/contacts/${contactId}/points/${path}/${points}`);
					}
				}

				if (resource === 'contactSegment') {
					//https://developer.mautic.org/?php#add-contact-to-a-segment
					if (operation === 'add') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const segmentId = this.getNodeParameter('segmentId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/segments/${segmentId}/contact/${contactId}/add`);
					}
					//https://developer.mautic.org/#remove-contact-from-a-segment
					if (operation === 'remove') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const segmentId = this.getNodeParameter('segmentId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/segments/${segmentId}/contact/${contactId}/remove`);
					}
				}

				if (resource === 'campaignContact') {
					//https://developer.mautic.org/#add-contact-to-a-campaign
					if (operation === 'add') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const campaignId = this.getNodeParameter('campaignId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/campaigns/${campaignId}/contact/${contactId}/add`);
					}
					//https://developer.mautic.org/#remove-contact-from-a-campaign
					if (operation === 'remove') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const campaignId = this.getNodeParameter('campaignId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/campaigns/${campaignId}/contact/${contactId}/remove`);
					}
				}

				if (resource === 'segmentEmail') {
					//https://developer.mautic.org/#send-email-to-segment
					if (operation === 'send') {
						const segmentEmailId = this.getNodeParameter('segmentEmailId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/emails/${segmentEmailId}/send`);
					}
				}

				if (resource === 'companyContact') {
					//https://developer.mautic.org/#add-contact-to-a-company
					if (operation === 'add') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const companyId = this.getNodeParameter('companyId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/companies/${companyId}/contact/${contactId}/add`, {});
						// responseData = responseData.company;
						// if (simple === true) {
						// 	responseData = responseData.fields.all;
						// }
					}
					//https://developer.mautic.org/#remove-contact-from-a-company
					if (operation === 'remove') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const companyId = this.getNodeParameter('companyId', i) as string;
						responseData = await mauticApiRequest.call(this, 'POST', `/companies/${companyId}/contact/${contactId}/remove`, {});
						// responseData = responseData.company;
						// if (simple === true) {
						// 	responseData = responseData.fields.all;
						// }
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
