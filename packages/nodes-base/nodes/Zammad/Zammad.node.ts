import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { usersDescription } from './UsersDescription';
import { organizationsDescription } from './OrganizationsDescription';
import { groupsDescription } from './GroupsDescription';
import { ticketsDescription } from './TicketsDescription';
import { mentionsDescription } from './MentionsDescription';
import { tagsDescription } from './TagsDescription';
import { statesDescription } from './StatesDescription';
import { prioritiesDescription } from './PrioritiesDescription';
import { articlesDescription } from './ArticlesDescription';
import { onlineNotificationsDescription } from './OnlineNotificationsDescription';
import { objectsDescription } from './ObjectsDescription';
import { userAccessTokensDescription } from './UserAccessTokensDescription';

import { zammadApiRequest } from './GenericFunctions';

type customFields = {
	fields: field[];
};

type Permissions = {
	fields: permission[];
};

type field = {
	[name: string]: string;
};

type permission = {
	[permission: string]: string;
};

export class Zammad implements INodeType {
	description: INodeTypeDescription = {
		displayName: ' Zammad',
		name: 'zammad',
		icon: 'file:zammad.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zammad REST API',
		defaults: {
			name: ' Zammad',
			color: '#ffd130',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zammadBasicApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
			{
				name: 'zammadOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'zammadTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['tokenAuth'],
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
				description: 'The authentication method to use.',
			},
			// ----------------------------------
			//         API
			// ----------------------------------
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
				description: 'The API to use.',
			},
			// ----------------------------------
			//         resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				displayOptions: {
					show: {
						api: ['rest'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'Article',
						value: 'article',
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
						name: 'Mention',
						value: 'mention',
					},
					{
						name: 'Online Notification',
						value: 'onlineNotification',
					},
					{
						name: 'Object',
						value: 'object',
					},
					{
						name: 'User Access Token',
						value: 'userAccessToken',
					},
				],
				default: 'user',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				displayOptions: {
					show: {
						api: ['cti'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'New Call',
						value: 'newCall',
					},
					{
						name: 'Hangup',
						value: 'hangup',
					},
					{
						name: 'Answer',
						value: 'answer',
					},
				],
				default: 'newCall',
				description: 'The resource to operate on.',
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
				description: 'Adds a custom field to set the value of.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						api: ['rest'],
						resource: ['user', 'organization', 'ticket'],
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
								description: 'Name of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set.',
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
		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		let endpoint = '';
		let requestMethod = '';

		let body: IDataObject = {};
		/* tslint:disable-next-line */
		let qs: IDataObject = {};
		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'user') {
					// ----------------------------------
					//         user:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/users';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: field) => {
								body[field['name']] = field['value'];
							});
						}
						body.email = this.getNodeParameter('emailAddress', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         user:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/users/' + userId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: field) => {
								body[field['name']] = field['value'];
							});
						}
						body.email = this.getNodeParameter('emailAddress', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         user:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/users/' + userId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         user:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/users/' + userId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         user:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/users';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         user:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/users/search';

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

						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					} else if (operation === 'me') {
						requestMethod = 'GET';
						endpoint = '/api/v1/users/me';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'organization') {
					// ----------------------------------
					//         organization:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/organizations';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: field) => {
								body[field['name']] = field['value'];
							});
						}
						body.name = this.getNodeParameter('name', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         organization:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const organizationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/organizations/' + organizationId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: field) => {
								body[field['name']] = field['value'];
							});
						}
						body.name = this.getNodeParameter('name', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         organization:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const organizationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/organizations/' + organizationId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         organization:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const organizationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/organizations/' + organizationId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         organization:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/organizations';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         organization:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/organizations/search';

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

						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'group') {
					// ----------------------------------
					//         group:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/groups';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         group:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const groupId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/groups/' + groupId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         group:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const groupId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/groups/' + groupId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         group:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const groupId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/groups/' + groupId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         group:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/groups';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'ticket') {
					// ----------------------------------
					//         ticket:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/tickets';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: field) => {
								body[field['name']] = field['value'];
							});
						}
						body.group = this.getNodeParameter('group', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						body.customer_id = this.getNodeParameter('customerId', i) as number;
						body.article = this.getNodeParameter('optionalFieldsArticle', i) as IDataObject;
						// @ts-ignore-next-line
						body.article.body = this.getNodeParameter('body', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         ticket:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/tickets/' + ticketId;
						body = {} as IDataObject;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields = this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length !== 0) {
							customFields.fields.forEach!((field: field) => {
								body[field['name']] = field['value'];
							});
						}
						body.group = this.getNodeParameter('group', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						body.customer_id = this.getNodeParameter('customerId', i) as number;
						body.article = this.getNodeParameter('optionalFieldsArticle', i) as IDataObject;
						// @ts-ignore-next-line
						body.article.body = this.getNodeParameter('body', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         ticket:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/tickets/' + ticketId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         ticket:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/tickets/' + ticketId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         ticket:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/tickets';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         ticket:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/tickets/search';

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

						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'mention') {
					// ----------------------------------
					//         mention:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/mentions';
						body.mentionable_type = this.getNodeParameter('mentionable_type', i) as string;
						body.mentionable_id = this.getNodeParameter('mentionable_id', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}

					// ----------------------------------
					//         mention:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const mentionId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/mentions/' + mentionId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         mention:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/mentions';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'tag') {
					// ----------------------------------
					//         tag:add
					// ----------------------------------
					if (operation === 'add') {
						requestMethod = 'POST';
						endpoint = '/api/v1/tags/add';
						body.item = this.getNodeParameter('item', i) as string;
						body.object = this.getNodeParameter('object', i) as string;
						body.o_id = this.getNodeParameter('o_id', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}

					// ----------------------------------
					//         tag:remove
					// ----------------------------------
					else if (operation === 'remove') {
						requestMethod = 'DELETE';
						endpoint = '/api/v1/tags/remove';
						body.item = this.getNodeParameter('item', i) as string;
						body.object = this.getNodeParameter('object', i) as string;
						body.o_id = this.getNodeParameter('o_id', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         tag:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/tags';

						qs.object = this.getNodeParameter('object', i) as string;
						qs.o_id = this.getNodeParameter('o_id', i) as string;

						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         tag:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/tag_search';

						qs.term = this.getNodeParameter('term', i) as string;

						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'state') {
					// ----------------------------------
					//         state:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/ticket_states';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;
						body.state_type_id = this.getNodeParameter('state_type_id', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         state:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const stateId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_states/' + stateId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;
						body.state_type_id = this.getNodeParameter('state_type_id', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         state:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const stateId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_states/' + stateId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         state:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const stateId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_states/' + stateId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         state:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/ticket_states';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'priority') {
					// ----------------------------------
					//         priority:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/ticket_priorities';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         priority:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const priorityId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_priorities/' + priorityId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter('name', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         priority:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const priorityId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_priorities/' + priorityId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         priority:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const priorityId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_priorities/' + priorityId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         priority:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/ticket_priorities';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'article') {
					// ----------------------------------
					//         article:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/ticket_articles';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.ticket_id = this.getNodeParameter('ticket_id', i) as number;
						body.body = this.getNodeParameter('body', i) as string;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         article:listByTicketId
					// ----------------------------------
					else if (operation === 'listByTicketId') {
						requestMethod = 'GET';
						const ticketId = this.getNodeParameter('ticket_id', i) as string;
						endpoint = '/api/v1/ticket_articles/by_ticket/' + ticketId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         article:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_articles/' + id;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'onlineNotification') {
					// ----------------------------------
					//         onlineNotification:update
					// ----------------------------------
					if (operation === 'update') {
						requestMethod = 'PUT';
						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/online_notifications/' + onlineNotificationId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         onlineNotification:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/online_notifications/' + onlineNotificationId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         onlineNotification:markAllAsRead
					// ----------------------------------
					else if (operation === 'markAllAsRead') {
						requestMethod = 'POST';
						endpoint = '/api/v1/online_notifications/mark_all_as_read';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         onlineNotification:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/online_notifications/' + onlineNotificationId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         onlineNotification:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/online_notifications';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'object') {
					// ----------------------------------
					//         object:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/object_manager_attributes/';
						body = this.getNodeParameter('data', i) as IDataObject;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         object:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/object_manager_attributes/' + objectId;
						const bodyString = this.getNodeParameter('data', i) as string;
						body = JSON.parse(bodyString) as IDataObject;

						body.id = objectId;



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         object:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/object_manager_attributes/' + objectId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         object:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/object_manager_attributes/';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         object:executeDatabaseMigrations
					// ----------------------------------
					else if (operation === 'executeDatabaseMigrations') {
						requestMethod = 'POST';
						endpoint = '/api/v1/object_manager_attributes_execute_migrations';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (resource === 'userAccessToken') {
					// ----------------------------------
					//         userAccessToken:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/user_access_token/';
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



						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         userAccessToken:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/user_access_token/';


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         userAccessToken:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const userAccessTokenId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/user_access_token/' + userAccessTokenId;


						responseData = await zammadApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					// @ts-ignore-next-line
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
