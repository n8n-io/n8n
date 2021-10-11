import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
import { customFieldOperations } from '../ConvertKit/CustomFieldDescription';

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
			//         api
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
			// ----------------------------------
			//         Operation: user
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['user'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.'
					},
					{
						name: 'Show',
						value: 'show',
						description: 'Get data of an entry.'
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Get data of an entry.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all entries.'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry.'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry.'
					},
					{
						name: 'Me',
						value: 'me',
						description: 'Get data of the current user.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: User
			// ----------------------------------
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'The email address of the user.'
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'show', 'delete'],
						resource: ['user']
					}
				},
				description: 'The ID of the user.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the user.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Login',
						name: 'login',
						type: 'string',
						default: '',
						description: "The login name of the user."
					},
					{
						displayName: 'First Name',
						name: 'firstname',
						type: 'string',
						default: '',
						description: "The user's first name."
					},
					{
						displayName: 'Last Name',
						name: 'lastname',
						type: 'string',
						default: '',
						description: 'The last name of the user.'
					},
					{
						displayName: 'Organization',
						name: 'organization',
						type: 'string',
						default: '',
						description: 'The organization of the user.'
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: "The note of the user."
					},
					{
						displayName: 'Website',
						name: 'web',
						type: 'string',
						default: '',
						description: "Website of the user."
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: "Phone number of the user."
					},
					{
						displayName: 'Mobile Phone',
						name: 'mobile',
						type: 'string',
						default: '',
						description: "Mobile phone number of the user."
					},
					{
						displayName: 'Fax number',
						name: 'fax',
						type: 'string',
						default: '',
						description: "Fax number of the user."
					},
					{
						displayName: 'Department',
						name: 'department',
						type: 'string',
						default: '',
						description: "Department of the user."
					},
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
						description: "Street of the users address."
					},
					{
						displayName: 'Zip Code',
						name: 'zip',
						type: 'string',
						default: '',
						description: "Zip Code of the users address."
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: "City of the users address."
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						description: "Country of the users address."
					},
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: "Address of the user."
					},
					{
						displayName: 'VIP?',
						name: 'vip',
						type: 'boolean',
						default: '',
						description: "Is the user vip?"
					},
					{
						displayName: 'Verified?',
						name: 'verified',
						type: 'boolean',
						default: '',
						description: "Is the user verified?"
					},
					{
						displayName: 'Active?',
						name: 'active',
						type: 'boolean',
						default: '',
						description: "Is the user active?"
					},
				]
			},
			{
				displayName: 'Custom User Fields',
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
						resource: ['user'],
						api: ['rest']
					}
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
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'The query to search the users.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many users to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'How to sort the users.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				options: [
					{
						name: 'Ascending',
						value: 'asc'
					},
					{
						name: 'Descending',
						value: 'desc'
					},
				],
				default: [],
				description: 'How to order the users.'
			},
			// ----------------------------------
			//         Operation: organization
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['organization'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.'
					},
					{
						name: 'Show',
						value: 'show',
						description: 'Get data of an entry.'
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Get data of an entry.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all entries.'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry.'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: organization
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The email address of the organization.'
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'show', 'delete'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The ID of the organization.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the organization.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Shared?',
						name: 'shared',
						type: 'boolean',
						default: '',
						description: "If the organization is shared."
					},
					{
						displayName: 'Active?',
						name: 'active',
						type: 'string',
						default: '',
						description: 'If the organization is active.'
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: "The note of the organization."
					},
				]
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The query to search the organizations.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many organizations to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'How to sort the organizations.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				options: [
					{
						name: 'Ascending',
						value: 'asc'
					},
					{
						name: 'Descending',
						value: 'desc'
					},
				],
				default: [],
				description: 'How to order the organizations.'
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
				} else if (resource === 'customObject') {
					// ----------------------------------
					//         customObject:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/REST/2.0/assets/customObject';

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.name = this.getNodeParameter('name', i) as string;
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fields = fields;

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
					//         customObject:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/assets/customObject/${objectId}`;

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.id = objectId;
						body.name = this.getNodeParameter('name', i) as string;
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fields = fields;

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
					//         customObject:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/assets/customObject/${objectId}`;
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
					//         customObject:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/assets/customObject/${objectId}`;
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
					//         customObject:getALL
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/REST/2.0/assets/customObjects';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						responseData = await zammadApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,

							qs
						);
					}
				} else if (resource === 'customObjectData') {
					// ----------------------------------
					//         customObjectData:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						const parentId = this.getNodeParameter('parentId', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance`;

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						// body.accountId = '12345'; TODO: Check if Read Only
						const { fields } = this.getNodeParameter(
							'customObjectDataCustomFields',
							i
						) as any;
						body.fieldValues = fields;

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
					//         customObjectData:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.id = objectDataId;
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fieldValues = fields;

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
					//         customObject:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

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
					//         customObjectData:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

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
					//         customObjectData:getALL
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						const parentId = this.getNodeParameter('parentId', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instances`;

						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

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
