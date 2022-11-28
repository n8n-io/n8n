import { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Search User',
				value: 'searchuser',
				description: 'Search user by username',
				action: 'Search user by username',
			},
		],
		default: 'searchuser',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:searchuser                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['searchuser'],
			},
		},
		description: 'The username of the user you want to search',
	},
];
