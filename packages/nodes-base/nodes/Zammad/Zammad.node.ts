import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { UsersDescription } from './UsersDescription';
import { OrganizationsDescription } from './OrganizationsDescription';
import { GroupsDescription } from './GroupsDescription';
import { TicketsDescription } from './TicketsDescription';
import { MentionsDescription } from './MentionsDescription';
import { TagsDescription } from './TagsDescription';
import { StatesDescription } from './StatesDescription';
import { PrioritiesDescription } from './PrioritiesDescription';
import { ArticlesDescription } from './ArticlesDescription';
import { OnlineNotificationsDescription } from './OnlineNotificationsDescription';
import { ObjectsDescription } from './ObjectsDescription';
import { UserAccessTokensDescription } from './UserAccessTokensDescription';

import { zammadApiRequest } from './GenericFunctions';

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
			color: '#ffd130'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zammadBasicApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth']
					}
				}
			},
			{
				name: 'zammadOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2']
					}
				}
			},
			{
				name: 'zammadTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['tokenAuth']
					}
				}
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
						value: 'basicAuth'
					},
					{
						name: 'OAuth2 Authentication',
						value: 'oAuth2'
					},
					{
						name: 'Token Authentication',
						value: 'tokenAuth'
					},
				],
				default: 'basicAuth',
				description: 'The authentication method to use.'
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
						value: 'rest'
					},
					{
						name: 'CTI API',
						value: 'cti'
					},
				],
				default: 'rest',
				description: 'The API to use.'
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
					}
				},
				type: 'options',
				options: [
					{
						name: 'User',
						value: 'user'
					},
					{
						name: 'Organization',
						value: 'organization'
					},
					{
						name: 'Group',
						value: 'group'
					},
					{
						name: 'Ticket',
						value: 'ticket'
					},
					{
						name: 'Article',
						value: 'article'
					},
					{
						name: 'Priority',
						value: 'priority'
					},
					{
						name: 'State',
						value: 'state'
					},
					{
						name: 'Tag',
						value: 'tag'
					},
					{
						name: 'Mention',
						value: 'mention'
					},
					{
						name: 'Online Notification',
						value: 'onlineNotification'
					},
					{
						name: 'Object',
						value: 'object'
					},
					{
						name: 'User Access Token',
						value: 'userAccessToken'
					},
				],
				default: 'user',
				description: 'The resource to operate on.'
			},
			{
				displayName: 'Resource',
				name: 'resource',
				displayOptions: {
					show: {
						api: ['cti'],
					}
				},
				type: 'options',
				options: [
					{
						name: 'New Call',
						value: 'newCall'
					},
					{
						name: 'Hangup',
						value: 'hangup'
					},
					{
						name: 'Answer',
						value: 'answer'
					},
				],
				default: 'newCall',
				description: 'The resource to operate on.'
			},

			...UsersDescription,
			...OrganizationsDescription,
			...GroupsDescription,
			...TicketsDescription,
			...MentionsDescription,
			...TagsDescription,
			...StatesDescription,
			...PrioritiesDescription,
			...ArticlesDescription,
			...OnlineNotificationsDescription,
			...ObjectsDescription,
			...UserAccessTokensDescription,
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				placeholder: 'Add Custom Field',
				description: 'Adds a custom field to set the value of.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true
				},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						api: ['rest'],
						resource: ['user', 'organization', 'ticket']
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
								description: 'Name of the field to set.'
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set.'
							}
						]
					}
				]
			},
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		let endpoint = '';
		let requestMethod = '';

		let body: any = {};
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
						const customFields  = this.getNodeParameter(
							'customFields',
							i
							) as any;
						if(customFields && customFields.fields && customFields.fields.length !== 0){
							customFields.fields.forEach!((field: any) => {
								body[field['name']] = field['value'];
							});
						}
						body.email = this.getNodeParameter(
							'emailAddress',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         user:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/users/' + userId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields  = this.getNodeParameter(
							'customFields',
							i
							) as any;
						if(customFields && customFields.fields && customFields.fields.length !== 0){
							customFields.fields.forEach!((field: any) => {
								body[field['name']] = field['value'];
							});
						}
						body.email = this.getNodeParameter(
							'emailAddress',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         user:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/users/' + userId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         user:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/users/' + userId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         user:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/users';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         user:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/users/search';
						qs = {} as IDataObject;
						qs.query = this.getNodeParameter('query', i) as string;
						qs.limit = this.getNodeParameter('limit', i)?.toString() as string;
						let sort_by = this.getNodeParameter('sort_by', i) as string;
						if(!(sort_by === "")){
							qs.sort_by = sort_by;
						}
						let order_by = this.getNodeParameter('order_by', i) as Array<string>;
						if(order_by.length !== 0){
							qs.order_by = order_by;
						}

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					else if (operation === 'me') {
						requestMethod = 'GET';
						endpoint = '/api/v1/users/me';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'organization') {
					// ----------------------------------
					//         organization:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/organizations';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields  = this.getNodeParameter(
							'customFields',
							i
							) as any;
						if(customFields && customFields.fields && customFields.fields.length !== 0){
							customFields.fields.forEach!((field: any) => {
								body[field['name']] = field['value'];
							});
						}
						body.name = this.getNodeParameter(
							'name',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         organization:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const organizationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/organizations/' + organizationId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields  = this.getNodeParameter(
							'customFields',
							i
							) as any;
						if(customFields && customFields.fields && customFields.fields.length !== 0){
							customFields.fields.forEach!((field: any) => {
								body[field['name']] = field['value'];
							});
						}
						body.name = this.getNodeParameter(
							'name',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         organization:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const organizationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/organizations/' + organizationId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         organization:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const organizationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/organizations/' + organizationId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         organization:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/organizations';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         organization:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/organizations/search';
						qs = {} as IDataObject;
						qs.query = this.getNodeParameter('query', i) as string;
						qs.limit = this.getNodeParameter('limit', i)?.toString() as string;
						let sort_by = this.getNodeParameter('sort_by', i) as string;
						if(!(sort_by === "")){
							qs.sort_by = sort_by;
						}
						let order_by = this.getNodeParameter('order_by', i) as Array<string>;
						if(order_by.length !== 0){
							qs.order_by = order_by;
						}

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'group') {
					// ----------------------------------
					//         group:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/groups';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter(
							'name',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         group:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const groupId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/groups/' + groupId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter(
							'name',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         group:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const groupId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/groups/' + groupId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         group:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const groupId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/groups/' + groupId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         group:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/groups';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'ticket') {
					// ----------------------------------
					//         ticket:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/tickets';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields  = this.getNodeParameter(
							'customFields',
							i
							) as any;
						if(customFields && customFields.fields && customFields.fields.length !== 0){
							customFields.fields.forEach!((field: any) => {
								body[field['name']] = field['value'];
							});
						}
						body.group = this.getNodeParameter(
							'group',
							i
						) as string;
						body.title = this.getNodeParameter(
							'title',
							i
						) as string;
						body.customer_id = this.getNodeParameter(
							'customerId',
							i
						) as number;
						body.article = this.getNodeParameter('optionalFieldsArticle', i) as IDataObject;
						body.article.body = this.getNodeParameter('body', i) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         ticket:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/tickets/' + ticketId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						const customFields  = this.getNodeParameter(
							'customFields',
							i
							) as any;
						if(customFields && customFields.fields && customFields.fields.length !== 0){
							customFields.fields.forEach!((field: any) => {
								body[field['name']] = field['value'];
							});
						}
						body.group = this.getNodeParameter(
							'group',
							i
						) as string;
						body.title = this.getNodeParameter(
							'title',
							i
						) as string;
						body.customer_id = this.getNodeParameter(
							'customerId',
							i
						) as number;
						body.article = this.getNodeParameter('optionalFieldsArticle', i) as IDataObject;
						body.article.body = this.getNodeParameter('body', i) as string;
						delete body.article;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         ticket:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/tickets/' + ticketId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         ticket:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/tickets/' + ticketId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         ticket:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/tickets';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         ticket:search
					// ----------------------------------
					else if (operation === 'search') {
						requestMethod = 'GET';
						endpoint = '/api/v1/tickets/search';
						qs = {} as IDataObject;
						qs.query = this.getNodeParameter('query', i) as string;
						qs.limit = this.getNodeParameter('limit', i)?.toString() as string;
						let sort_by = this.getNodeParameter('sort_by', i) as string;
						if(!(sort_by === "")){
							qs.sort_by = sort_by;
						}
						let order_by = this.getNodeParameter('order_by', i) as Array<string>;
						if(order_by.length !== 0){
							qs.order_by = order_by;
						}

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'mention') {
					// ----------------------------------
					//         mention:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/mentions';
						body.mentionable_type = this.getNodeParameter(
							'mentionable_type',
							i
						) as string;
						body.mentionable_id = this.getNodeParameter(
							'mentionable_id',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}

					// ----------------------------------
					//         mention:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const mentionId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/mentions/' + mentionId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         mention:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/mentions';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'tag') {
				// ----------------------------------
				//         tag:add
				// ----------------------------------
				if (operation === 'add') {
					requestMethod = 'POST';
					endpoint = '/api/v1/tags/add';
					body.item = this.getNodeParameter(
						'item',
						i
					) as string;
					body.object = this.getNodeParameter(
						'object',
						i
					) as string;
					body.o_id = this.getNodeParameter(
						'o_id',
						i
					) as string;

					qs = {} as IDataObject;

					responseData = await zammadApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						qs
					);
				}

				// ----------------------------------
				//         tag:remove
				// ----------------------------------
				else if (operation === 'remove') {
					requestMethod = 'DELETE';
					endpoint = '/api/v1/tags/remove';
					body.item = this.getNodeParameter(
						'item',
						i
					) as string;
					body.object = this.getNodeParameter(
						'object',
						i
					) as string;
					body.o_id = this.getNodeParameter(
						'o_id',
						i
					) as string;

					qs = {} as IDataObject;

					responseData = await zammadApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						qs
					);
				}
				// ----------------------------------
				//         tag:list
				// ----------------------------------
				else if (operation === 'list') {
					requestMethod = 'GET';
					endpoint = '/api/v1/tags';
					qs = {} as IDataObject;
					qs.object = this.getNodeParameter('object', i) as string;
					qs.o_id = this.getNodeParameter('o_id', i) as string;

					responseData = await zammadApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						qs
					);
				}
				// ----------------------------------
				//         tag:search
				// ----------------------------------
				else if (operation === 'search') {
					requestMethod = 'GET';
					endpoint = '/api/v1/tag_search';
					qs = {} as IDataObject;
					qs.term = this.getNodeParameter('term', i) as string;

					responseData = await zammadApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						qs
					);
				}
				} else if (resource === 'state') {
					// ----------------------------------
					//         state:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/ticket_states';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter(
							'name',
							i
						) as string;
						body.state_type_id = this.getNodeParameter(
							'state_type_id',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         state:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const stateId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_states/' + stateId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter(
							'name',
							i
						) as string;
						body.state_type_id = this.getNodeParameter(
							'state_type_id',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         state:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const stateId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_states/' + stateId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         state:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const stateId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_states/' + stateId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         state:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/ticket_states';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'priority') {
					// ----------------------------------
					//         priority:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/ticket_priorities';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter(
							'name',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         priority:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const priorityId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_priorities/' + priorityId;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.name = this.getNodeParameter(
							'name',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         priority:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const priorityId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_priorities/' + priorityId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         priority:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const priorityId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_priorities/' + priorityId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         priority:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/ticket_priorities';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'article') {
					// ----------------------------------
					//         article:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/ticket_articles';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;

						body.ticket_id = this.getNodeParameter(
							'ticket_id',
							i
						) as number;
						body.body = this.getNodeParameter(
							'body',
							i
						) as string;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         article:listByTicketId
					// ----------------------------------
					else if (operation === 'listByTicketId') {
						requestMethod = 'GET';
						const ticketId = this.getNodeParameter('ticket_id', i) as string;
						endpoint = '/api/v1/ticket_articles/by_ticket/' + ticketId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         article:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/ticket_articles/' + id;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
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

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         onlineNotification:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/online_notifications/' + onlineNotificationId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         onlineNotification:markAllAsRead
					// ----------------------------------
					else if (operation === 'markAllAsRead') {
						requestMethod = 'POST';
						endpoint = '/api/v1/online_notifications/mark_all_as_read';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         onlineNotification:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const onlineNotificationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/online_notifications/' + onlineNotificationId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         onlineNotification:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/online_notifications';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				} else if (resource === 'object') {
					// ----------------------------------
					//         object:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/v1/object_manager_attributes/';
						body = this.getNodeParameter('data', i) as IDataObject;

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
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

						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         object:show
					// ----------------------------------
					else if (operation === 'show') {
						requestMethod = 'GET';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/object_manager_attributes/' + objectId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         object:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/object_manager_attributes/';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         object:executeDatabaseMigrations
					// ----------------------------------
					else if (operation === 'executeDatabaseMigrations') {
						requestMethod = 'POST';
						endpoint = '/api/v1/object_manager_attributes_execute_migrations';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
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
						body.permission = new Array();
						const permissions = this.getNodeParameter('permissions', i) as any;
						for(let i = 0; i < permissions.fields.length; i++) {
							if(permissions.fields[i].permission ) {
								body.permission.push(permissions.fields[i].permission);
							}
						}
						console.log(JSON.stringify(body));


						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         userAccessToken:list
					// ----------------------------------
					else if (operation === 'list') {
						requestMethod = 'GET';
						endpoint = '/api/v1/user_access_token/';
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         userAccessToken:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const userAccessTokenId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/v1/user_access_token/' + userAccessTokenId;
						qs = {} as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error: any) {
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
