import {
	IExecuteSingleFunctions,
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
	freshdeskApiRequest
} from './GenericFunctions';

import moment = require('moment');
import _ = require('lodash')

enum Status {
	Open = 1,
	Pending = 2,
	Resolved = 3,
	Closed = 4
}

enum Priority {
	Low = 1,
	Medium = 2,
	High = 3,
	Urgent = 4
}

interface ICreateTicketBody  {
	name?: string;
	requester_id?: number;
	email?: string;
	facebook_id?: string;
	phone?: string;
	twitter_id?: string;
	unique_external_id?: string,
	subject?: string,
	type?: string,
	status: Status,
	priority: Priority,
	description?: string,
	responder_id?: number,
	cc_emails?: [string];
	custom_fields?: IDataObject;
	due_by?: string;
	email_config_id?: number;
	fr_due_by?: string;
	group_id?: number;
	product_id?: number;
	source: number;
	tags: [string];
	company_id: number;
}

export class Freshdesk implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Freshdesk',
		name: 'freshdesk',
		icon: 'file:freshdesk.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Freshdesk API',
		defaults: {
			name: 'Freshdesk',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'freshdeskApi',
				required: true,
			}
        ],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Ticket',
						value: 'ticket',
					},
				],
				default: 'ticket',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						]
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new ticket',
					}
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Requester Identification',
				name: 'requester',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				options: [
					{
						name: 'Requester Id',
						value: 'requesterId',
						description: `User ID of the requester. For existing contacts, the requester_id can be passed instead of the requester's email.`,
					},
					{
						name: 'Email',
						value: 'email',
						description: `Email address of the requester. If no contact exists with this email address in Freshdesk, it will be added as a new contact.`,
					},
					{
						name: 'Facebook Id',
						value: 'facebookId',
						description: `Facebook ID of the requester. If no contact exists with this facebook_id, then a new contact will be created.`,
					},
					{
						name: 'Phone',
						value: 'phone',
						description: `Phone number of the requester. If no contact exists with this phone number in Freshdesk, it will be added as a new contact. If the phone number is set and the email address is not, then the name attribute is mandatory.`,
					},
					{
						name: 'Twitter Id',
						value: 'twitterId',
						description: `Twitter handle of the requester. If no contact exists with this handle in Freshdesk, it will be added as a new contact.`,
					},
					{
						name: 'Unique External Id',
						value: 'uniqueExternalId',
						description: `External ID of the requester. If no contact exists with this external ID in Freshdesk, they will be added as a new contact.`,
					},
				],
				default: 'requesterId',
				description: 'Requester Identification',
			},
			{
				displayName: 'Value',
				name: 'requesterIdentificationValue',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				default: '',
				description: `Value of the identification selected `,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
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
					}
				],
				default: 'pending',
				description: 'Status',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
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
					}
				],
				default: 'low',
				description: 'Priority',
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				description: '',
				displayOptions: {
					show: {
						resource: [
							'ticket'
						],
						operation: [
							'create',
						]
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'ticket'
						],
						operation: [
							'create'
						],
					},
				},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Name of the requester',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Subject of the ticket.',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						description: 'Helps categorize the ticket according to the different kinds of issues your support team deals with.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						typeOptions: {
							rows: 5,
							alwaysOpenEditWindow: true,
						},
						description: 'HTML content of the ticket.',
					},
					{
						displayName: 'Agent',
						name: 'agent',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getAgents'
						},
						description: 'ID of the agent to whom the ticket has been assigned',
					},
					{
						displayName: 'CC Emails',
						name: 'ccEmails',
						type: 'string',
						default: '',
						description: `separated by , email addresses added in the 'cc' field of the incoming ticket email`,
					},
				]
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom fields',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: [
							'ticket'
						],
						operation: [
							'create'
						],
						jsonParameters: [
							false,
						],
					},
				},
				description: 'Key value pairs containing the names and values of custom fields.',
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom fields',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						resource: [
							'ticket'
						],
						operation: [
							'create'
						],
						jsonParameters: [
							true,
						],
					},
				},
				default: '',
				placeholder: `{
					"gadget":"Cold Welder"
				}`,
				description: 'Key value pairs containing the names and values of custom fields.',
			},
        ]
	};

	methods = {
		loadOptions: {
			// Get all the agents to display them to user so that he can
			// select them easily
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let agents;
				try {
					agents = await freshdeskApiRequest.call(this, '/agents', 'GET');
				} catch (err) {
					throw new Error(`Mandrill Error: ${err}`);
				}
				for (const agent of agents) {
					const agentName = agent.contact.name;
					const agentId = agent.id;

					returnData.push({
						name: agentName,
						value: agentId,
					});
				}

				return returnData;
			}
		},
	};

    

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		return {
			json: {}
		}

    }
}
