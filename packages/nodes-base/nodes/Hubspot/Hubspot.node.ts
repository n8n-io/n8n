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
	hubspotApiRequest,
	hubspotApiRequestAllItems,
 } from './GenericFunctions';

import {
	dealOperations,
	dealFields,
} from './DealDescription';

import {
	formOperations,
	formFields,
 } from './FormDescription';

 import {
	ticketOperations,
	ticketFields,
} from './TicketDescription';

import {
	IForm,
} from './FormInterface';

import {
	IDeal,
	IAssociation,
} from './DealInterface';

export class Hubspot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hubspot',
		name: 'hubspot',
		icon: 'file:hubspot.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Hubspot API',
		defaults: {
			name: 'Hubspot',
			color: '#ff7f64',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hubspotApi',
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
						name: 'Deal',
						value: 'deal',
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
			// DEAL
			...dealOperations,
			...dealFields,
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
					const dealTypeName = dealType.label ;
					const dealTypeId = dealType.value;
					returnData.push({
						name: dealTypeName,
						value: dealTypeId,
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
					const companyName = company.properties.name.value;
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
					const contactName = `${contact.properties.firstname.value} ${contact.properties.lastname.value}` ;
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
		for (let i = 0; i < length; i++) {
			//https://developers.hubspot.com/docs/methods/deals/deals_overview
			if (resource === 'deal') {
				if (operation === 'create') {
					const body: IDeal = {};
					body.properties = [];
					const association: IAssociation = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const stage = this.getNodeParameter('stage', i) as string;
					if (stage) {
						// @ts-ignore
						body.properties.push({
							name: 'dealstage',
							value: stage
						});
					}
					if (additionalFields.associatedCompany) {
						association.associatedCompanyIds = additionalFields.associatedCompany as number[];
					}
					if (additionalFields.associatedVids) {
						association.associatedVids = additionalFields.associatedVids as number[];
					}
					if (additionalFields.dealName) {
						// @ts-ignore
						body.properties.push({
							name: 'dealname',
							value: additionalFields.dealName as string
						});
					}
					if (additionalFields.closeDate) {
						// @ts-ignore
						body.properties.push({
							name: 'closedate',
							value: new Date(additionalFields.closeDate as string).getTime()
						});
					}
					if (additionalFields.amount) {
						// @ts-ignore
						body.properties.push({
							name: 'amount',
							value: additionalFields.amount as string
						});
					}
					if (additionalFields.dealType) {
						// @ts-ignore
						body.properties.push({
							name: 'dealtype',
							value: additionalFields.dealType as string
						});
					}
					if (additionalFields.pipeline) {
						// @ts-ignore
						body.properties.push({
							name: 'pipeline',
							value: additionalFields.pipeline as string
						});
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
						// @ts-ignore
						body.properties.push({
							name: 'dealname',
							value: updateFields.dealName as string
						});
					}
					if (updateFields.closeDate) {
						// @ts-ignore
						body.properties.push({
							name: 'closedate',
							value: new Date(updateFields.closeDate as string).getTime()
						});
					}
					if (updateFields.amount) {
						// @ts-ignore
						body.properties.push({
							name: 'amount',
							value: updateFields.amount as string
						});
					}
					if (updateFields.dealType) {
						// @ts-ignore
						body.properties.push({
							name: 'dealtype',
							value: updateFields.dealType as string
						});
					}
					if (updateFields.pipeline) {
						// @ts-ignore
						body.properties.push({
							name: 'pipeline',
							value: updateFields.pipeline as string
						});
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
						// @ts-ignore
						qs.properties = filters.properties.split(',');
					}
					if (filters.propertiesWithHistory) {
						// @ts-ignore
						qs.propertiesWithHistory = filters.propertiesWithHistory.split(',');
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
							value: additionalFields.category as string
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
							value: additionalFields.description as string
						});
					}
					if (additionalFields.priority) {
						body.push({
							name: 'hs_ticket_priority',
							value: additionalFields.priority as string
						});
					}
					if (additionalFields.resolution) {
						body.push({
							name: 'hs_resolution',
							value: additionalFields.resolution as string
						});
					}
					if (additionalFields.source) {
						body.push({
							name: 'source_type',
							value: additionalFields.source as string
						});
					}
					if (additionalFields.ticketOwnerId) {
						body.push({
							name: 'hubspot_owner_id',
							value: additionalFields.ticketOwnerId as string
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
							value: updateFields.category as string
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
							value: updateFields.description as string
						});
					}
					if (updateFields.priority) {
						body.push({
							name: 'hs_ticket_priority',
							value: updateFields.priority as string
						});
					}
					if (updateFields.resolution) {
						body.push({
							name: 'hs_resolution',
							value: updateFields.resolution as string
						});
					}
					if (updateFields.source) {
						body.push({
							name: 'source_type',
							value: updateFields.source as string
						});
					}
					if (updateFields.ticketOwnerId) {
						body.push({
							name: 'hubspot_owner_id',
							value: updateFields.ticketOwnerId as string
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
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
