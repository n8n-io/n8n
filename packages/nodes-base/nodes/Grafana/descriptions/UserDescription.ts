import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user from the current organization',
				action: 'Delete a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many users in the current organization',
				action: 'Get many users',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user in the current organization',
				action: 'Update a user',
			},
		],
		default: 'getAll',
	},
];

export const userFields: INodeProperties[] = [
	// ----------------------------------------
	//              user: update
	// ----------------------------------------
	{
		displayName: 'User ID',
		name: 'userId',
		description: 'ID of the user to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				default: 'Admin',
				description: 'New role for the user',
				options: [
					{
						name: 'Admin',
						value: 'Admin',
					},
					{
						name: 'Editor',
						value: 'Editor',
					},
					{
						name: 'Viewer',
						value: 'Viewer',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//                user: delete
	// ----------------------------------------
	{
		displayName: 'User ID',
		name: 'userId',
		description: 'ID of the user to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//              user: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
