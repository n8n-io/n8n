import {
	INodeProperties
} from 'n8n-workflow';

import { dueDatePreSendAction, taskPostReceiceAction } from '../GenericFunctions';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
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
						postReceive: [
							taskPostReceiceAction
						],
					},
				},
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
						postReceive: [
							taskPostReceiceAction
						],
					},
				},
			},
			{
				name: 'Get All',
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
							taskPostReceiceAction
						],
					},
				}
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/contacts/{{$parameter.contactId}}/tasks/{{$parameter.taskId}}',
					},
					output: {
						postReceive: [
							taskPostReceiceAction
						],
					},
				},
			},
		],
		default: 'create',
	},
];

const additionalFields: Array<INodeProperties> = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'description',
					}
				}
			},
			{
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'assignedTo',
					}
				}
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
					}
				}
			},
		],
	}
]

const createOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
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
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'title',
			}
		}
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'dueDate',
				preSend: [
					dueDatePreSendAction
				],
			}
		}
	},
];

const deleteOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'task',
				],
				operation: [
					'delete',
				]
			},
		},
		default: '',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'get',
				],
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
				resource: [
					'task',
				],
				operation: [
					'get',
				]
			},
		},
		default: '',
	},
];

const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
			output: {
				maxResults: '={{$value}}', // Set maxResults to the value of current parameter
			},
		},
		description: 'Max number of results to return',
	},
];

const updateOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
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
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'title',
			}
		}
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'dueDate',
				preSend: [
					dueDatePreSendAction
				],
			}
		}
	},
];

export const taskFields: INodeProperties[] = [
	...createOperations,
	...updateOperations,
	...additionalFields,
	...deleteOperations,
	...getOperations,
	...getAllOperations,
];
