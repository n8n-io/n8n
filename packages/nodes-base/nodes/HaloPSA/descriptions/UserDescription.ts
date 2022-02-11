import { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all users',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
			},
		],
		default: 'create',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'userName',
		type: 'string',
		default: '',
		description: 'Enter user name',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Site Name/ID',
		name: 'siteId',
		type: 'options',
		default: '',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSASites',
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'emailaddress',
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
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description:
					'Your new password must be at least 8 characters long and contain at least one letter, one number or symbol, one upper case character and one lower case character',
			},
			{
				displayName: 'Surname',
				name: 'surname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User is Inactive',
				name: 'inactive',
				type: 'boolean',
				default: false,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete', 'get'],
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether output should be simplified',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get', 'getAll'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:getAll                                 */
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
		default: 50,
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Active Status',
				name: 'activeStatus',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'Active only',
						value: 'active',
						description: 'Whether to include active customers in the response',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Whether to include active and inactive customers in the response',
					},
					{
						name: 'Inactive only',
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
				description: 'Filter users by your search string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
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
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'emailaddress',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Enter user name',
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
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description:
					'Your new password must be at least 8 characters long and contain at least one letter, one number or symbol, one upper case character and one lower case character',
			},
			{
				displayName: 'Site ID',
				name: 'site_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getHaloPSASites',
				},
			},
			{
				displayName: 'Surname',
				name: 'surname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User is Inactive',
				name: 'inactive',
				type: 'boolean',
				default: false,
			},
		],
	},
];
