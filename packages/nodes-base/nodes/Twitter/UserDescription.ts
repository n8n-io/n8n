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
		displayName: 'User',
		name: 'user',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		description: 'The user you want to search',
		displayOptions: {
			show: {
				operation: ['searchuser'],
				resource: ['user'],
			},
		},
		modes: [
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [],
				placeholder: '',
				url: '',
			},
			{
				displayName: 'By Username',
				name: 'username',
				type: 'string',
				validation: [],
				placeholder: 'e.g. @n8n',
				url: '',
			},
		],
	},
];
