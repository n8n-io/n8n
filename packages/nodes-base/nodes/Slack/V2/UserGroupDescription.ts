import type { INodeProperties } from 'n8n-workflow';

export const userGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['userGroup'],
			},
		},
		options: [
			{
				name: 'Add Users',
				value: 'updateUsers',
				action: 'Add users to a user group',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a user group',
			},
			{
				name: 'Disable',
				value: 'disable',
				action: 'Disable a user group',
			},
			{
				name: 'Enable',
				value: 'enable',
				action: 'Enable a user group',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many user groups',
			},
			{
				name: 'Get Users',
				value: 'getUsers',
				action: 'Get users from a user group',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a user group',
			},
		],
		default: 'create',
	},
];

export const userGroupFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                userGroup:create                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description: 'A name for the User Group. Must be unique among User Groups.',
	},
	{
		displayName: 'Options',
		name: 'Options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Channel Names or IDs',
				name: 'channelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: [],
				description:
					'A comma-separated string of encoded channel IDs for which the User Group uses as a default. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A short description of the User Group',
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: 'A mention handle. Must be unique among channels, users and User Groups.',
			},
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Whether to include the number of users in each User Group',
			},
		],
	},
	/* ----------------------------------------------------------------------- */
	/*                                 userGroup:disable                       */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'User Group ID',
		name: 'userGroupId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['disable'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['disable'],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Whether to include the number of users in each User Group',
			},
		],
	},
	/* ----------------------------------------------------------------------- */
	/*                                 userGroup:enable                        */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'User Group ID',
		name: 'userGroupId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['enable'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update',
	},
	{
		displayName: 'Options',
		name: 'option',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['enable'],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Whether to include the number of users in each User Group',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                userGroup:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['userGroup'],
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
				operation: ['getAll'],
				resource: ['userGroup'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Whether to include the number of users in each User Group',
			},
			{
				displayName: 'Include Disabled',
				name: 'include_disabled',
				type: 'boolean',
				default: true,
				description: 'Whether to include disabled User Groups',
			},
			{
				displayName: 'Include Users',
				name: 'include_users',
				type: 'boolean',
				default: true,
				description: 'Whether to include the list of users for each User Group',
			},
		],
	},
	/* ----------------------------------------------------------------------- */
	/*                                 userGroup:update                        */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'User Group ID',
		name: 'userGroupId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Channel Names or IDs',
				name: 'channels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: [],
				description:
					'A comma-separated string of encoded channel IDs for which the User Group uses as a default. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A short description of the User Group',
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: 'A mention handle. Must be unique among channels, users and User Groups.',
			},
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Whether to include the number of users in each User Group',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'A name for the User Group. Must be unique among User Groups.',
			},
		],
	},
	/* ----------------------------------------------------------------------- */
	/*                              userGroup:updateUsers                      */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'User Group ID',
		name: 'userGroupId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['updateUsers'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update',
	},
	{
		displayName: 'User Names or IDs',
		name: 'users',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: [],
		displayOptions: {
			show: {
				operation: ['updateUsers'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description:
			'Users to add to the User Group. Existing users will be preserved. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['updateUsers'],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Whether to include the number of users in the User Group',
			},
		],
	},
	/* ----------------------------------------------------------------------- */
	/*                              userGroup:getUsers                         */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'User Group ID',
		name: 'userGroupId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['getUsers'],
				resource: ['userGroup'],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['userGroup'],
				operation: ['getUsers'],
			},
		},
		options: [
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				description: 'Whether to return full user objects instead of just user IDs',
			},
		],
	},
];
