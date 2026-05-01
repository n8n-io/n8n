import type { INodeProperties } from 'n8n-workflow';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new group',
				action: 'Create a group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a group',
				action: 'Delete a group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a group by ID',
				action: 'Get a group',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a paginated list of groups',
				action: 'Get many groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing group',
				action: 'Update a group',
			},
		],
		default: 'getAll',
	},
];

export const groupFields: INodeProperties[] = [
	// getAll
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	// create / update
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Delete Contacts',
		name: 'delete_contacts',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['delete'],
			},
		},
		description: 'Whether to also delete contacts that belong to this group',
	},
];
