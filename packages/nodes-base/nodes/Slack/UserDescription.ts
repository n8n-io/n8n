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
				name: 'Info',
				value: 'info',
				description: 'Get information about a user',
				action: 'Get information about a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get a list of many users',
				action: 'Get many users',
			},
			{
				name: 'Get Presence',
				value: 'getPresence',
				description: 'Get online status of a user',
				action: "Get a user's presence status",
			},
		],
		default: 'info',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:info                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'user',
		type: 'string',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['info'],
				resource: ['user'],
			},
		},
		required: true,
		description: 'The ID of the user to get information about',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:getPresence                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'user',
		type: 'string',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['getPresence'],
				resource: ['user'],
			},
		},
		required: true,
		description: 'The ID of the user to get the online status of',
	},
];
