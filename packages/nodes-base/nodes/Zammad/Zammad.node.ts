import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	articlesDescription,
	groupsDescription,
	mentionsDescription,
	objectsDescription,
	onlineNotificationsDescription,
	organizationsDescription,
	prioritiesDescription,
	statesDescription,
	tagsDescription,
	ticketsDescription,
	userAccessTokensDescription,
	usersDescription,
} from './descriptions';

import {
	zammadApiRequest,
} from './GenericFunctions';

import {
	CustomFields,
	Field,
	Permissions,
} from './types';

export class Zammad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zammad',
		name: 'zammad',
		icon: 'file:zammad.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zammad REST API',
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
				name: 'zammadBasicApi',
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
				name: 'zammadTokenApi',
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

			// ----------------------------------
			//         Authentication
			// ----------------------------------
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

			// ----------------------------------
			//               API
			// ----------------------------------
			// TODO Abstract away
			{
				displayName: 'API',
				name: 'api',
				type: 'options',
				options: [
					{
						name: 'REST API',
						value: 'rest',
					},
					{
						name: 'CTI API',
						value: 'cti',
					},
				],
				default: 'rest',
			},

			// ----------------------------------
			//           resource
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				displayOptions: {
					show: {
						api: [
							'rest',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'Article',
						value: 'article',
					},
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Mention',
						value: 'mention',
					},
					{
						name: 'Object',
						value: 'object',
					},
					{
						name: 'Online Notification',
						value: 'onlineNotification',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User Access Token',
						value: 'userAccessToken',
					},
					{
						name: 'Priority',
						value: 'priority',
					},
					{
						name: 'State',
						value: 'state',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
				],
				default: 'user',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				displayOptions: {
					show: {
						api: [
							'cti',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'Answer',
						value: 'answer',
					},
					{
						name: 'Hangup',
						value: 'hangup',
					},
					{
						name: 'New Call',
						value: 'newCall',
					},
				],
				default: 'newCall',
			},

			...usersDescription,
			...organizationsDescription,
			...groupsDescription,
			...ticketsDescription,
			...mentionsDescription,
			...tagsDescription,
			...statesDescription,
			...prioritiesDescription,
			...articlesDescription,
			...onlineNotificationsDescription,
			...objectsDescription,
			...userAccessTokensDescription,

			{
				displayName: 'Custom Fields',
				name: 'customFields',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: [
							'create',
							'update',
						],
						api: [
							'rest',
						],
						resource: [
							'user',
							'organization',
							'ticket',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the field to set',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

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

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: Field) => {
								body[field['name']] = field['value'];
							});
						}
						body.email = this.getNodeParameter('emailAddress', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/users', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//            user:update
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: Field) => {
								body[field['name']] = field['value'];
							});
						}
						body.email = this.getNodeParameter('emailAddress', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/users/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//            user:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/users/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//            user:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/users/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//           user:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/users');

					} else if (operation === 'search') {

						// ----------------------------------
						//           user:search
						// ----------------------------------

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

						responseData = await zammadApiRequest.call(this, 'GET', '/users/search', {}, qs);

					} else if (operation === 'me') {

						// ----------------------------------
						//           user:me
						// ----------------------------------

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

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: Field) => {
								body[field['name']] = field['value'];
							});
						}
						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/organizations', body);

					} else if (operation === 'update') {

					// ----------------------------------
					//       organization:update
					// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: Field) => {
								body[field['name']] = field['value'];
							});
						}
						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/organizations/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         organization:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/organizations/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//         organization:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/organizations/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         organization:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/organizations');

					} else if (operation === 'search') {

						// ----------------------------------
						//        organization:search
						// ----------------------------------

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

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/groups', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//         group:update
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/groups/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         group:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/groups/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//           group:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/groups/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         group:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/groups');

					}

				} else if (resource === 'ticket') {

					// **********************************************************************
					//                                  ticket
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//         ticket:create
						// ----------------------------------

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: Field) => {
								body[field['name']] = field['value'];
							});
						}
						body.group = this.getNodeParameter('group', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						body.customer_id = this.getNodeParameter('customerId', i) as number;
						body.article = this.getNodeParameter('optionalFieldsArticle', i) as IDataObject;
						// @ts-ignore-next-line
						body.article.body = this.getNodeParameter('body', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/tickets', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//         ticket:update
						// ----------------------------------

						const ticketId = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as CustomFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: Field) => {
								body[field['name']] = field['value'];
							});
						}
						body.group = this.getNodeParameter('group', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						body.customer_id = this.getNodeParameter('customerId', i) as number;
						body.article = this.getNodeParameter('optionalFieldsArticle', i) as IDataObject;
						// @ts-ignore-next-line
						body.article.body = this.getNodeParameter('body', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/tickets/${ticketId}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//          ticket:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/tickets/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//         ticket:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/tickets/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         ticket:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/tickets');

					} else if (operation === 'search') {

						// ----------------------------------
						//         ticket:search
						// ----------------------------------

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

				} else if (resource === 'mention') {

					// **********************************************************************
					//                                mention
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//          mention:create
						// ----------------------------------

						const body: IDataObject = {};
						body.mentionable_type = this.getNodeParameter('mentionable_type', i) as string;
						body.mentionable_id = this.getNodeParameter('mentionable_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/mentions', body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         mention:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/mentions/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         mention:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/mentions');
					}

				} else if (resource === 'tag') {

					// **********************************************************************
					//                                  tag
					// **********************************************************************

					if (operation === 'add') {

						// ----------------------------------
						//            tag:add
						// ----------------------------------

						const body: IDataObject = {};

						body.item = this.getNodeParameter('item', i) as string;
						body.object = this.getNodeParameter('object', i) as string;
						body.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/tags/add', body);

					} else if (operation === 'remove') {

						// ----------------------------------
						//            tag:remove
						// ----------------------------------

						const body: IDataObject = {};

						body.item = this.getNodeParameter('item', i) as string;
						body.object = this.getNodeParameter('object', i) as string;
						body.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', '/tags/remove', body);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//            tag:getAll
						// ----------------------------------

						const qs: IDataObject = {};

						qs.object = this.getNodeParameter('object', i) as string;
						qs.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', '/tags', {}, qs);


					} else if (operation === 'search') {

						// ----------------------------------
						//          tag:search
						// ----------------------------------

						const qs: IDataObject = {};
						qs.term = this.getNodeParameter('term', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', '/tag_search', {}, qs);
					}

				} else if (resource === 'state') {

					// **********************************************************************
					//                                  state
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//          state:create
						// ----------------------------------

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;
						body.state_type_id = this.getNodeParameter('state_type_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/ticket_states', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//         state:update
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;
						body.state_type_id = this.getNodeParameter('state_type_id', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/ticket_states/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         state:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/ticket_states/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//            state:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/ticket_states/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         state:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/ticket_states');

					}

				} else if (resource === 'priority') {

					// **********************************************************************
					//                               priority
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//         priority:create
						// ----------------------------------

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/ticket_priorities', body);

					} else if (operation === 'update') {

						// ----------------------------------
						//         priority:update
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;

						responseData = await zammadApiRequest.call(this, 'PUT', `/ticket_priorities/${id}`, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         priority:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'DELETE', `/ticket_priorities/${id}`);

					} else if (operation === 'get') {

						// ----------------------------------
						//           priority:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/ticket_priorities/${id}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         priority:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/ticket_priorities');

					}

				} else if (resource === 'article') {

					// **********************************************************************
					//                                article
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//         article:create
						// ----------------------------------

						const body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.ticket_id = this.getNodeParameter('ticket_id', i) as number;
						body.body = this.getNodeParameter('body', i) as string;

						responseData = await zammadApiRequest.call(this, 'POST', '/ticket_articles', body);

					} else if (operation === 'listByTicketId') {

					// ----------------------------------
					//       article:getAllByTicketId
					// ----------------------------------

						const id = this.getNodeParameter('ticket_id', i) as string;

						const endpoint = `/ticket_articles/by_ticket/${id}`;
						responseData = await zammadApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------
						//           article:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/ticket_articles/${id}`);

					}

				} else if (resource === 'onlineNotification') {

					// **********************************************************************
					//                            onlineNotification
					// **********************************************************************

					if (operation === 'update') {

						// ----------------------------------
						//     onlineNotification:update
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const endpoint = `/online_notifications/${id}`;

						responseData = await zammadApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//     onlineNotification:delete
						// ----------------------------------

						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						const endpoint = `/online_notifications/${onlineNotificationId}`;

						responseData = await zammadApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'markAllAsRead') {

						// ----------------------------------
						//  onlineNotification:markAllAsRead
						// ----------------------------------

						const endpoint = '/online_notifications/mark_all_as_read';

						responseData = await zammadApiRequest.call(this, 'POST', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------
						//      onlineNotification:get
						// ----------------------------------

						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						const endpoint = `/online_notifications/${onlineNotificationId}`;

						responseData = await zammadApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

					// ----------------------------------
					//      onlineNotification:getAll
					// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/online_notifications');
					}

				} else if (resource === 'object') {

					// **********************************************************************
					//                                object
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//         object:create
						// ----------------------------------

						const body = this.getNodeParameter('data', i) as IDataObject;
						const endpoint = '/object_manager_attributes/';

						responseData = await zammadApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'update') {

						// ----------------------------------
						//         object:update
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const bodyString = this.getNodeParameter('data', i) as string;
						const body = JSON.parse(bodyString) as IDataObject;
						body.id = id;
						const endpoint = `/object_manager_attributes/${id}`;

						responseData = await zammadApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'get') {

						// ----------------------------------
						//           object:get
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const endpoint = `/object_manager_attributes/${id}`;

						responseData = await zammadApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         object:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/object_manager_attributes');

					} else if (operation === 'executeDatabaseMigrations') {

						// ----------------------------------
						//  object:executeDatabaseMigrations
						// ----------------------------------

						const endpoint = '/object_manager_attributes_execute_migrations';
						responseData = await zammadApiRequest.call(this, 'POST', endpoint);
					}

				} else if (resource === 'userAccessToken') {

					// **********************************************************************
					//                             userAccessToken
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//      userAccessToken:create
						// ----------------------------------

						const body: IDataObject = {};
						body.label = this.getNodeParameter('label', i) as string;
						body.expires_at = this.getNodeParameter('expires_at', i) as string;
						body.permission = new Array() as string[];
						const permissions = this.getNodeParameter('permissions', i) as Permissions;
						for (let i = 0; i < permissions.fields.length; i++) {
							if (permissions.fields[i].permission) {
								// @ts-ignore-next-line
								body.permission.push(permissions.fields[i].permission);
							}
						}

						responseData = await zammadApiRequest.call(this, 'POST', '/user_access_token', body);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//        userAccessToken:getAll
						// ----------------------------------

						responseData = await zammadApiRequest.call(this, 'GET', '/user_access_token');

					} else if (operation === 'delete') {

						// ----------------------------------
						//       userAccessToken:delete
						// ----------------------------------

						const id = this.getNodeParameter('id', i) as string;
						const endpoint = `/user_access_token/${id}`;

						responseData = await zammadApiRequest.call(this, 'DELETE', endpoint);
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
