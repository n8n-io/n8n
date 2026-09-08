import type { INodeProperties } from 'n8n-workflow';

export const siteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['site'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a site',
				action: 'Create a site',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a site',
				action: 'Delete a site',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a site',
				action: 'Get a site',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many sites',
				action: 'Get many sites',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a site',
				action: 'Update a site',
			},
		],
		default: 'create',
	},
];

export const siteFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                site:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'siteName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
		description: 'Enter site name',
	},
	{
		displayName: 'Select client by ID',
		name: 'selectOption',
		type: 'boolean',
		default: false,
		description: 'Whether client can be selected by ID',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
				selectOption: [true],
			},
		},
	},
	{
		displayName: 'Client name or ID',
		name: 'clientId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSAClients',
		},
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
				selectOption: [false],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Main contact',
				name: 'maincontact_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone number',
				name: 'phonenumber',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['delete', 'get'],
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
				resource: ['site'],
				operation: ['get', 'getAll'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['site'],
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
				resource: ['site'],
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
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Active status',
				name: 'activeStatus',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'Active only',
						value: 'active',
						description: 'Whether to include active sites in the response',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Whether to include active and inactive sites in the response',
					},
					{
						name: 'Inactive only',
						value: 'inactive',
						description: 'Whether to include inactive sites in the response',
					},
				],
			},
			{
				displayName: 'Text to filter by',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Filter sites by your search string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['site'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Client ID',
				name: 'client_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Main contact',
				name: 'maincontact_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Enter site name',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone number',
				name: 'phonenumber',
				type: 'string',
				default: '',
			},
		],
	},
];
