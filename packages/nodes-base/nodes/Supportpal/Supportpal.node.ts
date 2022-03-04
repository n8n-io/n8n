import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { supportpalApiRequest, simplify } from './GenericFunctions';
import { usersDescription } from './UsersDescription';
import { reportDescription } from './ReportDescription';
import { organisationsDescription } from './OrganisationsDescription';
import { ticketsDescription } from './TicketsDescription';
import { messageDescription } from './MessageDescription';

type customFields = {
	fields: field[];
};

type field = {
	[id: string]: string;
};

export class Supportpal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supportpal',
		name: 'supportpal',
		icon: 'file:supportpal.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Supportpal REST API',
		defaults: {
			name: 'Supportpal',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'supportpalApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//         resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Organisation',
						value: 'organisation',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Report',
						value: 'report',
					},
				],
				default: 'user',
				description: 'The resource to operate on.',
			},
			// --------------------------------------------------------------------
			//         Operations: User, Organisation, Ticket, Message
			// --------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['user', 'organisation', 'ticket', 'message'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of an entry.',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all entries.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry.',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			...usersDescription,
			...organisationsDescription,
			...ticketsDescription,
			...messageDescription,
			...reportDescription,
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
						operation: ['create', 'update', 'getAll'],
						resource: ['user', 'organisation', 'ticket'],
					},
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'ID of the field to set.',
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
		let endpoint = '';
		let requestMethod = '';

		let body: IDataObject = {};
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
						endpoint = '/api/user/user';
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						qs.email = this.getNodeParameter('email', i) as string;

						const customFields= this.getNodeParameter('customFields', i) as customFields;

						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         user:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/user/user/' + userId;
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         user:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/user/user/' + userId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         user:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const userId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/user/user/' + userId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         user:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/user/user';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
				} else if (resource === 'organisation') {
					// ----------------------------------
					//         organisation:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/user/organisation';
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						qs.name = this.getNodeParameter('name', i) as string;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         organisation:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const organisationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/user/organisation/' + organisationId;
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         organisation:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const organisationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/user/organisation/' + organisationId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         organisation:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const organisationId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/user/organisation/' + organisationId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         organisation:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/user/organisation';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
				} else if (resource === 'ticket') {
					// ----------------------------------
					//         ticket:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/ticket/ticket';
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						qs.user = this.getNodeParameter('user', i) as string;
						qs.department = this.getNodeParameter('department', i) as string;
						qs.status = this.getNodeParameter('status', i) as string;
						qs.priority = this.getNodeParameter('priority', i) as string;
						qs.subject = this.getNodeParameter('subject', i) as string;
						qs.text = this.getNodeParameter('text', i) as string;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         ticket:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/ticket/ticket/' + ticketId;
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         ticket:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/ticket/ticket/' + ticketId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         ticket:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const ticketId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/ticket/ticket/' + ticketId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         ticket:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/ticket/ticket';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						const customFields= this.getNodeParameter('customFields', i) as customFields;
						if (customFields && customFields.fields && customFields.fields.length > 0) {
							qs.customfield = [];
							for (const customField of customFields.fields) {
								// @ts-ignore
								qs.customfield[customField.id] = customField.value;
							}
						}

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
				} else if (resource === 'message') {
					// ----------------------------------
					//         message:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/ticket/message';
						qs = this.getNodeParameter('optionalFields', i) as IDataObject;

						qs.ticket_id = this.getNodeParameter('ticket_id', i) as string;
						qs.user_id = this.getNodeParameter('user_id', i) as string;
						qs.text = this.getNodeParameter('text', i) as string;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         message:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const messageId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/ticket/message/' + messageId;

						qs.text = this.getNodeParameter('text', i) as string;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         message:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const messageId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/ticket/message/' + messageId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         message:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const messageId = this.getNodeParameter('id', i) as string;
						endpoint = '/api/ticket/message/' + messageId;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         message:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/ticket/message';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;
						qs.ticket_id = this.getNodeParameter('ticket_id', i) as string;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
				} else if (resource === 'report') {
					// ----------------------------------
					//         report:get
					// ----------------------------------
					if (operation === 'get') {
						requestMethod = 'GET';
						const category = this.getNodeParameter('category', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						endpoint = '/api/' + category + '/' + name;

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
					}
					// ----------------------------------
					//         report:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/report';

						responseData = await supportpalApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = simplify.call(this, responseData, i);
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
