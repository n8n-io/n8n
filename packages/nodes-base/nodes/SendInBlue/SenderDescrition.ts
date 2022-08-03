import { IExecuteSingleFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const senderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sender'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a sender',
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v3/senders/{{$parameter.id}}',
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
				action: 'Delete a sender',
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/v3/senders',
					},
					send: {
						paginate: false,
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'senders',
								},
							},
						],
					},
				},
				action: 'Get all senders',
			},
		],
		default: 'create',
	},
];

const senderCreateOperation: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['sender'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				method: 'POST',
				url: '/v3/senders',
			},
			send: {
				property: 'name',
				type: 'body',
			},
		},
		required: true,
		description: 'Name of the sender',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: {
			show: {
				resource: ['sender'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				property: 'email',
				type: 'body',
			},
		},
		required: true,
		description: 'Email of the sender',
	},
];

const senderDeleteOperation: INodeProperties[] = [
	{
		displayName: 'Sender ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['sender'],
				operation: ['delete'],
			},
		},
		description: 'ID of the sender to delete',
	},
];

const senderGetAllOperation: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['sender'],
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
				resource: ['sender'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'limit',
						properties: {
							maxResults: '={{$value}}',
						},
					},
				],
			},
		},
		default: 10,
		description: 'Max number of results to return',
	},
];

export const senderFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                sender:create                               */
	/* -------------------------------------------------------------------------- */
	...senderCreateOperation,

	/* -------------------------------------------------------------------------- */
	/*                                sender:delete                               */
	/* -------------------------------------------------------------------------- */
	...senderDeleteOperation,

	/* -------------------------------------------------------------------------- */
	/*                                sender:getAll                               */
	/* -------------------------------------------------------------------------- */
	...senderGetAllOperation,
];
