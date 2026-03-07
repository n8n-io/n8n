import type { INodeProperties } from 'n8n-workflow';

export const roleDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['role'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a role',
				action: 'Create a role',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a role',
				action: 'Get a role',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many roles',
				action: 'Get many roles',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a role',
				action: 'Update a role',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Role Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['role'],
			},
		},
	},
	{
		displayName: 'Role ID',
		name: 'id',
		type: 'string',
		description:
			'Role to update. Specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['role'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Role ID',
		name: 'id',
		type: 'string',
		description:
			'Role to retrieve. Specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['role'],
				operation: ['get'],
			},
		},
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['role'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Default at Signup',
				name: 'default_at_signup',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['role'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Role Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Default at Signup',
				name: 'default_at_signup',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['role'],
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
				resource: ['role'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
