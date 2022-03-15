import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
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
	organizationFields,
	organizationOperations
} from './OrganizationDescription';

import {
	IComment,
	ITicket,
} from './TicketInterface';

export class Zendesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk',
		name: 'zendesk',
		icon: 'file:zendesk.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zendesk API',
		defaults: {
			name: 'Zendesk',
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
				testedBy: 'zendeskSoftwareApiTest',
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
				description: 'The resource to operate on',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Ticket',
						value: 'ticket',
						description: 'Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support',
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
					{
						name: 'Organization',
						value: 'organization',
						description: 'Manage organizations',
					},
				],
				default: 'ticket',
				description: 'Resource to consume',
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
			// ORGANIZATION
			...organizationOperations,
			...organizationFields,
		],
	};

	methods = {
		credentialTest: {
			async zendeskSoftwareApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const subdomain = credentials!.subdomain;
				const email = credentials!.email;
				const apiToken = credentials!.apiToken;

				const base64Key =  Buffer.from(`${email}/token:${apiToken}`).toString('base64');
				const options: OptionsWithUri = {
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Basic ${base64Key}`,
					},
					method: 'GET',
					uri: `https://${subdomain}.zendesk.com/api/v2/ticket_fields.json`,
					qs: {
						recent: 0,
					},
					json: true,
					timeout: 5000,
				};

				try {
					await this.helpers.request!(options);
				} catch (error) {
					return {
						status: 'Error',
						message: `Connection details not valid: ${error.message}`,
					};
				}
				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
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

			// Get all the organization fields to display them to the user for easy selection
			async getOrganizationFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await zendeskApiRequestAllItems.call(this, 'organization_fields', 'GET', '/organization_fields');
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

			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await zendeskApiRequestAllItems.call(this, 'organizations', 'GET', `/organizations`, {}, {});
				for (const field of fields) {
					returnData.push({
						name: field.name,
						value: field.id,
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
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;
				//https://developer.zendesk.com/api-reference/ticketing/introduction/
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

							if (additionalFieldsJson !== '') {

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

							if (updateFieldsJson !== '') {

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
							if (updateFields.assigneeEmail) {
								body.assignee_email = updateFields.assigneeEmail as string;
							}
							if (updateFields.internalNote) {
								const comment: IComment = {
									html_body: updateFields.internalNote as string,
									public: false,
								};
								body.comment = comment;
							}

							if (updateFields.publicReply) {
								const comment: IComment = {
									body: updateFields.publicReply as string,
									public: true,
								};
								body.comment = comment;
							}

						}
						responseData = await zendeskApiRequest.call(this, 'PUT', `/tickets/${ticketId}`, { ticket: body });
						responseData = responseData.ticket;
					}
					//https://developer.zendesk.com/rest_api/docs/support/tickets#show-ticket
					//https://developer.zendesk.com/api-reference/ticketing/tickets/suspended_tickets/#show-suspended-ticket
					if (operation === 'get') {
						const ticketType = this.getNodeParameter('ticketType', i) as string;
						const ticketId = this.getNodeParameter('id', i) as string;
						const endpoint = (ticketType === 'regular') ? `/tickets/${ticketId}` : `/suspended_tickets/${ticketId}`;
						responseData = await zendeskApiRequest.call(this, 'GET', endpoint, {});
						responseData = responseData.ticket || responseData.suspended_ticket;
					}
					//https://developer.zendesk.com/rest_api/docs/support/search#list-search-results
					//https://developer.zendesk.com/api-reference/ticketing/tickets/suspended_tickets/#list-suspended-tickets
					if (operation === 'getAll') {
						const ticketType = this.getNodeParameter('ticketType', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						qs.query = 'type:ticket';
						if (options.query) {
							qs.query += ` ${options.query}`;
						}
						if (options.status) {
							qs.query += ` status:${options.status}`;
						}
						if (options.group) {
							qs.query += ` group:${options.group}`;
						}

						if (options.sortBy) {
							qs.sort_by = options.sortBy;
						}
						if (options.sortOrder) {
							qs.sort_order = options.sortOrder;
						}
						const endpoint = (ticketType === 'regular') ? `/search` : `/suspended_tickets`;
						const property = (ticketType === 'regular') ? 'results' : 'suspended_tickets';
						if (returnAll) {
							responseData = await zendeskApiRequestAllItems.call(this, property, 'GET', endpoint, {}, qs);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.per_page = limit;
							responseData = await zendeskApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.results || responseData.suspended_tickets;
						}
					}
					//https://developer.zendesk.com/rest_api/docs/support/tickets#delete-ticket
					//https://developer.zendesk.com/api-reference/ticketing/tickets/suspended_tickets/#delete-suspended-ticket
					if (operation === 'delete') {
						const ticketType = this.getNodeParameter('ticketType', i) as string;
						const ticketId = this.getNodeParameter('id', i) as string;
						const endpoint = (ticketType === 'regular') ? `/tickets/${ticketId}` : `/suspended_tickets/${ticketId}`;
						responseData = await zendeskApiRequest.call(this, 'DELETE', endpoint, {});
						responseData = { success: true };
					}
					//https://developer.zendesk.com/api-reference/ticketing/tickets/suspended_tickets/#recover-suspended-ticket
					if (operation === 'recover') {
						const ticketId = this.getNodeParameter('id', i) as string;
						try {
							responseData = await zendeskApiRequest.call(this, 'PUT', `/suspended_tickets/${ticketId}/recover`, {});
							responseData = responseData.ticket;
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
				}
				//https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_fields/
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
				//https://developer.zendesk.com/api-reference/ticketing/users/users/
				if (resource === 'user') {
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#create-user
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
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#update-user
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
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#show-user
					if (operation === 'get') {
						const userId = this.getNodeParameter('id', i) as string;
						responseData = await zendeskApiRequest.call(this, 'GET', `/users/${userId}`, {});
						responseData = responseData.user;
					}
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#list-users
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
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#list-organizations
					if (operation === 'getOrganizations') {
						const userId = this.getNodeParameter('id', i) as string;
						responseData = await zendeskApiRequest.call(this, 'GET', `/users/${userId}/organizations`, {});
						responseData = responseData.organizations;
					}
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#search-users
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
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#delete-user
					if (operation === 'delete') {
						const userId = this.getNodeParameter('id', i) as string;
						responseData = await zendeskApiRequest.call(this, 'DELETE', `/users/${userId}`, {});
						responseData = responseData.user;
					}
					//https://developer.zendesk.com/api-reference/ticketing/users/users/#show-user-related-information
					if (operation === 'getRelatedData') {
						const userId = this.getNodeParameter('id', i) as string;
						responseData = await zendeskApiRequest.call(this, 'GET', `/users/${userId}/related`, {});
						responseData = responseData.user_related;
					}
				}
				//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/
				if (resource === 'organization') {
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#create-organization
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject & { name: string; organization_fields?: { [key: string]: object | string } } = {
							name,
						};

						const { organizationFieldsUi, ...rest } = this.getNodeParameter('additionalFields', i) as IDataObject & { organizationFieldsUi?: { organizationFieldValues: Array<{ field: string; value: string; }> } };

						Object.assign(body, rest);

						if (organizationFieldsUi?.organizationFieldValues.length) {
							const organizationFields = organizationFieldsUi.organizationFieldValues;
							if (organizationFields.length) {
								body.organization_fields = {};
								for (const organizationField of organizationFields) {
									body.organization_fields[organizationField.field] = organizationField.value;
								}
							}
						}

						responseData = await zendeskApiRequest.call(this, 'POST', '/organizations', { organization: body });
						responseData = responseData.organization;
					}
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#delete-organization
					if (operation === 'delete') {
						const organizationId = this.getNodeParameter('id', i) as string;
						await zendeskApiRequest.call(this, 'DELETE', `/organizations/${organizationId}`, {});
						responseData = { success: true };
					}
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#count-organizations
					if (operation === 'count') {
						responseData = await zendeskApiRequest.call(this, 'GET', `/organizations/count`, {});
						responseData = responseData.count;
					}
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#show-organization
					if (operation === 'get') {
						const organizationId = this.getNodeParameter('id', i) as string;
						responseData = await zendeskApiRequest.call(this, 'GET', `/organizations/${organizationId}`, {});
						responseData = responseData.organization;
					}
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#list-organizations
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await zendeskApiRequestAllItems.call(this, 'organizations', 'GET', `/organizations`, {}, qs);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.per_page = limit;
							responseData = await zendeskApiRequest.call(this, 'GET', `/organizations`, {}, qs);
							responseData = responseData.organizations;
						}
					}
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#show-organizations-related-information
					if (operation === 'getRelatedData') {
						const organizationId = this.getNodeParameter('id', i) as string;
						responseData = await zendeskApiRequest.call(this, 'GET', `/organizations/${organizationId}/related`, {});
						responseData = responseData.organization_related;
					}
					//https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#update-organization
					if (operation === 'update') {
						const organizationId = this.getNodeParameter('id', i) as string;

						const body: IDataObject & { organization_fields?: { [key: string]: object | string } } = {};

						const { organizationFieldsUi, ...rest } = this.getNodeParameter('updateFields', i) as IDataObject & { organizationFieldsUi?: { organizationFieldValues: Array<{ field: string; value: string; }> } };

						Object.assign(body, rest);

						if (organizationFieldsUi?.organizationFieldValues.length) {
							const organizationFields = organizationFieldsUi.organizationFieldValues;
							if (organizationFields.length) {
								body.organization_fields = {};
								for (const organizationField of organizationFields) {
									body.organization_fields[organizationField.field] = organizationField.value;
								}
							}
						}

						responseData = await zendeskApiRequest.call(this, 'PUT', `/organizations/${organizationId}`, { organization: body });
						responseData = responseData.organization;
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
