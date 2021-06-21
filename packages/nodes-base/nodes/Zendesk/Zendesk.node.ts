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
	validateJSON,
	zendeskApiRequest,
	zendeskApiRequestAllItems,
} from './GenericFunctions';

import {
	ticketFields,
	ticketOperations
} from './TicketDescription';

import {
	ticketFieldFields,
	ticketFieldOperations
} from './TicketFieldDescription';

import {
	userFields,
	userOperations
} from './UserDescription';

import {
	IComment,
	ITicket,
 } from './TicketInterface';

export class Zendesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk',
		name: 'zendesk',
		icon: 'file:zendesk.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zendesk API',
		defaults: {
			name: 'Zendesk',
			color: '#13353c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zendeskApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiToken',
						],
					},
				},
			},
			{
				name: 'zendeskOAuth2Api',
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
						name: 'API Token',
						value: 'apiToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiToken',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Ticket',
						value: 'ticket',
						description: 'Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support.',
					},
					{
						name: 'Ticket Field',
						value: 'ticketField',
						description: 'Manage system and custom ticket fields',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Manage users',
					},
				],
				default: 'ticket',
				description: 'Resource to consume.',
			},
			// TICKET
			...ticketOperations,
			...ticketFields,
			// TICKET FIELD
			...ticketFieldOperations,
			...ticketFieldFields,
			// USER
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the custom fields to display them to user so that he can
			// select them easily
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const customFields = [
					'text',
					'textarea',
					'date',
					'integer',
					'decimal',
					'regexp',
					'multiselect',
					'tagger',
				];
				const fields = await zendeskApiRequestAllItems.call(this, 'ticket_fields', 'GET', '/ticket_fields');
				for (const field of fields) {
					if (customFields.includes(field.type)) {
						const fieldName = field.title;
						const fieldId = field.id;
						returnData.push({
							name: fieldName,
							value: fieldId,
						});
					}
				}
				return returnData;
			},
			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await zendeskApiRequestAllItems.call(this, 'groups', 'GET', '/groups');
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.id;
					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			},
			// Get all the tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await zendeskApiRequestAllItems.call(this, 'tags', 'GET', '/tags');
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = tag.name;
					returnData.push({
						name: tagName,
						value: tagId,
					});
				}
				return returnData;
			},

			// Get all the locales to display them to user so that he can
			// select them easily
			async getLocales(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const locales = await zendeskApiRequestAllItems.call(this, 'locales', 'GET', '/locales');
				for (const locale of locales) {
					const localeName = `${locale.locale} - ${locale.name}`;
					const localeId = locale.locale;
					returnData.push({
						name: localeName,
						value: localeId,
					});
				}
				return returnData;
			},

			// Get all the user fields to display them to user so that he can
			// select them easily
			async getUserFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await zendeskApiRequestAllItems.call(this, 'user_fields', 'GET', '/user_fields');
				for (const field of fields) {
					const fieldName = field.title;
					const fieldId = field.key;
					returnData.push({
						name: fieldName,
						value: fieldId,
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
			//https://developer.zendesk.com/rest_api/docs/support/introduction
			if (resource === 'ticket') {
				//https://developer.zendesk.com/rest_api/docs/support/tickets
				if (operation === 'create') {
					const description = this.getNodeParameter('description', i) as string;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
					const comment: IComment = {
						body: description,
					};
					const body: ITicket = {
							comment,
					};
					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '' ) {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON');
							}
						}

					} else {

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.type) {
							body.type = additionalFields.type as string;
						}
						if (additionalFields.externalId) {
							body.external_id = additionalFields.externalId as string;
						}
						if (additionalFields.subject) {
							body.subject = additionalFields.subject as string;
						}
						if (additionalFields.status) {
							body.status = additionalFields.status as string;
						}
						if (additionalFields.recipient) {
							body.recipient = additionalFields.recipient as string;
						}
						if (additionalFields.group) {
							body.group = additionalFields.group as string;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string[];
						}
						if (additionalFields.customFieldsUi) {
							body.custom_fields = (additionalFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];
						}
					}
					responseData = await zendeskApiRequest.call(this, 'POST', '/tickets', { ticket: body });
					responseData = responseData.ticket;
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#update-ticket
				if (operation === 'update') {
					const ticketId = this.getNodeParameter('id', i) as string;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: ITicket = {};

					if (jsonParameters) {
						const updateFieldsJson = this.getNodeParameter('updateFieldsJson', i) as string;

						if (updateFieldsJson !== '' ) {

							if (validateJSON(updateFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(updateFieldsJson));

							} else {
								throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON');
							}
						}

					} else {

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (updateFields.type) {
							body.type = updateFields.type as string;
						}
						if (updateFields.externalId) {
							body.external_id = updateFields.externalId as string;
						}
						if (updateFields.subject) {
							body.subject = updateFields.subject as string;
						}
						if (updateFields.status) {
							body.status = updateFields.status as string;
						}
						if (updateFields.recipient) {
							body.recipient = updateFields.recipient as string;
						}
						if (updateFields.group) {
							body.group = updateFields.group as string;
						}
						if (updateFields.tags) {
							body.tags = updateFields.tags as string[];
						}
						if (updateFields.customFieldsUi) {
							body.custom_fields = (updateFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];
						}
					}
					responseData = await zendeskApiRequest.call(this, 'PUT', `/tickets/${ticketId}`, { ticket: body });
					responseData = responseData.ticket;
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#show-ticket
				if (operation === 'get') {
					const ticketId = this.getNodeParameter('id', i) as string;
					responseData = await zendeskApiRequest.call(this, 'GET', `/tickets/${ticketId}`, {});
					responseData = responseData.ticket;
				}
				//https://developer.zendesk.com/rest_api/docs/support/search#list-search-results
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					qs.query = 'type:ticket';
					if (options.status) {
						qs.query += ` status:${options.status}`;
					}
					if (options.sortBy) {
						qs.sort_by = options.sortBy;
					}
					if (options.sortOrder) {
						qs.sort_order = options.sortOrder;
					}
					if (returnAll) {
						responseData = await zendeskApiRequestAllItems.call(this, 'results', 'GET', `/search`, {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.per_page = limit;
						responseData = await zendeskApiRequest.call(this, 'GET', `/search`, {}, qs);
						responseData = responseData.results;
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#delete-ticket
				if (operation === 'delete') {
					const ticketId = this.getNodeParameter('id', i) as string;
					try {
						responseData = await zendeskApiRequest.call(this, 'DELETE', `/tickets/${ticketId}`, {});
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
			}
			//https://developer.zendesk.com/rest_api/docs/support/ticket_fields
			if (resource === 'ticketField') {
				//https://developer.zendesk.com/rest_api/docs/support/tickets#show-ticket
				if (operation === 'get') {
					const ticketFieldId = this.getNodeParameter('ticketFieldId', i) as string;
					responseData = await zendeskApiRequest.call(this, 'GET', `/ticket_fields/${ticketFieldId}`, {});
					responseData = responseData.ticket_field;
				}
				//https://developer.zendesk.com/rest_api/docs/support/ticket_fields#list-ticket-fields
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						responseData = await zendeskApiRequestAllItems.call(this, 'ticket_fields', 'GET', '/ticket_fields', {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
						responseData = await zendeskApiRequestAllItems.call(this, 'ticket_fields', 'GET', '/ticket_fields', {}, qs);
						responseData = responseData.slice(0, limit);
					}
				}
			}
			//https://developer.zendesk.com/rest_api/docs/support/users
			if (resource === 'user') {
				//https://developer.zendesk.com/rest_api/docs/support/users#create-user
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						name,
					};

					Object.assign(body, additionalFields);

					if (body.userFieldsUi) {
						const userFields = (body.userFieldsUi as IDataObject).userFieldValues as IDataObject[];
						if (userFields) {
							body.user_fields = {};
							for (const userField of userFields) {
								//@ts-ignore
								body.user_fields[userField.field] = userField.value;
							}
							delete body.userFieldsUi;
						}
					}

					responseData = await zendeskApiRequest.call(this, 'POST', '/users', { user: body });
					responseData = responseData.user;
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#update-ticket
				if (operation === 'update') {
					const userId = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body: IDataObject = {};

					Object.assign(body, updateFields);

					if (body.userFieldsUi) {
						const userFields = (body.userFieldsUi as IDataObject).userFieldValues as IDataObject[];
						if (userFields) {
							body.user_fields = {};
							for (const userField of userFields) {
								//@ts-ignore
								body.user_fields[userField.field] = userField.value;
							}
							delete body.userFieldsUi;
						}
					}

					responseData = await zendeskApiRequest.call(this, 'PUT', `/users/${userId}`, { user: body });
					responseData = responseData.user;
				}
				//https://developer.zendesk.com/rest_api/docs/support/users#show-user
				if (operation === 'get') {
					const userId = this.getNodeParameter('id', i) as string;
					responseData = await zendeskApiRequest.call(this, 'GET', `/users/${userId}`, {});
					responseData = responseData.user;
				}
				//https://developer.zendesk.com/rest_api/docs/support/users#list-users
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('filters', i) as IDataObject;

					Object.assign(qs, options);

					if (returnAll) {
						responseData = await zendeskApiRequestAllItems.call(this, 'users', 'GET', `/users`, {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.per_page = limit;
						responseData = await zendeskApiRequest.call(this, 'GET', `/users`, {}, qs);
						responseData = responseData.users;
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/users#search-users
				if (operation === 'search') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('filters', i) as IDataObject;

					Object.assign(qs, options);

					if (returnAll) {
						responseData = await zendeskApiRequestAllItems.call(this, 'users', 'GET', `/users/search`, {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.per_page = limit;
						responseData = await zendeskApiRequest.call(this, 'GET', `/users/search`, {}, qs);
						responseData = responseData.users;
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/users#delete-user
				if (operation === 'delete') {
					const userId = this.getNodeParameter('id', i) as string;
					responseData = await zendeskApiRequest.call(this, 'DELETE', `/users/${userId}`, {});
					responseData = responseData.user;
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
