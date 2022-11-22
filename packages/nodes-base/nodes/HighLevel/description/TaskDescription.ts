import { INodeProperties } from 'n8n-workflow';

import {
	dueDatePreSendAction,
	taskPostReceiceAction,
	taskUpdatePreSendAction,
} from '../GenericFunctions';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				routing: {
					request: {
						method: 'POST',
						url: '=/contacts/{{$parameter.contactId}}/tasks',
					},
					output: {
						postReceive: [taskPostReceiceAction],
					},
				},
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contacts/{{$parameter.contactId}}/tasks/{{$parameter.taskId}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/contacts/{{$parameter.contactId}}/tasks/{{$parameter.taskId}}',
					},
					output: {
						postReceive: [taskPostReceiceAction],
					},
				},
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '=/contacts/{{$parameter.contactId}}/tasks',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'tasks',
								},
							},
							taskPostReceiceAction,
						],
					},
				},
				action: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/contacts/{{$parameter.contactId}}/tasks/{{$parameter.taskId}}',
					},
					send: {
						preSend: [taskUpdatePreSendAction],
					},
					output: {
						postReceive: [taskPostReceiceAction],
					},
				},
				action: 'Update a task',
			},
		],
		default: 'create',
	},
];

const createProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		default: '',
		required: true,
		description: 'Contact the task belongs to',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'title',
			},
		},
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'dueDate',
				preSend: [dueDatePreSendAction],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				routing: {
					send: {
						type: 'body',
						property: 'assignedTo',
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'description',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Incompleted',
						value: 'incompleted',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
				],
				default: 'incompleted',
				routing: {
					send: {
						type: 'body',
						property: 'status',
					},
				},
			},
		],
	},
];

const deleteProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['delete'],
			},
		},
		default: '',
		required: true,
		description: 'Contact the task belongs to',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['delete'],
			},
		},
		default: '',
	},
];

const getProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['get'],
			},
		},
		default: '',
		required: true,
		description: 'Contact the task belongs to',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['get'],
			},
		},
		default: '',
	},
];

const getAllProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
		default: '',
		required: true,
		description: 'Contact the task belongs to',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['task'],
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
				resource: ['task'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 20,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
		description: 'Max number of results to return',
	},
];

const updateProperties: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		default: '',
		required: true,
		description: 'Contact the task belongs to',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				routing: {
					send: {
						type: 'body',
						property: 'assignedTo',
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'description',
					},
				},
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'dueDate',
						preSend: [dueDatePreSendAction],
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Incompleted',
						value: 'incompleted',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
				],
				default: 'incompleted',
				routing: {
					send: {
						type: 'body',
						property: 'status',
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'title',
					},
				},
			},
		],
	},
];

export const taskFields: INodeProperties[] = [
	...createProperties,
	...updateProperties,
	...deleteProperties,
	...getProperties,
	...getAllProperties,
];
