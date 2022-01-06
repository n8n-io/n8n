import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	groupDescription,
	organizationDescription,
	priorityDescription,
	tagDescription,
	ticketDescription,
	userDescription,
} from './descriptions';

import {
	populateCustomFields,
	prettifyDisplayName,
	throwOnEmptyUpdate,
	zammadApiRequest,
	zammadApiRequestAllItems,
} from './GenericFunctions';

import {
	CustomFields,
	ZammadTicketCreatePayload,
} from './types';

import type { Zammad as ZammadTypes } from './types';

export class Zammad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zammad',
		name: 'zammad',
		icon: 'file:zammad.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Zammad API',
		defaults: {
			name: 'Zammad',
		},
		inputs: [
			'main',
		],
		outputs: [
			'main',
		],
		credentials: [
			{
				name: 'zammadBasicAuthApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'basicAuth',
						],
					},
				},
			},
			{
				name: 'zammadOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
			{
				name: 'zammadTokenAuthApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'tokenAuth',
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
						name: 'Basic Authentication',
						value: 'basicAuth',
					},
					{
						name: 'OAuth2 Authentication',
						value: 'oAuth2',
					},
					{
						name: 'Token Authentication',
						value: 'tokenAuth',
					},
				],
				default: 'basicAuth',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Priority',
						value: 'priority',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
			},

			...groupDescription,
			...organizationDescription,
			...priorityDescription,
			...tagDescription,
			...ticketDescription,
			...userDescription,
		],
	};

	methods = {
		loadOptions: {
			async loadUserCustomFields(this: ILoadOptionsFunctions) {
				const customFields = await zammadApiRequest.call(
					this, 'GET', '/object_manager_attributes',
				) as ZammadTypes.CustomField[];

				// TODO find better way to check for custom field than `i.created_by_id !== 1`
				const isCustomField = (i: ZammadTypes.CustomField) => i.object === 'User' && i.created_by_id !== 1;

				return customFields.filter(isCustomField).map(i => ({ name: i.display, value: i.name }));
			},

			async loadUserFields(this: ILoadOptionsFunctions) {
				const userFields = await zammadApiRequest.call(
					this, 'GET', '/object_manager_attributes',
				) as ZammadTypes.CustomField[];

				const sortableUserFields = ['email', 'firstname', 'lastname', 'department'];
				const isSortableUserField = (i: ZammadTypes.CustomField) => sortableUserFields.includes(i.name);

				return userFields.filter(isSortableUserField).map(i => {
					return { name: prettifyDisplayName(i.display), value: i.name };
				});
			},

			async loadOrganizations(this: ILoadOptionsFunctions) {
				const orgs = await zammadApiRequest.call(
					this, 'GET', '/organizations',
				) as ZammadTypes.Organization[];

				const isRelevant = (i: ZammadTypes.Organization) => i.name !== 'Zammad Foundation';

				return orgs.filter(isRelevant).map(i => ({ name: i.name, value: i.id }));
			},

			async loadUsers(this: ILoadOptionsFunctions) {
				const users = await zammadApiRequest.call(this, 'GET', '/users') as ZammadTypes.User[];
				const isRelevant = (i: ZammadTypes.User) => !i.email.endsWith('@zammad.org') && i.login !== '-';

				return users.filter(isRelevant).map(i => ({ name: i.email, value: i.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as ZammadTypes.Resource;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'user') {

					// **********************************************************************
					//                                  user
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//           user:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#create

						const body: IDataObject = {
							email: this.getNodeParameter('email', i)
						};

						const {
							addressUi,
							customFieldsUi,
							...rest
						} = this.getNodeParameter('additionalFields', i) as ZammadTypes.UserAdditionalFields;

						Object.assign(body, addressUi?.addressDetails);

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'POST', '/users', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//            user:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#update

						const id = this.getNodeParameter('id', i);

						let body: IDataObject = {};

						const updateFields = this.getNodeParameter('updateFields', i) as ZammadTypes.UserUpdateFields;

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const { addressUi, customFieldsUi, ...rest } = updateFields;

						Object.assign(body, addressUi?.addressDetails);

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'PUT', `/users/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//            user:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#delete

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/users/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//            user:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/users/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//           user:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#list
						// https://docs.zammad.org/en/latest/api/user.html#search

						const qs: IDataObject = {};

						const { sortUi, ...rest } = this.getNodeParameter('filters', i) as ZammadTypes.UserFilterFields;

						Object.assign(qs, sortUi?.sortDetails);

						Object.assign(qs, rest);

						qs.query ||= ''; // otherwise triggers 500

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const limit = returnAll ? 0 : this.getNodeParameter('limit', i) as number;

						responseData = await zammadApiRequestAllItems.call(
							this, 'GET', '/users/search', {}, qs, limit,
						).then(responseData => {
								return responseData.map(user => {
								const { preferences, ...rest } = user;
								return rest;
							});
						});

					} else if (operation === 'getSelf') {

						// ----------------------------------
						//             user:me
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#me-current-user

						responseData = await zammadApiRequest.call(this, 'GET', '/users/me');
					}

				} else if (resource === 'organization') {

					// **********************************************************************
					//                             organization
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//         organization:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#create

						let body = this.getNodeParameter('additionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						body = populateCustomFields(body, customFields);
						body.name = this.getNodeParameter('name', i);

						responseData = await zammadApiRequest.call(this, 'POST', '/organizations', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//       organization:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#update

						let body = this.getNodeParameter('additionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						body = populateCustomFields(body, customFields);
						body.name = this.getNodeParameter('name', i);
						const id = this.getNodeParameter('id', i);

						responseData = await zammadApiRequest.call(this, 'PUT', `/organizations/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         organization:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#delete

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/organizations/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//         organization:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/organizations/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         organization:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#list

						responseData = await zammadApiRequest.call(this, 'GET', '/organizations');

					} else if (operation === 'search') {

						// ----------------------------------
						//        organization:search
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#search

						const qs: IDataObject = {};

						qs.query = this.getNodeParameter('query', i) as string;
						qs.limit = this.getNodeParameter('limit', i)?.toString() as string;
						const sortBy = this.getNodeParameter('sort_by', i) as string;
						if (!(sortBy === '')) {
							qs.sort_by = sortBy;
						}
						const orderBy = this.getNodeParameter('order_by', i) as string[];
						if (orderBy.length !== 0) {
							qs.order_by = orderBy;
						}

						responseData = await zammadApiRequest.call(this, 'GET', '/organizations/search', {}, qs);

					}

				} else if (resource === 'group') {

					// **********************************************************************
					//                                  group
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//           group:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#create

						const body = this.getNodeParameter('additionalFields', i) as IDataObject;
						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/groups', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//            group:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#update

						const id = this.getNodeParameter('groupId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;

						throwOnEmptyUpdate.call(this, resource);

						responseData = await zammadApiRequest.call(this, 'PUT', `/groups/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//            group:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#delete

						const id = this.getNodeParameter('groupId', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/groups/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//             group:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#show

						const id = this.getNodeParameter('groupId', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/groups/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//           group:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#list

						responseData = await zammadApiRequest.call(this, 'GET', '/groups');

					}

				} else if (resource === 'ticket') {

					// **********************************************************************
					//                                  ticket
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//           ticket:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#create

						let body = this.getNodeParameter('additionalFields', i) as ZammadTicketCreatePayload;
						body.group = this.getNodeParameter('group', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						body.customer_id = this.getNodeParameter('customerId', i) as string;
						body.article = this.getNodeParameter('additionalFieldsArticle', i) as IDataObject;
						body.article.body = this.getNodeParameter('body', i) as string;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						body = populateCustomFields(body, customFields);

						responseData = await zammadApiRequest.call(this, 'POST', '/tickets', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//           ticket:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#update

						const ticketId = this.getNodeParameter('id', i) as string;
						let body = this.getNodeParameter('additionalFields', i) as ZammadTicketCreatePayload;
						body.group = this.getNodeParameter('group', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						body.customer_id = this.getNodeParameter('customerId', i) as string;
						body.article = this.getNodeParameter('additionalFieldsArticle', i) as IDataObject;
						body.article.body = this.getNodeParameter('body', i) as string;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						body = populateCustomFields(body, customFields);

						responseData = await zammadApiRequest.call(this, 'PUT', `/tickets/${ticketId}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//          ticket:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#delete

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/tickets/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//            ticket:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/tickets/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//           ticket:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#list

						responseData = await zammadApiRequest.call(this, 'GET', '/tickets');

					} else if (operation === 'search') {

						// ----------------------------------
						//           ticket:search
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#search

						const qs: IDataObject = {};
						qs.query = this.getNodeParameter('query', i) as string;
						qs.limit = this.getNodeParameter('limit', i)?.toString() as string;
						const sortBy = this.getNodeParameter('sort_by', i) as string;
						if (!(sortBy === '')) {
							qs.sort_by = sortBy;
						}
						const orderBy = this.getNodeParameter('order_by', i) as string[];
						if (orderBy.length !== 0) {
							qs.order_by = orderBy;
						}

						responseData = await zammadApiRequest.call(this, 'GET', '/tickets/search', {}, qs);

					}

				} else if (resource === 'tag') {

					// **********************************************************************
					//                                  tag
					// **********************************************************************

					if (operation === 'add') {

						// ----------------------------------
						//            tag:add
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/tags.html#add

						const body: IDataObject = {};

						body.item = this.getNodeParameter('item', i) as string;
						body.object = this.getNodeParameter('object', i) as string;
						body.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/tags/add', body);

					} else if (operation === 'remove') {

						// ----------------------------------
						//            tag:remove
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/tags.html#remove

						const body: IDataObject = {};

						body.item = this.getNodeParameter('item', i) as string;
						body.object = this.getNodeParameter('object', i) as string;
						body.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', '/tags/remove', body);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//            tag:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/tags.html#list

						const qs: IDataObject = {};

						qs.object = this.getNodeParameter('object', i) as string;
						qs.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', '/tags', {}, qs);


					} else if (operation === 'search') {

						// ----------------------------------
						//            tag:search
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/tags.html#search

						const qs: IDataObject = {};
						qs.term = this.getNodeParameter('term', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', '/tag_search', {}, qs);
					}

				} else if (resource === 'priority') {

					// **********************************************************************
					//                               priority
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//          priority:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/priorities.html#create

						const body = this.getNodeParameter('additionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/ticket_priorities', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//         priority:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/priorities.html#update

						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('additionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/ticket_priorities/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         priority:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/priorities.html#delete

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/ticket_priorities/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//           priority:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/priorities.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/ticket_priorities/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         priority:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/priorities.html#list

						responseData = await zammadApiRequest.call(this, 'GET', '/ticket_priorities');

					}

				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);

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
