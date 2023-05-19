import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	capitalize,
	freshdeskApiRequest,
	freshdeskApiRequestAllItems,
	// validateJSON,
} from './GenericFunctions';

import type { ICreateContactBody } from './ContactInterface';

import { contactFields, contactOperations } from './ContactDescription';

const enum Status {
	Open = 2,
	Pending = 3,
	Resolved = 4,
	Closed = 5,
}

const enum Priority {
	Low = 1,
	Medium = 2,
	High = 3,
	Urgent = 4,
}

const enum Source {
	Email = 1,
	Portal = 2,
	Phone = 3,
	Chat = 7,
	Mobihelp = 8,
	FeedbackWidget = 9,
	OutboundEmail = 10,
}

interface ICreateTicketBody {
	name?: string;
	requester_id?: number;
	email?: string;
	facebook_id?: string;
	phone?: string;
	twitter_id?: string;
	unique_external_id?: string;
	subject?: string | null;
	type?: string;
	status?: Status;
	priority?: Priority;
	description?: string;
	responder_id?: number;
	cc_emails?: [string];
	custom_fields?: IDataObject;
	due_by?: string;
	email_config_id?: number;
	fr_due_by?: string;
	group_id?: number;
	product_id?: number;
	source?: Source;
	tags?: [string];
	company_id?: number;
}

export class Freshdesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Freshdesk',
		name: 'freshdesk',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:freshdesk.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Freshdesk API',
		defaults: {
			name: 'Freshdesk',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'freshdeskApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
				],
				default: 'ticket',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new ticket',
						action: 'Create a ticket',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a ticket',
						action: 'Delete a ticket',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a ticket',
						action: 'Get a ticket',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many tickets',
						action: 'Get many tickets',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a ticket',
						action: 'Update a ticket',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Requester Identification',
				name: 'requester',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Email',
						value: 'email',
						description:
							'Email address of the requester. If no contact exists with this email address in Freshdesk, it will be added as a new contact.',
					},
					{
						name: 'Facebook ID',
						value: 'facebookId',
						description:
							'Facebook ID of the requester. If no contact exists with this facebook_id, then a new contact will be created.',
					},
					{
						name: 'Phone',
						value: 'phone',
						description:
							'Phone number of the requester. If no contact exists with this phone number in Freshdesk, it will be added as a new contact. If the phone number is set and the email address is not, then the name attribute is mandatory.',
					},
					{
						name: 'Requester ID',
						value: 'requesterId',
						description:
							"User ID of the requester. For existing contacts, the requester_id can be passed instead of the requester's email.",
					},
					{
						name: 'Twitter ID',
						value: 'twitterId',
						description:
							'Twitter handle of the requester. If no contact exists with this handle in Freshdesk, it will be added as a new contact.',
					},
					{
						name: 'Unique External ID',
						value: 'uniqueExternalId',
						description:
							'External ID of the requester. If no contact exists with this external ID in Freshdesk, they will be added as a new contact.',
					},
				],
				default: 'requesterId',
			},
			{
				displayName: 'Value',
				name: 'requesterIdentificationValue',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Value of the identification selected',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
				],
				default: 'pending',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Medium',
						value: 'medium',
					},
					{
						name: 'High',
						value: 'high',
					},
					{
						name: 'Urgent',
						value: 'urgent',
					},
				],
				default: 'low',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Feedback Widget',
						value: 'feedbackWidget',
					},
					{
						name: 'Mobihelp',
						value: 'mobileHelp',
					},
					{
						name: 'Outbound Email',
						value: 'OutboundEmail',
					},
					{
						name: 'Phone',
						value: 'phone',
					},
					{
						name: 'Portal',
						value: 'portal',
					},
				],
				default: 'portal',
				description: 'The channel through which the ticket was created',
			},
			// {
			// 	displayName: 'JSON Parameters',
			// 	name: 'jsonParameters',
			// 	type: 'boolean',
			// 	default: false,
			// 	description: '',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'ticket'
			// 			],
			// 			operation: [
			// 				'create',
			// 			]
			// 		},
			// 	},
			// },
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Agent Name or ID',
						name: 'agent',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getAgents',
						},
						description:
							'ID of the agent to whom the ticket has been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'CC Emails',
						name: 'ccEmails',
						type: 'string',
						default: '',
						description:
							"Separated by a comma (,) email addresses added in the 'cc' field of the incoming ticket email",
					},
					{
						displayName: 'Company Name or ID',
						name: 'company',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getCompanies',
						},
						description:
							'Company ID of the requester. This attribute can only be set if the Multiple Companies feature is enabled (Estate plan and above). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						typeOptions: {
							rows: 5,
						},
						description: 'HTML content of the ticket',
					},
					{
						displayName: 'Due By',
						name: 'dueBy',
						type: 'dateTime',
						default: '',
						description: 'Timestamp that denotes when the ticket is due to be resolved',
					},
					{
						displayName: 'Email Config ID',
						name: 'emailConfigId',
						type: 'number',
						default: '',
						description:
							"ID of email config which is used for this ticket. (i.e., support@yourcompany.com/sales@yourcompany.com) If product_id is given and email_config_id is not given, product's primary email_config_id will be set.",
					},
					{
						displayName: 'FR Due By',
						name: 'frDueBy',
						type: 'dateTime',
						default: '',
						description: 'Timestamp that denotes when the first response is due',
					},
					{
						displayName: 'Group Name or ID',
						name: 'group',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getGroups',
						},
						description:
							'ID of the group to which the ticket has been assigned. The default value is the ID of the group that is associated with the given email_config_id. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Name of the requester',
					},
					{
						displayName: 'Product Name or ID',
						name: 'product',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getProducts',
						},
						description:
							'ID of the product to which the ticket is associated. It will be ignored if the email_config_id attribute is set in the request. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Subject of the ticket',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Separated by a comma (,) tags that have been associated with the ticket',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'Question',
						description:
							'Helps categorize the ticket according to the different kinds of issues your support team deals with',
						options: [
							{
								name: 'Feature Request',
								value: 'Feature Request',
							},
							{
								name: 'Incident',
								value: 'Incident',
							},
							{
								name: 'Problem',
								value: 'Problem',
							},
							{
								name: 'Question',
								value: 'Question',
							},
							{
								name: 'Refund',
								value: 'Refund',
							},
						],
					},
				],
			},
			// {
			// 	displayName: 'Custom Fields',
			// 	name: 'customFieldsUi',
			// 	placeholder: 'Add Custom fields',
			// 	type: 'fixedCollection',
			// 	required: false,
			// 	default: '',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'ticket'
			// 			],
			// 			operation: [
			// 				'create'
			// 			],
			// 			jsonParameters: [
			// 				false,
			// 			],
			// 		},
			// 	},
			// 	description: 'Key value pairs containing the names and values of custom fields.',
			// 	options: [
			// 		{
			// 			name: 'customFieldsValues',
			// 			displayName: 'Custom fields',
			// 			values: [
			// 				{
			// 					displayName: 'Key',
			// 					required: false,
			// 					name: 'key',
			// 					type: 'string',
			// 					default: '',
			// 				},
			// 				{
			// 					displayName: 'Value',
			// 					name: 'value',
			// 					type: 'string',
			// 					required: false,
			// 					default: '',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
			// {
			// 	displayName: 'Custom Fields',
			// 	name: 'customFieldsJson',
			// 	type: 'json',
			// 	typeOptions: {
			// 		alwaysOpenEditWindow: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'ticket',
			// 			],
			// 			operation: [
			// 				'create',
			// 			],
			// 			jsonParameters: [
			// 				true,
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	required: false,
			// 	placeholder: `{
			// 		'gadget': 'Cold Welder',
			// 	}`,
			// 	description: 'Key value pairs containing the names and values of custom fields.',
			// },
			{
				displayName: 'Ticket ID',
				name: 'ticketId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['update'],
					},
				},
				default: '',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Agent Name or ID',
						name: 'agent',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getAgents',
						},
						description:
							'ID of the agent to whom the ticket has been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'CC Emails',
						name: 'ccEmails',
						type: 'string',
						default: '',
						description:
							"Separated by a comma (,) email addresses added in the 'cc' field of the incoming ticket email",
					},
					{
						displayName: 'Company Name or ID',
						name: 'company',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getCompanies',
						},
						description:
							'Company ID of the requester. This attribute can only be set if the Multiple Companies feature is enabled (Estate plan and above). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Due By',
						name: 'dueBy',
						type: 'dateTime',
						default: '',
						description: 'Timestamp that denotes when the ticket is due to be resolved',
					},
					{
						displayName: 'Email Config ID',
						name: 'emailConfigId',
						type: 'number',
						default: '',
						description:
							"ID of email config which is used for this ticket. (i.e., support@yourcompany.com/sales@yourcompany.com) If product_id is given and email_config_id is not given, product's primary email_config_id will be set.",
					},
					{
						displayName: 'FR Due By',
						name: 'frDueBy',
						type: 'dateTime',
						default: '',
						description: 'Timestamp that denotes when the first response is due',
					},
					{
						displayName: 'Group Name or ID',
						name: 'group',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getGroups',
						},
						description:
							'ID of the group to which the ticket has been assigned. The default value is the ID of the group that is associated with the given email_config_id. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Name of the requester',
					},
					{
						displayName: 'Product Name or ID',
						name: 'product',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getProducts',
						},
						description:
							'ID of the product to which the ticket is associated. It will be ignored if the email_config_id attribute is set in the request. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
							},
							{
								name: 'Medium',
								value: 'medium',
							},
							{
								name: 'High',
								value: 'high',
							},
							{
								name: 'Urgent',
								value: 'urgent',
							},
						],
						default: 'low',
					},
					{
						displayName: 'Requester Identification',
						name: 'requester',
						type: 'options',
						options: [
							{
								name: 'Email',
								value: 'email',
								description:
									'Email address of the requester. If no contact exists with this email address in Freshdesk, it will be added as a new contact.',
							},
							{
								name: 'Facebook ID',
								value: 'facebookId',
								description:
									'Facebook ID of the requester. If no contact exists with this facebook_id, then a new contact will be created.',
							},
							{
								name: 'Phone',
								value: 'phone',
								description:
									'Phone number of the requester. If no contact exists with this phone number in Freshdesk, it will be added as a new contact. If the phone number is set and the email address is not, then the name attribute is mandatory.',
							},
							{
								name: 'Requester ID',
								value: 'requesterId',
								description:
									"User ID of the requester. For existing contacts, the requester_id can be passed instead of the requester's email.",
							},
							{
								name: 'Twitter ID',
								value: 'twitterId',
								description:
									'Twitter handle of the requester. If no contact exists with this handle in Freshdesk, it will be added as a new contact.',
							},
							{
								name: 'Unique External ID',
								value: 'uniqueExternalId',
								description:
									'External ID of the requester. If no contact exists with this external ID in Freshdesk, they will be added as a new contact.',
							},
						],
						default: 'requesterId',
					},
					{
						displayName: 'Requester Value',
						name: 'requesterIdentificationValue',
						type: 'string',
						default: '',
						description: 'Value of the identification selected',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Open',
								value: 'open',
							},
							{
								name: 'Pending',
								value: 'pending',
							},
							{
								name: 'Resolved',
								value: 'resolved',
							},
							{
								name: 'Closed',
								value: 'closed',
							},
						],
						default: 'pending',
					},
					{
						displayName: 'Source',
						name: 'source',
						type: 'options',
						options: [
							{
								name: 'Chat',
								value: 'chat',
							},
							{
								name: 'Email',
								value: 'email',
							},
							{
								name: 'Feedback Widget',
								value: 'feedbackWidget',
							},
							{
								name: 'Mobihelp',
								value: 'mobileHelp',
							},

							{
								name: 'Outbound Email',
								value: 'OutboundEmail',
							},
							{
								name: 'Phone',
								value: 'phone',
							},
							{
								name: 'Portal',
								value: 'portal',
							},
						],
						default: 'portal',
						description: 'The channel through which the ticket was created',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Separated by a comma (,) tags that have been associated with the ticket',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'Question',
						description:
							'Helps categorize the ticket according to the different kinds of issues your support team deals with',
						options: [
							{
								name: 'Feature Request',
								value: 'Feature Request',
							},
							{
								name: 'Incident',
								value: 'Incident',
							},
							{
								name: 'Problem',
								value: 'Problem',
							},
							{
								name: 'Question',
								value: 'Question',
							},
							{
								name: 'Refund',
								value: 'Refund',
							},
						],
					},
				],
			},
			{
				displayName: 'Ticket ID',
				name: 'ticketId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['get'],
					},
				},
				default: '',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 5,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Company ID',
						name: 'companyId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Include',
						name: 'include',
						type: 'multiOptions',
						options: [
							{
								name: 'Company',
								value: 'company',
							},
							{
								name: 'Description',
								value: 'description',
							},
							{
								name: 'Requester',
								value: 'requester',
							},
							{
								name: 'Stats',
								value: 'stats',
							},
						],
						default: [],
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'ASC',
								value: 'asc',
							},
							{
								name: 'DESC',
								value: 'desc',
							},
						],
						default: 'desc',
						description: 'Order sort attribute ascending or descending',
					},
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'options',
						options: [
							{
								name: 'Created At',
								value: 'createdAt',
							},
							{
								name: 'Due By',
								value: 'dueBy',
							},
							{
								name: 'Updated At',
								value: 'updatedAt',
							},
						],
						default: '',
						description: 'Sort collection by object attribute',
					},
					{
						displayName: 'Requester Email',
						name: 'requesterEmail',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Requester ID',
						name: 'requesterId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Updated Since',
						name: 'updatedSince',
						type: 'dateTime',
						default: '',
					},
				],
			},
			{
				displayName: 'Ticket ID',
				name: 'ticketId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['ticket'],
						operation: ['delete'],
					},
				},
				default: '',
			},
			// CONTACTS
			...contactOperations,
			...contactFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the agents to display them to user so that they can
			// select them easily
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const agents = await freshdeskApiRequest.call(this, 'GET', '/agents');
				for (const agent of agents) {
					const agentName = agent.contact.name;
					const agentId = agent.id;

					returnData.push({
						name: agentName,
						value: agentId,
					});
				}
				return returnData;
			},

			// Get all the groups to display them to user so that they can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await freshdeskApiRequest.call(this, 'GET', '/groups');
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

			// Get all the products to display them to user so that they can
			// select them easily
			async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const products = await freshdeskApiRequest.call(this, 'GET', '/products');
				for (const product of products) {
					const productName = product.name;
					const productId = product.id;

					returnData.push({
						name: productName,
						value: productId,
					});
				}
				return returnData;
			},

			// Get all the companies to display them to user so that they can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const companies = await freshdeskApiRequest.call(this, 'GET', '/companies');
				for (const company of companies) {
					const companyName = company.name;
					const companyId = company.id;

					returnData.push({
						name: companyName,
						value: companyId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'ticket') {
					//https://developers.freshdesk.com/api/#create_ticket
					if (operation === 'create') {
						const requester = this.getNodeParameter('requester', i) as string;
						const value = this.getNodeParameter('requesterIdentificationValue', i) as string;
						const status = this.getNodeParameter('status', i) as string;
						const priority = this.getNodeParameter('priority', i) as string;
						const source = this.getNodeParameter('source', i) as string;
						const options = this.getNodeParameter('options', i);
						//const jsonActive = this.getNodeParameter('jsonParameters') as boolean;
						const body: ICreateTicketBody = {
							// @ts-ignore
							status: Status[capitalize(status)],
							// @ts-ignore
							priority: Priority[capitalize(priority)],
							// @ts-ignore
							source: Source[capitalize(source)],
						};

						if (requester === 'requesterId') {
							// @ts-ignore
							if (isNaN(value)) {
								throw new NodeOperationError(this.getNode(), 'Requester Id must be a number', {
									itemIndex: i,
								});
							}
							body.requester_id = parseInt(value, 10);
						} else if (requester === 'email') {
							body.email = value;
						} else if (requester === 'facebookId') {
							body.facebook_id = value;
						} else if (requester === 'phone') {
							body.phone = value;
						} else if (requester === 'twitterId') {
							body.twitter_id = value;
						} else if (requester === 'uniqueExternalId') {
							body.unique_external_id = value;
						}

						// if (!jsonActive) {
						// 	const customFieldsUi = this.getNodeParameter('customFieldsUi') as IDataObject;
						// 	if (Object.keys(customFieldsUi).length > 0) {
						// 		const aux: IDataObject = {};
						// 		// @ts-ignore
						// 		customFieldsUi.customFieldsValues.forEach( o => {
						// 			aux[`${o.key}`] = o.value;
						// 			return aux;
						// 		});
						// 		body.custom_fields = aux;
						// } else {
						// 	body.custom_fields = validateJSON(this.getNodeParameter('customFielsJson') as string);
						// }

						if (options.name) {
							body.name = options.name as string;
						}
						if (options.subject) {
							body.subject = options.subject as string;
						} else {
							body.subject = 'null';
						}
						if (options.type) {
							body.type = options.type as string;
						}
						if (options.description) {
							body.description = options.description as string;
						} else {
							body.description = 'null';
						}
						if (options.agent) {
							body.responder_id = options.agent as number;
						}
						if (options.company) {
							body.company_id = options.company as number;
						}
						if (options.product) {
							body.product_id = options.product as number;
						}
						if (options.group) {
							body.group_id = options.group as number;
						}
						if (options.frDueBy) {
							body.fr_due_by = options.frDueBy as string;
						}
						if (options.emailConfigId) {
							body.email_config_id = options.emailConfigId as number;
						}
						if (options.dueBy) {
							body.due_by = options.dueBy as string;
						}
						if (options.tags) {
							body.tags = (options.tags as string).split(',') as [string];
						}
						if (options.ccEmails) {
							body.cc_emails = (options.ccEmails as string).split(',') as [string];
						}
						responseData = await freshdeskApiRequest.call(this, 'POST', '/tickets', body);
					}
					//https://developers.freshdesk.com/api/#update_ticket
					if (operation === 'update') {
						const ticketId = this.getNodeParameter('ticketId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: ICreateTicketBody = {};

						if (updateFields.requester) {
							const value = updateFields.requesterIdentificationValue as string;
							if (updateFields.requester === 'requesterId') {
								// @ts-ignore
								if (isNaN(parseInt(value, 10))) {
									throw new NodeOperationError(this.getNode(), 'Requester Id must be a number', {
										itemIndex: i,
									});
								}
								body.requester_id = parseInt(value, 10);
							} else if (updateFields.requester === 'email') {
								body.email = value;
							} else if (updateFields.requester === 'facebookId') {
								body.facebook_id = value;
							} else if (updateFields.requester === 'phone') {
								body.phone = value;
							} else if (updateFields.requester === 'twitterId') {
								body.twitter_id = value;
							} else if (updateFields.requester === 'uniqueExternalId') {
								body.unique_external_id = value;
							}
						}
						if (updateFields.status) {
							//@ts-ignore
							body.status = Status[capitalize(updateFields.status)];
						}
						if (updateFields.priority) {
							//@ts-ignore
							body.priority = Priority[capitalize(updateFields.priority)];
						}
						if (updateFields.source) {
							//@ts-ignore
							body.source = Source[capitalize(updateFields.source)];
						}
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.type) {
							body.type = updateFields.type as string;
						}
						if (updateFields.agent) {
							body.responder_id = updateFields.agent as number;
						}
						if (updateFields.company) {
							body.company_id = updateFields.company as number;
						}
						if (updateFields.product) {
							body.product_id = updateFields.product as number;
						}
						if (updateFields.group) {
							body.group_id = updateFields.group as number;
						}
						if (updateFields.frDueBy) {
							body.fr_due_by = updateFields.frDueBy as string;
						}
						if (updateFields.emailConfigId) {
							body.email_config_id = updateFields.emailConfigId as number;
						}
						if (updateFields.dueBy) {
							body.due_by = updateFields.dueBy as string;
						}
						if (updateFields.tags) {
							body.tags = (updateFields.tags as string).split(',') as [string];
						}
						if (updateFields.ccEmails) {
							body.cc_emails = (updateFields.ccEmails as string).split(',') as [string];
						}
						responseData = await freshdeskApiRequest.call(
							this,
							'PUT',
							`/tickets/${ticketId}`,
							body,
						);
					}
					//https://developers.freshdesk.com/api/#view_a_ticket
					if (operation === 'get') {
						const ticketId = this.getNodeParameter('ticketId', i) as string;
						responseData = await freshdeskApiRequest.call(this, 'GET', `/tickets/${ticketId}`);
					}
					//https://developers.freshdesk.com/api/#list_all_tickets
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						if (options.requesterId) {
							qs.requester_id = options.requesterId as string;
						}
						if (options.requesterEmail) {
							qs.email = options.requesterEmail as string;
						}
						if (options.companyId) {
							qs.company_id = options.companyId as string;
						}
						if (options.updatedSince) {
							qs.updated_since = options.updatedSince as string;
						}
						if (options.orderBy) {
							qs.order_by = options.orderBy as string;
						}
						if (options.order) {
							qs.order_type = options.order as string;
						}
						if (options.include) {
							if ((options.include as string[]).length !== 0) {
								qs.include = (options.include as string[]).join(',');
							}
						}
						if (returnAll) {
							responseData = await freshdeskApiRequestAllItems.call(
								this,
								'GET',
								'/tickets',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', i);
							responseData = await freshdeskApiRequest.call(this, 'GET', '/tickets', {}, qs);
						}
					}
					//https://developers.freshdesk.com/api/#delete_a_ticket
					if (operation === 'delete') {
						const ticketId = this.getNodeParameter('ticketId', i) as string;
						responseData = await freshdeskApiRequest.call(this, 'DELETE', `/tickets/${ticketId}`);
					}
				} else if (resource === 'contact') {
					//https://developers.freshdesk.com/api/#create_contact
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {});

						if (additionalFields.customFields) {
							const metadata = (additionalFields.customFields as IDataObject)
								.customField as IDataObject[];
							additionalFields.custom_fields = {};
							for (const data of metadata) {
								//@ts-ignore
								additionalFields.custom_fields[data.name as string] = data.value;
							}
							delete additionalFields.customFields;
						}

						const body: ICreateContactBody = additionalFields;
						body.name = name;
						if (email) {
							body.email = email;
						}
						responseData = await freshdeskApiRequest.call(this, 'POST', '/contacts', body);
						//https://developers.freshdesk.com/api/#delete_contact
					} else if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await freshdeskApiRequest.call(
							this,
							'DELETE',
							`/contacts/${contactId}`,
							{},
						);
					} else if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await freshdeskApiRequest.call(
							this,
							'GET',
							`/contacts/${contactId}`,
							{},
						);
						//https://developers.freshdesk.com/api/#list_all_contacts
					} else if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i, {});
						responseData = await freshdeskApiRequest.call(this, 'GET', '/contacts', {}, filters);
						//https://developers.freshdesk.com/api/#update_contact
					} else if (operation === 'update') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {});

						if (additionalFields.customFields) {
							const metadata = (additionalFields.customFields as IDataObject)
								.customField as IDataObject[];
							additionalFields.custom_fields = {};
							for (const data of metadata) {
								//@ts-ignore
								additionalFields.custom_fields[data.name as string] = data.value;
							}
							delete additionalFields.customFields;
						}

						const body: ICreateContactBody = additionalFields;
						responseData = await freshdeskApiRequest.call(
							this,
							'PUT',
							`/contacts/${contactId}`,
							body,
						);
					}
				}

				if (!Array.isArray(responseData) && responseData === undefined) {
					responseData = {
						success: true,
					};
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
