import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties
} from 'n8n-workflow';

import {
	DateTime,
	ToISOTimeOptions
} from 'luxon';

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
						url: '=/contacts/{{$parameter.contactIdentifier}}/tasks',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contacts/{{$parameter.contactIdentifier}}/tasks/{{$parameter.identifier}}',
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
						url: '=/contacts/{{$parameter.contactIdentifier}}/tasks/{{$parameter.identifier}}',
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '=/contacts/{{$parameter.contactIdentifier}}/tasks',
					},
					// HighLevel API V1.1.20 does not support /pipelines pagination
					// send: {
					// 	paginate: true,
					// },
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'tasks',
								},
							},
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
						url: '=/contacts/{{$parameter.contactIdentifier}}/tasks/{{$parameter.identifier}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'task',
								},
							},
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
						type: 'query',
						property: 'status',
					}
				}
			},
		],
	}
]

const createOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
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
					async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
						const dueDateParam = this.getNodeParameter('dueDate') as string;
						const options: ToISOTimeOptions = { suppressMilliseconds: true }
						const dueDate = DateTime.fromISO(dueDateParam).toISO(options);
						requestOptions.body = (requestOptions.body || {}) as object;
						Object.assign(requestOptions.body, { dueDate });
						// console.log({ dueDateParam, dueDate });
						return requestOptions;
					},
				],
			}
		}
	},
];

const deleteOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
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
		displayName: 'Identifier',
		name: 'identifier',
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
		description: 'Task ID',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
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
		displayName: 'Identifier',
		name: 'identifier',
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
		description: 'Task ID',
	},
];

const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
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
	// HighLevel API V1.1.20 does not support /pipelines pagination
	// {
	// 	displayName: 'Return All',
	// 	name: 'returnAll',
	// 	type: 'boolean',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'task',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// 	default: false,
	// 	description: 'Whether to return all results or only up to a given limit',
	// },
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
				// returnAll: [
				// 	false,
				// ],
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

export const taskFields: INodeProperties[] = [
	...createOperations,
	// ...updateOperations,
	...additionalFields,
	...deleteOperations,
	...getOperations,
	...getAllOperations,
];
