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
				name: 'Create',
				value: 'create',
				description: 'Create a user',
				action: 'Create a user',
			},
			// {
			// 	name: 'Delete',
			// 	value: 'delete',
			// 	description: 'Delete a user',
			// },
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user',
				action: 'Get a user',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all users',
				action: 'Get all users',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update a user',
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
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Login name for the user',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Display name for the user',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'First name for the user',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Last name for the user',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'The email address for the user',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Password for the user (never included)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of the user',
			},
			{
				displayName: 'Description',
				name: 'description',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				type: 'string',
				default: '',
				description: 'Description of the user',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
				description: 'The nickname for the user',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'An alphanumeric identifier for the user',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		description: 'Unique identifier for the user',
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
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Login name for the user',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Display name for the user',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name for the user',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name for the user',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address for the user',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'Password for the user (never included)',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of the user',
			},
			{
				displayName: 'Description',
				name: 'description',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				type: 'string',
				default: '',
				description: 'Description of the user',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
				description: 'The nickname for the user',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'An alphanumeric identifier for the user',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the user',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				options: [
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Embed',
						value: 'embed',
					},
					{
						name: 'Edit',
						value: 'edit',
					},
				],
				default: 'view',
				description: 'Scope under which the request is made; determines fields present in response',
			},
		],
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
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				options: [
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Embed',
						value: 'embed',
					},
					{
						name: 'Edit',
						value: 'edit',
					},
				],
				default: 'view',
				description: 'Scope under which the request is made; determines fields present in response',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Include',
						value: 'include',
					},
					{
						name: 'Include Slugs',
						value: 'include_slugs',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Registered Date',
						value: 'registered_date',
					},
					{
						name: 'Slug',
						value: 'slug',
					},
					{
						name: 'URL',
						value: 'url',
					},
				],
				default: 'id',
				description: 'Sort collection by object attribute',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Order sort attribute ascending or descending',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Limit results to those matching a string',
			},
			{
				displayName: 'Who',
				name: 'who',
				type: 'options',
				options: [
					{
						name: 'Authors',
						value: 'authors',
					},
				],
				default: 'authors',
				description: 'Limit result set to users who are considered authors',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Reassign',
		name: 'reassign',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
		description: "Reassign the deleted user's posts and links to this user ID",
	},
];
