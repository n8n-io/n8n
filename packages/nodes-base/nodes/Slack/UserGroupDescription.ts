import {
	INodeProperties,
} from 'n8n-workflow';

export const userGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'userGroup',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user group',
			},
			{
				name: 'Disable',
				value: 'disable',
				description: 'Disable a user group',
			},
			{
				name: 'Enable',
				value: 'enable',
				description: 'Enable a user group',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all user groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user group',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
				operation: [
					'create',
				],
				resource: [
					'userGroup',
				],
			},
		},
		required: true,
		description: 'A name for the User Group. Must be unique among User Groups.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userGroup',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Channel IDs',
				name: 'channelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: [],
				description: 'A comma separated string of encoded channel IDs for which the User Group uses as a default.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A short description of the User Group.',
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
				description: 'Include the number of users in each User Group.',
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
				operation: [
					'disable',
				],
				resource: [
					'userGroup',
				],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userGroup',
				],
				operation: [
					'disable',
				],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Include the number of users in each User Group.',
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
				operation: [
					'enable',
				],
				resource: [
					'userGroup',
				],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userGroup',
				],
				operation: [
					'enable',
				],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Include the number of users in each User Group.',
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
				operation: [
					'getAll',
				],
				resource: [
					'userGroup',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'userGroup',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userGroup',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include Count',
				name: 'include_count',
				type: 'boolean',
				default: true,
				description: 'Include the number of users in each User Group.',
			},
			{
				displayName: 'Include Disabled',
				name: 'include_disabled',
				type: 'boolean',
				default: true,
				description: 'Include disabled User Groups.',
			},
			{
				displayName: 'Include Users',
				name: 'include_users',
				type: 'boolean',
				default: true,
				description: 'Include the list of users for each User Group.',
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
				operation: [
					'update',
				],
				resource: [
					'userGroup',
				],
			},
		},
		required: true,
		description: 'The encoded ID of the User Group to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userGroup',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Channel IDs',
				name: 'channels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: [],
				description: 'A comma separated string of encoded channel IDs for which the User Group uses as a default.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A short description of the User Group.',
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
				description: 'Include the number of users in each User Group.',
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
];