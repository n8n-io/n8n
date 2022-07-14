import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
	},
];

export const userFields: INodeProperties[] = [
	// ----------------------------------
	//          user: get
	// ----------------------------------
	{
		displayName: 'Self',
		name: 'self',
		type: 'boolean',
		default: true,
		required: true,
		description: 'Whether to return details on the logged-in user',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the user to retrieve',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
				self: [
					false,
				],
			},
		},
	},
];
