import { INodeProperties } from 'n8n-workflow';

export const senderOperations: Array<INodeProperties> = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'sender',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
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
							}
						],
					},
				}
			},
		],
		default: 'create',
	}
];

const senderCreateOperation: Array<INodeProperties> = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'sender',
				],
				operation: [
					'create',
				],
			},
		},
		routing: {
			request: {
				method: 'POST',
				url: '/v3/senders',
			},
			send: {
				property: 'name',
				type: 'body'
			},
		},
		description: 'Name of the sender',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'sender',
				],
				operation: [
					'create',
				],
			},
		},
		routing: {
			send: {
				property: 'email',
				type: 'body',
			},
		},
		description: 'Email of the sender',
	},
];

const senderDeleteOperation: Array<INodeProperties> = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'sender',
				],
				operation: [
					'delete',
				],
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '=/v3/senders/{{$value}}',
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
		description: 'ID of the sender to delete',
	}
];

export const senderFields: Array<INodeProperties> = [
	/* -------------------------------------------------------------------------- */
	/*                                sender:create                               */
	/* -------------------------------------------------------------------------- */
		...senderCreateOperation,

	/* -------------------------------------------------------------------------- */
	/*                                sender:delete                               */
	/* -------------------------------------------------------------------------- */
		...senderDeleteOperation
];
