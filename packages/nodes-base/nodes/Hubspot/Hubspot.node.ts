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
	NodeOperationError,
} from 'n8n-workflow';

import {
	clean,
	getAssociations,
	getCallMetadata,
	getEmailMetadata,
	getMeetingMetadata,
	getTaskMetadata,
	hubspotApiRequest,
	hubspotApiRequestAllItems,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import {
	contactListFields,
	contactListOperations,
} from './ContactListDescription';

import {
	companyFields,
	companyOperations,
} from './CompanyDescription';

import {
	dealFields,
	dealOperations,
} from './DealDescription';

import {
	engagementFields,
	engagementOperations,
} from './EngagementDescription';

import {
	formFields,
	formOperations,
} from './FormDescription';

import {
	ticketFields,
	ticketOperations,
} from './TicketDescription';

import {
	IForm,
} from './FormInterface';

import {
	IAssociation,
	IDeal,
} from './DealInterface';

import {
	snakeCase,
} from 'change-case';

export class Hubspot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HubSpot',
		name: 'hubspot',
		icon: 'file:hubspot.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume HubSpot API',
		defaults: {
			name: 'Hubspot',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hubspotApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiKey',
						],
					},
				},
			},
			{
				name: 'hubspotOAuth2Api',
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
						name: 'API Key',
						value: 'apiKey',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiKey',
				description: 'The method of authentication.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Contact List',
						value: 'contactList',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Engagement',
						value: 'engagement',
					},
					{
						name: 'Form',
						value: 'form',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
				],
				default: 'deal',
				description: 'Resource to consume.',
			},
			// CONTACT
			...contactOperations,
			...contactFields,
			// CONTACT LIST
			...contactListOperations,
			...contactListFields,
			// COMPANY
			...companyOperations,
			...companyFields,
			// DEAL
			...dealOperations,
			...dealFields,
			// ENGAGEMENT
			...engagementOperations,
			...engagementFields,
			// FORM
			...formOperations,
			...formFields,
			// TICKET
			...ticketOperations,
			...ticketFields,
		],
	};

	methods = {
		loadOptions: {
			/* -------------------------------------------------------------------------- */
			/*                                 CONTACT                                    */
			/* -------------------------------------------------------------------------- */

			// Get all the contact lead statuses to display them to user so that he can
			// select them easily
			async getContactLeadStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_lead_status') {
						for (const option of property.options) {
							const statusName = option.label;
							const statusId = option.value;
							returnData.push({
								name: statusName,
								value: statusId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the contact legal basics to display them to user so that he can
			// select them easily
			async getContactLealBasics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_legal_basis') {
						for (const option of property.options) {
							const statusName = option.label;
							const statusId = option.value;
							returnData.push({
								name: statusName,
								value: statusId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the contact lifecycle stages to display them to user so that he can
			// select them easily
			async getContactLifeCycleStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'lifecyclestage') {
						for (const option of property.options) {
							const stageName = option.label;
							const stageId = option.value;
							returnData.push({
								name: stageName,
								value: stageId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the contact lifecycle stages to display them to user so that he can
			// select them easily
			async getContactOriginalSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_analytics_source') {
						for (const option of property.options) {
							const sourceName = option.label;
							const sourceId = option.value;
							returnData.push({
								name: sourceName,
								value: sourceId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the contact preffered languages to display them to user so that he can
			// select them easily
			async getContactPrefferedLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_language') {
						for (const option of property.options) {
							const languageName = option.label;
							const languageId = option.value;
							returnData.push({
								name: languageName,
								value: languageId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the contact preffered languages to display them to user so that he can
			// select them easily
			async getContactStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_content_membership_status') {
						for (const option of property.options) {
							const languageName = option.label;
							const languageId = option.value;
							returnData.push({
								name: languageName,
								value: languageId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the contact properties to display them to user so that he can
			// select them easily
			async getContactProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},

			// Get all the contact properties to display them to user so that he can
			// select them easily
			async getContactCustomProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.hubspotDefined === null) {
						const propertyName = property.label;
						const propertyId = property.name;
						returnData.push({
							name: propertyName,
							value: propertyId,
						});
					}
				}
				return returnData;
			},

			// Get all the contact number of employees options to display them to user so that he can
			// select them easily
			async getContactNumberOfEmployees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'numemployees') {
						for (const option of property.options) {
							const optionName = option.label;
							const optionId = option.value;
							returnData.push({
								name: optionName,
								value: optionId,
							});
						}
					}
				}
				return returnData;
			},

			/* -------------------------------------------------------------------------- */
			/*                                 COMPANY                                    */
			/* -------------------------------------------------------------------------- */

			// Get all the company industries to display them to user so that he can
			// select them easily
			async getCompanyIndustries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'industry') {
						for (const option of property.options) {
							const industryName = option.label;
							const industryId = option.value;
							returnData.push({
								name: industryName,
								value: industryId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company lead statuses to display them to user so that he can
			// select them easily
			async getCompanyleadStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_lead_status') {
						for (const option of property.options) {
							const statusName = option.label;
							const statusId = option.value;
							returnData.push({
								name: statusName,
								value: statusId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company lifecycle stages to display them to user so that he can
			// select them easily
			async getCompanylifecycleStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'lifecyclestage') {
						for (const option of property.options) {
							const stageName = option.label;
							const stageId = option.value;
							returnData.push({
								name: stageName,
								value: stageId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company types stages to display them to user so that he can
			// select them easily
			async getCompanyTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'type') {
						for (const option of property.options) {
							const typeName = option.label;
							const typeId = option.value;
							returnData.push({
								name: typeName,
								value: typeId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company types stages to display them to user so that he can
			// select them easily
			async getCompanyTargetAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_target_account') {
						for (const option of property.options) {
							const targetName = option.label;
							const targetId = option.value;
							returnData.push({
								name: targetName,
								value: targetId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company source types stages to display them to user so that he can
			// select them easily
			async getCompanySourceTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_analytics_source') {
						for (const option of property.options) {
							const typeName = option.label;
							const typeId = option.value;
							returnData.push({
								name: typeName,
								value: typeId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company web technologies stages to display them to user so that he can
			// select them easily
			async getCompanyWebTechnologies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'web_technologies') {
						for (const option of property.options) {
							const technologyName = option.label;
							const technologyId = option.value;
							returnData.push({
								name: technologyName,
								value: technologyId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the company properties to display them to user so that he can
			// select them easily
			async getCompanyProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},

			// Get all the company custom properties to display them to user so that he can
			// select them easily
			async getCompanyCustomProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.hubspotDefined === null) {
						const propertyName = property.label;
						const propertyId = property.name;
						returnData.push({
							name: propertyName,
							value: propertyId,
						});
					}
				}
				return returnData;
			},

			/* -------------------------------------------------------------------------- */
			/*                                 DEAL                                       */
			/* -------------------------------------------------------------------------- */

			// Get all the groups to display them to user so that he can
			// select them easily
			async getDealStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/crm-pipelines/v1/pipelines/deals';
				let stages = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				stages = stages.results[0].stages;
				for (const stage of stages) {
					const stageName = stage.label;
					const stageId = stage.stageId;
					returnData.push({
						name: stageName,
						value: stageId,
					});
				}
				return returnData;
			},

			// Get all the deal types to display them to user so that he can
			// select them easily
			async getDealTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v1/deals/properties/named/dealtype';
				const dealTypes = await hubspotApiRequest.call(this, 'GET', endpoint);
				for (const dealType of dealTypes.options) {
					const dealTypeName = dealType.label;
					const dealTypeId = dealType.value;
					returnData.push({
						name: dealTypeName,
						value: dealTypeId,
					});
				}
				return returnData;
			},

			// Get all the deal properties to display them to user so that he can
			// select them easily
			async getDealCustomProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/deals/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.hubspotDefined === null) {
						const propertyName = property.label;
						const propertyId = property.name;
						returnData.push({
							name: propertyName,
							value: propertyId,
						});
					}
				}
				return returnData;
			},
			// Get all the deal properties to display them to user so that he can
			// select them easily
			async getDealProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/deals/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},

			/* -------------------------------------------------------------------------- */
			/*                                 FORM                                       */
			/* -------------------------------------------------------------------------- */

			// Get all the forms to display them to user so that he can
			// select them easily
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/forms/v2/forms';
				const forms = await hubspotApiRequest.call(this, 'GET', endpoint, {}, { formTypes: 'ALL' });
				for (const form of forms) {
					const formName = form.name;
					const formId = form.guid;
					returnData.push({
						name: formName,
						value: formId,
					});
				}
				return returnData;
			},

			// Get all the subscription types to display them to user so that he can
			// select them easily
			async getSubscriptionTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/email/public/v1/subscriptions';
				const subscriptions = await hubspotApiRequestAllItems.call(this, 'subscriptionDefinitions', 'GET', endpoint, {});
				for (const subscription of subscriptions) {
					const subscriptionName = subscription.name;
					const subscriptionId = subscription.id;
					returnData.push({
						name: subscriptionName,
						value: subscriptionId,
					});
				}
				return returnData;
			},

			/* -------------------------------------------------------------------------- */
			/*                                 TICKET                                     */
			/* -------------------------------------------------------------------------- */

			// Get all the ticket categories to display them to user so that he can
			// select them easily
			async getTicketCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/tickets/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_ticket_category') {
						for (const option of property.options) {
							const categoryName = option.label;
							const categoryId = option.value;
							returnData.push({
								name: categoryName,
								value: categoryId,
							});
						}
					}
				}
				return returnData.sort((a, b) => a.name < b.name ? 0 : 1);
			},

			// Get all the ticket pipelines to display them to user so that he can
			// select them easily
			async getTicketPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/crm-pipelines/v1/pipelines/tickets';
				const { results } = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const pipeline of results) {
					const pipelineName = pipeline.label;
					const pipelineId = pipeline.pipelineId;
					returnData.push({
						name: pipelineName,
						value: pipelineId,
					});
				}
				return returnData;
			},

			// Get all the ticket resolutions to display them to user so that he can
			// select them easily
			async getTicketPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/tickets/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_ticket_priority') {
						for (const option of property.options) {
							const priorityName = option.label;
							const priorityId = option.value;
							returnData.push({
								name: priorityName,
								value: priorityId,
							});
						}
					}
				}
				return returnData;
			},

			// Get all the ticket properties to display them to user so that he can
			// select them easily
			async getTicketProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/tickets/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},

			// Get all the ticket resolutions to display them to user so that he can
			// select them easily
			async getTicketResolutions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/tickets/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'hs_resolution') {
						for (const option of property.options) {
							const resolutionName = option.label;
							const resolutionId = option.value;
							returnData.push({
								name: resolutionName,
								value: resolutionId,
							});
						}
					}
				}
				return returnData.sort((a, b) => a.name < b.name ? 0 : 1);
			},

			// Get all the ticket sources to display them to user so that he can
			// select them easily
			async getTicketSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/tickets/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					if (property.name === 'source_type') {
						for (const option of property.options) {
							const sourceName = option.label;
							const sourceId = option.value;
							returnData.push({
								name: sourceName,
								value: sourceId,
							});
						}
					}
				}
				return returnData.sort((a, b) => a.name < b.name ? 0 : 1);
			},

			// Get all the ticket stages to display them to user so that he can
			// select them easily
			async getTicketStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const currentPipelineId = this.getCurrentNodeParameter('pipelineId') as string;
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/crm-pipelines/v1/pipelines/tickets';
				const { results } = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const pipeline of results) {
					if (currentPipelineId === pipeline.pipelineId) {
						for (const stage of pipeline.stages) {
							const stageName = stage.label;
							const stageId = stage.stageId;
							returnData.push({
								name: stageName,
								value: stageId,
							});
						}
					}
				}
				return returnData;
			},

			/* -------------------------------------------------------------------------- */
			/*                                 COMMON                                     */
			/* -------------------------------------------------------------------------- */

			// Get all the owners to display them to user so that he can
			// select them easily
			async getOwners(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/owners/v2/owners';
				const owners = await hubspotApiRequest.call(this, 'GET', endpoint);
				for (const owner of owners) {
					const ownerName = owner.email;
					const ownerId = owner.ownerId;
					returnData.push({
						name: ownerName,
						value: ownerId,
					});
				}
				return returnData;
			},

			// Get all the companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					properties: ['name'],
				};
				const endpoint = '/companies/v2/companies/paged';
				const companies = await hubspotApiRequestAllItems.call(this, 'companies', 'GET', endpoint, {}, qs);
				for (const company of companies) {
					const companyName = (company.properties.name) ? company.properties.name.value : company.companyId;
					const companyId = company.companyId;
					returnData.push({
						name: companyName,
						value: companyId,
					});
				}
				return returnData.sort((a, b) => a.name < b.name ? 0 : 1);
			},

			// Get all the companies to display them to user so that he can
			// select them easily
			async getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/contacts/v1/lists/all/contacts/all';
				const contacts = await hubspotApiRequestAllItems.call(this, 'contacts', 'GET', endpoint);
				for (const contact of contacts) {
					const contactName = `${contact.properties.firstname.value} ${contact.properties.lastname.value}`;
					const contactId = contact.vid;
					returnData.push({
						name: contactName,
						value: contactId,
					});
				}
				return returnData.sort((a, b) => a.name < b.name ? 0 : 1);
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

		//https://legacydocs.hubspot.com/docs/methods/lists/contact-lists-overview
		if (resource === 'contactList') {
			try {
				//https://legacydocs.hubspot.com/docs/methods/lists/add_contact_to_list
				if (operation === 'add') {
					const listId = this.getNodeParameter('listId', 0) as string;
					const by = this.getNodeParameter('by', 0) as string;
					const body: { [key: string]: [] } = { emails: [], vids: [] };
					for (let i = 0; i < length; i++) {
						if (by === 'id') {
							const id = this.getNodeParameter('id', i) as string;
							body.vids.push(parseInt(id, 10) as never);
						} else {
							const email = this.getNodeParameter('email', i) as string;
							body.emails.push(email as never);
						}
					}
					responseData = await hubspotApiRequest.call(this, 'POST', `/contacts/v1/lists/${listId}/add`, body);
					returnData.push(responseData);
				}
				//https://legacydocs.hubspot.com/docs/methods/lists/remove_contact_from_list
				if (operation === 'remove') {
					const listId = this.getNodeParameter('listId', 0) as string;
					const body: { [key: string]: [] } = { vids: [] };
					for (let i = 0; i < length; i++) {
						const id = this.getNodeParameter('id', i) as string;
						body.vids.push(parseInt(id, 10) as never);
					}
					responseData = await hubspotApiRequest.call(this, 'POST', `/contacts/v1/lists/${listId}/remove`, body);
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
				} else {
					throw error;
				}
			}
		} else {
			for (let i = 0; i < length; i++) {
				try {
					//https://developers.hubspot.com/docs/methods/contacts/create_or_update
					if (resource === 'contact') {
						//https://developers.hubspot.com/docs/methods/companies/create_company
						if (operation === 'upsert') {
							const email = this.getNodeParameter('email', i) as string;
							const resolveData = this.getNodeParameter('resolveData', i) as boolean;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const body: IDataObject[] = [];
							if (additionalFields.annualRevenue) {
								body.push({
									property: 'annualrevenue',
									value: (additionalFields.annualRevenue as number).toString(),
								});
							}
							if (additionalFields.city) {
								body.push({
									property: 'city',
									value: additionalFields.city,
								});
							}
							if (additionalFields.clickedFacebookAd) {
								body.push({
									property: 'hs_facebook_ad_clicked',
									value: additionalFields.clickedFacebookAd,
								});
							}
							if (additionalFields.closeDate) {
								body.push({
									property: 'closedate',
									value: new Date(additionalFields.closeDate as string).getTime(),
								});
							}
							if (additionalFields.companyName) {
								body.push({
									property: 'company',
									value: additionalFields.companyName,
								});
							}
							if (additionalFields.companySize) {
								body.push({
									property: 'company_size',
									value: additionalFields.companySize,
								});
							}
							if (additionalFields.description) {
								body.push({
									property: 'description',
									value: additionalFields.description,
								});
							}
							if (additionalFields.contactOwner) {
								body.push({
									property: 'hubspot_owner_id',
									value: additionalFields.contactOwner,
								});
							}
							if (additionalFields.country) {
								body.push({
									property: 'country',
									value: additionalFields.country,
								});
							}
							if (additionalFields.dateOfBirth) {
								body.push({
									property: 'date_of_birth',
									value: additionalFields.dateOfBirth,
								});
							}
							if (additionalFields.degree) {
								body.push({
									property: 'degree',
									value: additionalFields.degree,
								});
							}
							if (additionalFields.facebookClickId) {
								body.push({
									property: 'hs_facebook_click_id',
									value: additionalFields.facebookClickId,
								});
							}
							if (additionalFields.faxNumber) {
								body.push({
									property: 'fax',
									value: additionalFields.faxNumber,
								});
							}
							if (additionalFields.fieldOfStudy) {
								body.push({
									property: 'field_of_study',
									value: additionalFields.fieldOfStudy,
								});
							}
							if (additionalFields.firstName) {
								body.push({
									property: 'firstname',
									value: additionalFields.firstName,
								});
							}
							if (additionalFields.gender) {
								body.push({
									property: 'gender',
									value: additionalFields.gender,
								});
							}
							if (additionalFields.googleAdClickId) {
								body.push({
									property: 'hs_google_click_id',
									value: additionalFields.googleAdClickId,
								});
							}
							if (additionalFields.graduationDate) {
								body.push({
									property: 'graduation_date',
									value: additionalFields.graduationDate,
								});
							}
							if (additionalFields.industry) {
								body.push({
									property: 'industry',
									value: additionalFields.industry,
								});
							}
							if (additionalFields.jobFunction) {
								body.push({
									property: 'job_function',
									value: additionalFields.jobFunction,
								});
							}
							if (additionalFields.jobTitle) {
								body.push({
									property: 'jobtitle',
									value: additionalFields.jobTitle,
								});
							}
							if (additionalFields.lastName) {
								body.push({
									property: 'lastname',
									value: additionalFields.lastName,
								});
							}
							if (additionalFields.leadStatus) {
								body.push({
									property: 'hs_lead_status',
									value: additionalFields.leadStatus,
								});
							}
							if (additionalFields.processingContactData) {
								body.push({
									property: 'hs_legal_basis',
									value: additionalFields.processingContactData,
								});
							}
							if (additionalFields.lifeCycleStage) {
								body.push({
									property: 'lifecyclestage',
									value: additionalFields.lifeCycleStage,
								});
							}
							if (additionalFields.maritalStatus) {
								body.push({
									property: 'marital_status',
									value: additionalFields.maritalStatus,
								});
							}
							if (additionalFields.membershipNote) {
								body.push({
									property: 'hs_content_membership_notes',
									value: additionalFields.membershipNote,
								});
							}
							if (additionalFields.message) {
								body.push({
									property: 'message',
									value: additionalFields.message,
								});
							}
							if (additionalFields.mobilePhoneNumber) {
								body.push({
									property: 'mobilephone',
									value: additionalFields.mobilePhoneNumber,
								});
							}
							if (additionalFields.numberOfEmployees) {
								body.push({
									property: 'numemployees',
									value: additionalFields.numberOfEmployees,
								});
							}
							if (additionalFields.originalSource) {
								body.push({
									property: 'hs_analytics_source',
									value: additionalFields.originalSource,
								});
							}
							if (additionalFields.phoneNumber) {
								body.push({
									property: 'phone',
									value: additionalFields.phoneNumber,
								});
							}
							if (additionalFields.postalCode) {
								body.push({
									property: 'zip',
									value: additionalFields.postalCode,
								});
							}
							if (additionalFields.prefferedLanguage) {
								body.push({
									property: 'hs_language',
									value: additionalFields.prefferedLanguage,
								});
							}
							if (additionalFields.relationshipStatus) {
								body.push({
									property: 'relationship_status',
									value: additionalFields.relationshipStatus,
								});
							}
							if (additionalFields.salutation) {
								body.push({
									property: 'salutation',
									value: additionalFields.salutation,
								});
							}
							if (additionalFields.school) {
								body.push({
									property: 'school',
									value: additionalFields.school,
								});
							}
							if (additionalFields.seniority) {
								body.push({
									property: 'seniority',
									value: additionalFields.seniority,
								});
							}
							if (additionalFields.startDate) {
								body.push({
									property: 'start_date',
									value: additionalFields.startDate,
								});
							}
							if (additionalFields.stateRegion) {
								body.push({
									property: 'state',
									value: additionalFields.stateRegion,
								});
							}
							if (additionalFields.status) {
								body.push({
									property: 'hs_content_membership_status',
									value: additionalFields.status,
								});
							}
							if (additionalFields.streetAddress) {
								body.push({
									property: 'address',
									value: additionalFields.streetAddress,
								});
							}
							if (additionalFields.twitterUsername) {
								body.push({
									property: 'twitterhandle',
									value: additionalFields.twitterUsername,
								});
							}
							if (additionalFields.websiteUrl) {
								body.push({
									property: 'website',
									value: additionalFields.websiteUrl,
								});
							}
							if (additionalFields.workEmail) {
								body.push({
									property: 'work_email',
									value: additionalFields.workEmail,
								});
							}

							if (additionalFields.customPropertiesUi) {
								const customProperties = (additionalFields.customPropertiesUi as IDataObject).customPropertiesValues as IDataObject[];

								if (customProperties) {
									for (const customProperty of customProperties) {
										body.push({
											property: customProperty.property,
											value: customProperty.value,
										});
									}
								}
							}

							const endpoint = `/contacts/v1/contact/createOrUpdate/email/${email}`;
							responseData = await hubspotApiRequest.call(this, 'POST', endpoint, { properties: body });

							if (additionalFields.associatedCompanyId) {
								const companyAssociations: IDataObject[] = [];
								companyAssociations.push({
									fromObjectId: responseData.vid,
									toObjectId: additionalFields.associatedCompanyId,
									category: 'HUBSPOT_DEFINED',
									definitionId: 1,
								});
								await hubspotApiRequest.call(this, 'PUT', '/crm-associations/v1/associations/create-batch', companyAssociations);
							}

							if (resolveData) {
								const isNew = responseData.isNew;
								const qs: IDataObject = {};
								if (additionalFields.properties) {
									qs.property = additionalFields.properties as string[];
								}
								responseData = await hubspotApiRequest.call(this, 'GET', `/contacts/v1/contact/vid/${responseData.vid}/profile`, {}, qs);
								responseData.isNew = isNew;
							}
						}
						//https://developers.hubspot.com/docs/methods/contacts/get_contact
						if (operation === 'get') {
							const contactId = this.getNodeParameter('contactId', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							if (additionalFields.formSubmissionMode) {
								qs.formSubmissionMode = additionalFields.formSubmissionMode as string;
							}
							if (additionalFields.listMerberships) {
								qs.showListMemberships = additionalFields.listMerberships as boolean;
							}
							if (additionalFields.properties) {
								qs.property = additionalFields.properties as string[];
							}
							if (additionalFields.propertyMode) {
								qs.propertyMode = snakeCase(additionalFields.propertyMode as string);
							}
							const endpoint = `/contacts/v1/contact/vid/${contactId}/profile`;
							responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
						}
						//https://developers.hubspot.com/docs/methods/contacts/get_contacts
						if (operation === 'getAll') {
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							if (additionalFields.formSubmissionMode) {
								qs.formSubmissionMode = additionalFields.formSubmissionMode as string;
							}
							if (additionalFields.listMerberships) {
								qs.showListMemberships = additionalFields.listMerberships as boolean;
							}
							if (additionalFields.properties) {
								qs.property = additionalFields.properties as string[];
							}
							if (additionalFields.propertyMode) {
								qs.propertyMode = snakeCase(additionalFields.propertyMode as string);
							}
							const endpoint = '/contacts/v1/lists/all/contacts/all';
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'contacts', 'GET', endpoint, {}, qs);
							} else {
								qs.count = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.contacts;
							}
						}
						//https://developers.hubspot.com/docs/methods/contacts/get_recently_created_contacts
						if (operation === 'getRecentlyCreatedUpdated') {
							let endpoint;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							const filters = this.getNodeParameter('filters', i) as IDataObject;
							if (filters.formSubmissionMode) {
								qs.formSubmissionMode = filters.formSubmissionMode as string;
							}
							if (filters.listMerberships) {
								qs.showListMemberships = filters.listMerberships as boolean;
							}
							if (filters.properties) {
								qs.property = filters.properties as string[];
							}
							if (filters.propertyMode) {
								qs.propertyMode = snakeCase(filters.propertyMode as string);
							}

							endpoint = '/contacts/v1/lists/recently_updated/contacts/recent';

							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'contacts', 'GET', endpoint, {}, qs);
							} else {
								qs.count = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.contacts;
							}
						}
						//https://developers.hubspot.com/docs/methods/contacts/delete_contact
						if (operation === 'delete') {
							const contactId = this.getNodeParameter('contactId', i) as string;
							const endpoint = `/contacts/v1/contact/vid/${contactId}`;
							responseData = await hubspotApiRequest.call(this, 'DELETE', endpoint);
						}
						//https://developers.hubspot.com/docs/api/crm/search
						if (operation === 'search') {
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							const filtersGroupsUi = this.getNodeParameter('filterGroupsUi', i) as IDataObject;
							const sortBy = additionalFields.sortBy || 'createdate';
							const direction = additionalFields.direction || 'DESCENDING';

							const body: IDataObject = {
								sorts: [
									{
										propertyName: sortBy,
										direction,
									},
								],
							};

							if (filtersGroupsUi) {
								const filterGroupValues = (filtersGroupsUi as IDataObject).filterGroupsValues as IDataObject[];
								if (filterGroupValues) {
									body.filterGroups = [];
									for (const filterGroupValue of filterGroupValues) {
										if (filterGroupValue.filtersUi) {
											const filterValues = (filterGroupValue.filtersUi as IDataObject).filterValues as IDataObject[];
											if (filterValues) {
												//@ts-ignore
												body.filterGroups.push({ filters: filterValues });
											}
										}
									}
								}
							}

							Object.assign(body, additionalFields);

							const endpoint = '/crm/v3/objects/contacts/search';

							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'results', 'POST', endpoint, body, qs);
							} else {
								body.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body, qs);
								responseData = responseData.results;
							}
						}
					}
					//https://developers.hubspot.com/docs/methods/companies/companies-overview
					if (resource === 'company') {
						//https://developers.hubspot.com/docs/methods/companies/create_company
						if (operation === 'create') {
							const name = this.getNodeParameter('name', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const body: IDataObject[] = [];
							body.push({
								name: 'name',
								value: name,
							});
							if (additionalFields.aboutUs) {
								body.push({
									name: 'about_us',
									value: additionalFields.aboutUs,
								});
							}
							if (additionalFields.annualRevenue) {
								body.push({
									name: 'annualrevenue',
									value: (additionalFields.annualRevenue as number).toString(),
								});
							}
							if (additionalFields.city) {
								body.push({
									name: 'city',
									value: additionalFields.city,
								});
							}
							if (additionalFields.closeDate) {
								body.push({
									name: 'closedate',
									value: new Date(additionalFields.closeDate as string).getTime(),
								});
							}
							if (additionalFields.companyDomainName) {
								body.push({
									name: 'domain',
									value: additionalFields.companyDomainName,
								});
							}
							if (additionalFields.companyOwner) {
								body.push({
									name: 'hubspot_owner_id',
									value: additionalFields.companyOwner,
								});
							}
							if (additionalFields.countryRegion) {
								body.push({
									name: 'country',
									value: additionalFields.countryRegion,
								});
							}
							if (additionalFields.description) {
								body.push({
									name: 'description',
									value: additionalFields.description,
								});
							}
							if (additionalFields.facebookFans) {
								body.push({
									name: 'facebookfans',
									value: additionalFields.facebookFans,
								});
							}
							if (additionalFields.googlePlusPage) {
								body.push({
									name: 'googleplus_page',
									value: additionalFields.googlePlusPage,
								});
							}
							if (additionalFields.industry) {
								body.push({
									name: 'industry',
									value: additionalFields.industry,
								});
							}
							if (additionalFields.isPublic) {
								body.push({
									name: 'is_public',
									value: additionalFields.isPublic,
								});
							}
							if (additionalFields.leadStatus) {
								body.push({
									name: 'hs_lead_status',
									value: additionalFields.leadStatus,
								});
							}
							if (additionalFields.lifecycleStatus) {
								body.push({
									name: 'lifecyclestage',
									value: additionalFields.lifecycleStatus,
								});
							}
							if (additionalFields.linkedinBio) {
								body.push({
									name: 'linkedinbio',
									value: additionalFields.linkedinBio,
								});
							}
							if (additionalFields.linkedInCompanyPage) {
								body.push({
									name: 'linkedin_company_page',
									value: additionalFields.linkedInCompanyPage,
								});
							}
							if (additionalFields.numberOfEmployees) {
								body.push({
									name: 'numberofemployees',
									value: additionalFields.numberOfEmployees,
								});
							}
							if (additionalFields.originalSourceType) {
								body.push({
									name: 'hs_analytics_source',
									value: additionalFields.originalSourceType,
								});
							}
							if (additionalFields.phoneNumber) {
								body.push({
									name: 'phone',
									value: additionalFields.phoneNumber,
								});
							}
							if (additionalFields.postalCode) {
								body.push({
									name: 'zip',
									value: additionalFields.postalCode,
								});
							}
							if (additionalFields.stateRegion) {
								body.push({
									name: 'state',
									value: additionalFields.stateRegion,
								});
							}
							if (additionalFields.streetAddress) {
								body.push({
									name: 'address',
									value: additionalFields.streetAddress,
								});
							}
							if (additionalFields.streetAddress2) {
								body.push({
									name: 'address2',
									value: additionalFields.streetAddress2,
								});
							}
							if (additionalFields.targetAccount) {
								body.push({
									name: 'hs_target_account',
									value: additionalFields.targetAccount,
								});
							}
							if (additionalFields.timezone) {
								body.push({
									name: 'timezone',
									value: additionalFields.timezone,
								});
							}
							if (additionalFields.totalMoneyRaised) {
								body.push({
									name: 'total_money_raised',
									value: additionalFields.totalMoneyRaised,
								});
							}
							if (additionalFields.twitterBio) {
								body.push({
									name: 'twitterbio',
									value: additionalFields.twitterBio,
								});
							}
							if (additionalFields.twitterFollowers) {
								body.push({
									name: 'twitterfollowers',
									value: additionalFields.twitterFollowers,
								});
							}
							if (additionalFields.twitterHandle) {
								body.push({
									name: 'twitterhandle',
									value: additionalFields.twitterHandle,
								});
							}
							if (additionalFields.type) {
								body.push({
									name: 'type',
									value: additionalFields.type,
								});
							}
							if (additionalFields.websiteUrl) {
								body.push({
									name: 'website',
									value: additionalFields.websiteUrl,
								});
							}
							if (additionalFields.webTechnologies) {
								body.push({
									name: 'web_technologies',
									value: additionalFields.webTechnologies,
								});
							}
							if (additionalFields.yearFounded) {
								body.push({
									name: 'founded_year',
									value: additionalFields.yearFounded,
								});
							}
							if (additionalFields.customPropertiesUi) {
								const customProperties = (additionalFields.customPropertiesUi as IDataObject).customPropertiesValues as IDataObject[];

								if (customProperties) {
									for (const customProperty of customProperties) {
										body.push({
											name: customProperty.property,
											value: customProperty.value,
										});
									}
								}
							}
							const endpoint = '/companies/v2/companies';
							responseData = await hubspotApiRequest.call(this, 'POST', endpoint, { properties: body });
						}
						//https://developers.hubspot.com/docs/methods/companies/update_company
						if (operation === 'update') {
							const companyId = this.getNodeParameter('companyId', i) as string;
							const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
							const body: IDataObject[] = [];
							if (updateFields.name) {
								body.push({
									name: 'name',
									value: updateFields.name,
								});
							}
							if (updateFields.aboutUs) {
								body.push({
									name: 'about_us',
									value: updateFields.aboutUs,
								});
							}
							if (updateFields.annualRevenue) {
								body.push({
									name: 'annualrevenue',
									value: (updateFields.annualRevenue as number).toString(),
								});
							}
							if (updateFields.city) {
								body.push({
									name: 'city',
									value: updateFields.city,
								});
							}
							if (updateFields.closeDate) {
								body.push({
									name: 'closedate',
									value: new Date(updateFields.closeDate as string).getTime(),
								});
							}
							if (updateFields.companyDomainName) {
								body.push({
									name: 'domain',
									value: updateFields.companyDomainName,
								});
							}
							if (updateFields.companyOwner) {
								body.push({
									name: 'hubspot_owner_id',
									value: updateFields.companyOwner,
								});
							}
							if (updateFields.countryRegion) {
								body.push({
									name: 'country',
									value: updateFields.countryRegion,
								});
							}
							if (updateFields.description) {
								body.push({
									name: 'description',
									value: updateFields.description,
								});
							}
							if (updateFields.facebookFans) {
								body.push({
									name: 'facebookfans',
									value: updateFields.facebookFans,
								});
							}
							if (updateFields.googlePlusPage) {
								body.push({
									name: 'googleplus_page',
									value: updateFields.googlePlusPage,
								});
							}
							if (updateFields.industry) {
								body.push({
									name: 'industry',
									value: updateFields.industry,
								});
							}
							if (updateFields.isPublic) {
								body.push({
									name: 'is_public',
									value: updateFields.isPublic,
								});
							}
							if (updateFields.leadStatus) {
								body.push({
									name: 'hs_lead_status',
									value: updateFields.leadStatus,
								});
							}
							if (updateFields.lifecycleStatus) {
								body.push({
									name: 'lifecyclestage',
									value: updateFields.lifecycleStatus,
								});
							}
							if (updateFields.linkedinBio) {
								body.push({
									name: 'linkedinbio',
									value: updateFields.linkedinBio,
								});
							}
							if (updateFields.linkedInCompanyPage) {
								body.push({
									name: 'linkedin_company_page',
									value: updateFields.linkedInCompanyPage,
								});
							}
							if (updateFields.numberOfEmployees) {
								body.push({
									name: 'numberofemployees',
									value: updateFields.numberOfEmployees,
								});
							}
							if (updateFields.originalSourceType) {
								body.push({
									name: 'hs_analytics_source',
									value: updateFields.originalSourceType,
								});
							}
							if (updateFields.phoneNumber) {
								body.push({
									name: 'phone',
									value: updateFields.phoneNumber,
								});
							}
							if (updateFields.postalCode) {
								body.push({
									name: 'zip',
									value: updateFields.postalCode,
								});
							}
							if (updateFields.stateRegion) {
								body.push({
									name: 'state',
									value: updateFields.stateRegion,
								});
							}
							if (updateFields.streetAddress) {
								body.push({
									name: 'address',
									value: updateFields.streetAddress,
								});
							}
							if (updateFields.streetAddress2) {
								body.push({
									name: 'address2',
									value: updateFields.streetAddress2,
								});
							}
							if (updateFields.targetAccount) {
								body.push({
									name: 'hs_target_account',
									value: updateFields.targetAccount,
								});
							}
							if (updateFields.timezone) {
								body.push({
									name: 'timezone',
									value: updateFields.timezone,
								});
							}
							if (updateFields.totalMoneyRaised) {
								body.push({
									name: 'total_money_raised',
									value: updateFields.totalMoneyRaised,
								});
							}
							if (updateFields.twitterBio) {
								body.push({
									name: 'twitterbio',
									value: updateFields.twitterBio,
								});
							}
							if (updateFields.twitterFollowers) {
								body.push({
									name: 'twitterfollowers',
									value: updateFields.twitterFollowers,
								});
							}
							if (updateFields.twitterHandle) {
								body.push({
									name: 'twitterhandle',
									value: updateFields.twitterHandle,
								});
							}
							if (updateFields.type) {
								body.push({
									name: 'type',
									value: updateFields.type,
								});
							}
							if (updateFields.websiteUrl) {
								body.push({
									name: 'website',
									value: updateFields.websiteUrl,
								});
							}
							if (updateFields.webTechnologies) {
								body.push({
									name: 'web_technologies',
									value: updateFields.webTechnologies,
								});
							}
							if (updateFields.yearFounded) {
								body.push({
									name: 'founded_year',
									value: updateFields.yearFounded,
								});
							}
							if (updateFields.customPropertiesUi) {
								const customProperties = (updateFields.customPropertiesUi as IDataObject).customPropertiesValues as IDataObject[];

								if (customProperties) {
									for (const customProperty of customProperties) {
										body.push({
											name: customProperty.property,
											value: customProperty.value,
										});
									}
								}
							}
							const endpoint = `/companies/v2/companies/${companyId}`;
							responseData = await hubspotApiRequest.call(this, 'PUT', endpoint, { properties: body });
						}
						//https://developers.hubspot.com/docs/methods/companies/get_company
						if (operation === 'get') {
							const companyId = this.getNodeParameter('companyId', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							if (additionalFields.includeMergeAudits) {
								qs.includeMergeAudits = additionalFields.includeMergeAudits as boolean;
							}
							const endpoint = `/companies/v2/companies/${companyId}`;
							responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
						}
						//https://developers.hubspot.com/docs/methods/companies/get-all-companies
						if (operation === 'getAll') {
							const options = this.getNodeParameter('options', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							if (options.includeMergeAudits) {
								qs.includeMergeAudits = options.includeMergeAudits as boolean;
							}
							if (options.properties) {
								qs.properties = options.properties as string[];
							}
							if (options.propertiesWithHistory) {
								qs.propertiesWithHistory = (options.propertiesWithHistory as string).split(',');
							}
							const endpoint = `/companies/v2/companies/paged`;
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'companies', 'GET', endpoint, {}, qs);
							} else {
								qs.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.companies;
							}
						}
						//https://developers.hubspot.com/docs/methods/companies/get_companies_modified
						if (operation === 'getRecentlyCreated' || operation === 'getRecentlyModified') {
							let endpoint;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							if (operation === 'getRecentlyCreated') {
								endpoint = `/companies/v2/companies/recent/created`;
							} else {
								const filters = this.getNodeParameter('filters', i) as IDataObject;
								if (filters.since) {
									qs.since = new Date(filters.since as string).getTime();
								}
								endpoint = `/companies/v2/companies/recent/modified`;
							}
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'results', 'GET', endpoint, {}, qs);
							} else {
								qs.count = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.results;
							}
						}
						//https://developers.hubspot.com/docs/methods/companies/search_companies_by_domain
						if (operation === 'searchByDomain') {
							const domain = this.getNodeParameter('domain', i) as string;
							const options = this.getNodeParameter('options', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							const body: IDataObject = {
								requestOptions: {},
							};
							if (options.properties) {
								body.requestOptions = { properties: options.properties as string[] };
							}
							const endpoint = `/companies/v2/domains/${domain}/companies`;
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'results', 'POST', endpoint, body);
							} else {
								body.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body);
								responseData = responseData.results;
							}
						}
						//https://developers.hubspot.com/docs/methods/companies/delete_company
						if (operation === 'delete') {
							const companyId = this.getNodeParameter('companyId', i) as string;
							const endpoint = `/companies/v2/companies/${companyId}`;
							responseData = await hubspotApiRequest.call(this, 'DELETE', endpoint);
						}
					}
					//https://developers.hubspot.com/docs/methods/deals/deals_overview
					if (resource === 'deal') {
						if (operation === 'create') {
							const body: IDeal = {};
							body.properties = [];
							const association: IAssociation = {};
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const stage = this.getNodeParameter('stage', i) as string;
							if (stage) {
								body.properties.push({
									name: 'dealstage',
									value: stage,
								});
							}
							if (additionalFields.associatedCompany) {
								association.associatedCompanyIds = additionalFields.associatedCompany as number[];
							}
							if (additionalFields.associatedVids) {
								association.associatedVids = additionalFields.associatedVids as number[];
							}
							if (additionalFields.dealName) {
								body.properties.push({
									name: 'dealname',
									value: additionalFields.dealName as string,
								});
							}
							if (additionalFields.closeDate) {
								body.properties.push({
									name: 'closedate',
									value: new Date(additionalFields.closeDate as string).getTime(),
								});
							}
							if (additionalFields.amount) {
								body.properties.push({
									name: 'amount',
									value: additionalFields.amount as string,
								});
							}
							if (additionalFields.dealType) {
								body.properties.push({
									name: 'dealtype',
									value: additionalFields.dealType as string,
								});
							}
							if (additionalFields.pipeline) {
								body.properties.push({
									name: 'pipeline',
									value: additionalFields.pipeline as string,
								});
							}
							if (additionalFields.description) {
								body.properties.push({
									name: 'description',
									value: additionalFields.description as string,
								});
							}
							if (additionalFields.customPropertiesUi) {
								const customProperties = (additionalFields.customPropertiesUi as IDataObject).customPropertiesValues as IDataObject[];
								if (customProperties) {
									for (const customProperty of customProperties) {
										body.properties.push({
											name: customProperty.property,
											value: customProperty.value,
										});
									}
								}
							}
							body.associations = association;
							const endpoint = '/deals/v1/deal';
							responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body);
						}
						if (operation === 'update') {
							const body: IDeal = {};
							body.properties = [];
							const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
							const dealId = this.getNodeParameter('dealId', i) as string;
							if (updateFields.stage) {
								body.properties.push({
									name: 'dealstage',
									value: updateFields.stage as string,
								});
							}
							if (updateFields.dealName) {
								body.properties.push({
									name: 'dealname',
									value: updateFields.dealName as string,
								});
							}
							if (updateFields.closeDate) {
								body.properties.push({
									name: 'closedate',
									value: new Date(updateFields.closeDate as string).getTime(),
								});
							}
							if (updateFields.amount) {
								body.properties.push({
									name: 'amount',
									value: updateFields.amount as string,
								});
							}
							if (updateFields.dealType) {
								body.properties.push({
									name: 'dealtype',
									value: updateFields.dealType as string,
								});
							}
							if (updateFields.pipeline) {
								body.properties.push({
									name: 'pipeline',
									value: updateFields.pipeline as string,
								});
							}
							if (updateFields.description) {
								body.properties.push({
									name: 'description',
									value: updateFields.description as string,
								});
							}
							if (updateFields.customPropertiesUi) {
								const customProperties = (updateFields.customPropertiesUi as IDataObject).customPropertiesValues as IDataObject[];
								if (customProperties) {
									for (const customProperty of customProperties) {
										body.properties.push({
											name: customProperty.property,
											value: customProperty.value,
										});
									}
								}
							}
							const endpoint = `/deals/v1/deal/${dealId}`;
							responseData = await hubspotApiRequest.call(this, 'PUT', endpoint, body);
						}
						if (operation === 'get') {
							const dealId = this.getNodeParameter('dealId', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							if (additionalFields.includePropertyVersions) {
								qs.includePropertyVersions = additionalFields.includePropertyVersions as boolean;
							}
							const endpoint = `/deals/v1/deal/${dealId}`;
							responseData = await hubspotApiRequest.call(this, 'GET', endpoint);
						}
						if (operation === 'getAll') {
							const filters = this.getNodeParameter('filters', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							if (filters.includeAssociations) {
								qs.includeAssociations = filters.includeAssociations as boolean;
							}
							if (filters.properties) {
								const properties = filters.properties as string | string[];
								qs.properties = (!Array.isArray(filters.properties)) ? (properties as string).split(',') : properties;
							}
							if (filters.propertiesWithHistory) {
								const propertiesWithHistory = filters.propertiesWithHistory as string | string[];
								qs.propertiesWithHistory = (!Array.isArray(filters.propertiesWithHistory)) ? (propertiesWithHistory as string).split(',') : propertiesWithHistory;
							}
							const endpoint = `/deals/v1/deal/paged`;
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'deals', 'GET', endpoint, {}, qs);
							} else {
								qs.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.deals;
							}
						}
						if (operation === 'getRecentlyCreated' || operation === 'getRecentlyModified') {
							let endpoint;
							const filters = this.getNodeParameter('filters', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							if (filters.since) {
								qs.since = new Date(filters.since as string).getTime();
							}
							if (filters.includePropertyVersions) {
								qs.includePropertyVersions = filters.includePropertyVersions as boolean;
							}
							if (operation === 'getRecentlyCreated') {
								endpoint = `/deals/v1/deal/recent/created`;
							} else {
								endpoint = `/deals/v1/deal/recent/modified`;
							}
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'results', 'GET', endpoint, {}, qs);
							} else {
								qs.count = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.results;
							}
						}
						if (operation === 'delete') {
							const dealId = this.getNodeParameter('dealId', i) as string;
							const endpoint = `/deals/v1/deal/${dealId}`;
							responseData = await hubspotApiRequest.call(this, 'DELETE', endpoint);
						}
						//https://developers.hubspot.com/docs/api/crm/search
						if (operation === 'search') {
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							const filtersGroupsUi = this.getNodeParameter('filterGroupsUi', i) as IDataObject;
							const sortBy = additionalFields.sortBy || 'createdate';
							const direction = additionalFields.direction || 'DESCENDING';

							const body: IDataObject = {
								sorts: [
									{
										propertyName: sortBy,
										direction,
									},
								],
							};

							if (filtersGroupsUi) {
								const filterGroupValues = (filtersGroupsUi as IDataObject).filterGroupsValues as IDataObject[];
								if (filterGroupValues) {
									body.filterGroups = [];
									for (const filterGroupValue of filterGroupValues) {
										if (filterGroupValue.filtersUi) {
											const filterValues = (filterGroupValue.filtersUi as IDataObject).filterValues as IDataObject[];
											if (filterValues) {
												//@ts-ignore
												body.filterGroups.push({ filters: filterValues });
											}
										}
									}
								}
							}

							Object.assign(body, additionalFields);

							const endpoint = '/crm/v3/objects/deals/search';

							if (returnAll) {

								responseData = await hubspotApiRequestAllItems.call(this, 'results', 'POST', endpoint, body, qs);

							} else {
								body.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body, qs);
								responseData = responseData.results;
							}
						}
					}
					if (resource === 'engagement') {
						//https://legacydocs.hubspot.com/docs/methods/engagements/create_engagement
						if (operation === 'create') {
							const type = this.getNodeParameter('type', i) as string;
							const metadata = this.getNodeParameter('metadata', i) as IDataObject;
							const associations = this.getNodeParameter('additionalFields.associations', i, {}) as IDataObject;

							if (!Object.keys(metadata).length) {
								throw new NodeOperationError(
									this.getNode(),
									`At least one metadata field needs to set`,
								);
							}

							const body: {
								engagement: { type: string },
								metadata: IDataObject,
								associations: IDataObject
							} = {
								engagement: {
									type: type.toUpperCase(),
								},
								metadata: {},
								associations: {},
							};

							if (type === 'email') {
								body.metadata = getEmailMetadata(metadata);
							}

							if (type === 'task') {
								body.metadata = getTaskMetadata(metadata);
							}

							if (type === 'meeting') {
								body.metadata = getMeetingMetadata(metadata);
							}

							if (type === 'call') {
								body.metadata = getCallMetadata(metadata);
							}

							//@ts-ignore
							body.associations = getAssociations(associations);

							const endpoint = '/engagements/v1/engagements';
							responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body);
						}
						//https://legacydocs.hubspot.com/docs/methods/engagements/get_engagement
						if (operation === 'delete') {
							const engagementId = this.getNodeParameter('engagementId', i) as string;
							const endpoint = `/engagements/v1/engagements/${engagementId}`;
							responseData = await hubspotApiRequest.call(this, 'DELETE', endpoint, {}, qs);
							responseData = { success: true };
						}
						//https://legacydocs.hubspot.com/docs/methods/engagements/get_engagement
						if (operation === 'get') {
							const engagementId = this.getNodeParameter('engagementId', i) as string;
							const endpoint = `/engagements/v1/engagements/${engagementId}`;
							responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
						}
						//https://legacydocs.hubspot.com/docs/methods/engagements/get-all-engagements
						if (operation === 'getAll') {
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							const endpoint = `/engagements/v1/engagements/paged`;
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'results', 'GET', endpoint, {}, qs);
							} else {
								qs.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
								responseData = responseData.results;
							}
						}
					}
					//https://developers.hubspot.com/docs/methods/forms/forms_overview
					if (resource === 'form') {
						//https://developers.hubspot.com/docs/methods/forms/v2/get_fields
						if (operation === 'getFields') {
							const formId = this.getNodeParameter('formId', i) as string;
							responseData = await hubspotApiRequest.call(this, 'GET', `/forms/v2/fields/${formId}`);
						}
						//https://developers.hubspot.com/docs/methods/forms/submit_form_v3
						if (operation === 'submit') {
							const formId = this.getNodeParameter('formId', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const context = (this.getNodeParameter('contextUi', i) as IDataObject).contextValue as IDataObject;
							const legalConsent = (this.getNodeParameter('lengalConsentUi', i) as IDataObject).lengalConsentValues as IDataObject;
							const legitimateInteres = (this.getNodeParameter('lengalConsentUi', i) as IDataObject).legitimateInterestValues as IDataObject;
							const { portalId } = await hubspotApiRequest.call(this, 'GET', `/forms/v2/forms/${formId}`);
							const body: IForm = {
								formId,
								portalId,
								legalConsentOptions: {},
								fields: [],
							};
							if (additionalFields.submittedAt) {
								body.submittedAt = new Date(additionalFields.submittedAt as string).getTime();
							}
							if (additionalFields.skipValidation) {
								body.skipValidation = additionalFields.skipValidation as boolean;
							}
							const consent: IDataObject = {};
							if (legalConsent) {
								if (legalConsent.consentToProcess) {
									consent!.consentToProcess = legalConsent.consentToProcess as boolean;
								}
								if (legalConsent.text) {
									consent!.text = legalConsent.text as string;
								}
								if (legalConsent.communicationsUi) {
									consent.communications = (legalConsent.communicationsUi as IDataObject).communicationValues as IDataObject;
								}
							}
							body.legalConsentOptions!.consent = consent;
							const fields: IDataObject = items[i].json;
							for (const key of Object.keys(fields)) {
								body.fields?.push({ name: key, value: fields[key] });
							}
							if (body.legalConsentOptions!.legitimateInterest) {
								Object.assign(body, { legalConsentOptions: { legitimateInterest: legitimateInteres } });
							}
							if (context) {
								clean(context);
								Object.assign(body, { context });
							}
							const uri = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;
							responseData = await hubspotApiRequest.call(this, 'POST', '', body, {}, uri);
						}
					}
					//https://developers.hubspot.com/docs/methods/tickets/tickets-overview
					if (resource === 'ticket') {
						//https://developers.hubspot.com/docs/methods/tickets/create-ticket
						if (operation === 'create') {
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const pipelineId = this.getNodeParameter('pipelineId', i) as string;
							const stageId = this.getNodeParameter('stageId', i) as string;
							const ticketName = this.getNodeParameter('ticketName', i) as string;
							const body: IDataObject[] = [
								{
									name: 'hs_pipeline',
									value: pipelineId,
								},
								{
									name: 'hs_pipeline_stage',
									value: stageId,
								},
								{
									name: 'subject',
									value: ticketName,
								},
							];
							if (additionalFields.category) {
								body.push({
									name: 'hs_ticket_category',
									value: additionalFields.category as string,
								});
							}
							if (additionalFields.closeDate) {
								body.push({
									name: 'closed_date',
									value: new Date(additionalFields.closeDate as string).getTime(),
								});
							}
							if (additionalFields.createDate) {
								body.push({
									name: 'createdate',
									value: new Date(additionalFields.createDate as string).getTime(),
								});
							}
							if (additionalFields.description) {
								body.push({
									name: 'content',
									value: additionalFields.description as string,
								});
							}
							if (additionalFields.priority) {
								body.push({
									name: 'hs_ticket_priority',
									value: additionalFields.priority as string,
								});
							}
							if (additionalFields.resolution) {
								body.push({
									name: 'hs_resolution',
									value: additionalFields.resolution as string,
								});
							}
							if (additionalFields.source) {
								body.push({
									name: 'source_type',
									value: additionalFields.source as string,
								});
							}
							if (additionalFields.ticketOwnerId) {
								body.push({
									name: 'hubspot_owner_id',
									value: additionalFields.ticketOwnerId as string,
								});
							}
							const endpoint = '/crm-objects/v1/objects/tickets';
							responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body);

							if (additionalFields.associatedCompanyIds) {
								const companyAssociations: IDataObject[] = [];
								for (const companyId of additionalFields.associatedCompanyIds as IDataObject[]) {
									companyAssociations.push({
										fromObjectId: responseData.objectId,
										toObjectId: companyId,
										category: 'HUBSPOT_DEFINED',
										definitionId: 26,
									});
								}
								await hubspotApiRequest.call(this, 'PUT', '/crm-associations/v1/associations/create-batch', companyAssociations);
							}

							if (additionalFields.associatedContactIds) {
								const contactAssociations: IDataObject[] = [];
								for (const contactId of additionalFields.associatedContactIds as IDataObject[]) {
									contactAssociations.push({
										fromObjectId: responseData.objectId,
										toObjectId: contactId,
										category: 'HUBSPOT_DEFINED',
										definitionId: 16,
									});
								}
								await hubspotApiRequest.call(this, 'PUT', '/crm-associations/v1/associations/create-batch', contactAssociations);
							}
						}
						//https://developers.hubspot.com/docs/methods/tickets/get_ticket_by_id
						if (operation === 'get') {
							const ticketId = this.getNodeParameter('ticketId', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							if (additionalFields.properties) {
								qs.properties = additionalFields.properties as string[];
							}
							if (additionalFields.propertiesWithHistory) {
								qs.propertiesWithHistory = (additionalFields.propertiesWithHistory as string).split(',');
							}
							if (additionalFields.includeDeleted) {
								qs.includeDeleted = additionalFields.includeDeleted as boolean;
							}
							const endpoint = `/crm-objects/v1/objects/tickets/${ticketId}`;
							responseData = await hubspotApiRequest.call(this, 'GET', endpoint, {}, qs);
						}
						//https://developers.hubspot.com/docs/methods/tickets/get-all-tickets
						if (operation === 'getAll') {
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
							if (additionalFields.properties) {
								qs.properties = additionalFields.properties as string[];
							}
							if (additionalFields.propertiesWithHistory) {
								qs.propertiesWithHistory = (additionalFields.propertiesWithHistory as string).split(',');
							}
							const endpoint = `/crm-objects/v1/objects/tickets/paged`;
							if (returnAll) {
								responseData = await hubspotApiRequestAllItems.call(this, 'objects', 'GET', endpoint, {}, qs);
							} else {
								qs.limit = this.getNodeParameter('limit', 0) as number;
								responseData = await hubspotApiRequestAllItems.call(this, 'objects', 'GET', endpoint, {}, qs);
								responseData = responseData.splice(0, qs.limit);
							}
						}
						//https://developers.hubspot.com/docs/methods/tickets/delete-ticket
						if (operation === 'delete') {
							const ticketId = this.getNodeParameter('ticketId', i) as string;
							const endpoint = `/crm-objects/v1/objects/tickets/${ticketId}`;
							await hubspotApiRequest.call(this, 'DELETE', endpoint);
							responseData = { success: true };
						}
						//https://developers.hubspot.com/docs/methods/tickets/update-ticket
						if (operation === 'update') {
							const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
							const ticketId = this.getNodeParameter('ticketId', i) as string;
							const body: IDataObject[] = [];
							if (updateFields.pipelineId) {
								body.push({
									name: 'hs_pipeline',
									value: updateFields.pipelineId as string,
								});
							}
							if (updateFields.ticketName) {
								body.push({
									name: 'subject',
									value: updateFields.ticketName as string,
								});
							}
							if (updateFields.category) {
								body.push({
									name: 'hs_ticket_category',
									value: updateFields.category as string,
								});
							}
							if (updateFields.closeDate) {
								body.push({
									name: 'closed_date',
									value: new Date(updateFields.createDate as string).getTime(),
								});
							}
							if (updateFields.createDate) {
								body.push({
									name: 'createdate',
									value: new Date(updateFields.createDate as string).getTime(),
								});
							}
							if (updateFields.description) {
								body.push({
									name: 'content',
									value: updateFields.description as string,
								});
							}
							if (updateFields.priority) {
								body.push({
									name: 'hs_ticket_priority',
									value: updateFields.priority as string,
								});
							}
							if (updateFields.resolution) {
								body.push({
									name: 'hs_resolution',
									value: updateFields.resolution as string,
								});
							}
							if (updateFields.source) {
								body.push({
									name: 'source_type',
									value: updateFields.source as string,
								});
							}
							if (updateFields.ticketOwnerId) {
								body.push({
									name: 'hubspot_owner_id',
									value: updateFields.ticketOwnerId as string,
								});
							}
							const endpoint = `/crm-objects/v1/objects/tickets/${ticketId}`;
							responseData = await hubspotApiRequest.call(this, 'PUT', endpoint, body);

							if (updateFields.associatedCompanyIds) {
								const companyAssociations: IDataObject[] = [];
								for (const companyId of updateFields.associatedCompanyIds as IDataObject[]) {
									companyAssociations.push({
										fromObjectId: responseData.objectId,
										toObjectId: companyId,
										category: 'HUBSPOT_DEFINED',
										definitionId: 26,
									});
								}
								await hubspotApiRequest.call(this, 'PUT', '/crm-associations/v1/associations/create-batch', companyAssociations);
							}

							if (updateFields.associatedContactIds) {
								const contactAssociations: IDataObject[] = [];
								for (const contactId of updateFields.associatedContactIds as IDataObject[]) {
									contactAssociations.push({
										fromObjectId: responseData.objectId,
										toObjectId: contactId,
										category: 'HUBSPOT_DEFINED',
										definitionId: 16,
									});
								}
								await hubspotApiRequest.call(this, 'PUT', '/crm-associations/v1/associations/create-batch', contactAssociations);
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
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
