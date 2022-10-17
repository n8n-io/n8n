import { INodeProperties } from 'n8n-workflow';

export const clientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['client'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a client',
				action: 'Create a client',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a client',
				action: 'Delete a client',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a client',
				action: 'Get a client',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many clients',
				action: 'Get many clients',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a client',
				action: 'Update a client',
			},
		],
		default: 'create',
	},
];

export const clientFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                client:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'clientName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
		description: 'Enter client name',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
		options: [
			{
				displayName: 'Account Status',
				name: 'inactive',
				type: 'options',
				default: false,
				options: [
					{
						name: 'Active',
						value: false,
					},
					{
						name: 'Inactive',
						value: true,
					},
				],
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'VIP',
				name: 'is_vip',
				type: 'boolean',
				default: false,
				description: 'Whether the client is VIP or not',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                client:delete                               */
	/* -------------------------------------------------------------------------- */
	// {
	// 	displayName: 'Reasign tickets before deleting',
	// 	name: 'reasign',
	// 	type: 'boolean',
	// 	default: false,
	// 	description: 'Whether tickets assigned to client sould be reasigned',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'client',
	// 			],
	// 			operation: [
	// 				'delete',
	// 			],
	// 		},
	// 	},
	// },

	// {
	// 	displayName: 'Client ID For Reasigment',
	// 	name: 'reasigmentCliendId',
	// 	type: 'string',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'client',
	// 			],
	// 			operation: [
	// 				'delete',
	// 			],
	// 			reasign: [
	// 				true
	// 			]
	// 		},
	// 	},
	// },

	/* -------------------------------------------------------------------------- */
	/*                                client:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['client'],
				operation: ['get', 'delete'],
			},
		},
	},

	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				resource: ['client'],
				operation: ['get', 'getAll'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                client:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['client'],
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
		default: 50,
		displayOptions: {
			show: {
				resource: ['client'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['client'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Active Status',
				name: 'activeStatus',
				type: 'options',
				default: 'active',
				options: [
					{
						name: 'Active Only',
						value: 'active',
						description: 'Whether to include active customers in the response',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Whether to include active and inactive customers in the response',
					},
					{
						name: 'Inactive Only',
						value: 'inactive',
						description: 'Whether to include inactive Customers in the response',
					},
				],
			},
			{
				displayName: 'Text To Filter By',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Filter clients by your search string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                client:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['client'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['client'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Account Status',
				name: 'inactive',
				type: 'options',
				default: false,
				options: [
					{
						name: 'Active',
						value: false,
					},
					{
						name: 'Inactive',
						value: true,
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'VIP',
				name: 'is_vip',
				type: 'boolean',
				default: false,
				description: 'Whether the client is VIP or not',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},
];
