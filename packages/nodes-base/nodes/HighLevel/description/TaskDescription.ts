import {
	INodeProperties
} from 'n8n-workflow';

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
	// ...createOperations,
	// ...updateOperations,
	// ...deleteOperations,
	// ...getOperations,
	...getAllOperations,
	// ...lookupOperations,
];
