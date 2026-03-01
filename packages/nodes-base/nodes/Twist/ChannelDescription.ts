import type { INodeProperties } from 'n8n-workflow';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a channel',
				action: 'Archive a channel',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Initiates a public or private channel-based conversation',
				action: 'Create a channel',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a channel',
				action: 'Delete a channel',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a channel',
				action: 'Get a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many channels',
				action: 'Get many channels',
			},
			{
				name: 'Unarchive',
				value: 'unarchive',
				description: 'Unarchive a channel',
				action: 'Unarchive a channel',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a channel',
				action: 'Update a channel',
			},
		],
		default: 'create',
	},
];

export const channelFields: INodeProperties[] = [
	/*-------------------------------------------------------------------------- */
	/*                                channel:create                             */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The ID of the workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channel'],
			},
		},
		required: true,
		description: 'The name of the channel',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						name: 'Berry Red',
						value: 6,
					},
					{
						name: 'Blue',
						value: 1,
					},
					{
						name: 'Green',
						value: 4,
					},
					{
						name: 'Grey',
						value: 0,
					},
					{
						name: 'Magenta',
						value: 7,
					},
					{
						name: 'Mint Green',
						value: 9,
					},
					{
						name: 'Red',
						value: 5,
					},
					{
						name: 'Salmon',
						value: 11,
					},
					{
						name: 'Sky Blue',
						value: 8,
					},
					{
						name: 'Teal Blue',
						value: 3,
					},
					{
						name: 'Turquoise',
						value: 2,
					},
					{
						name: 'Yellow',
						value: 10,
					},
				],
				default: 0,
				description: 'The color of the channel',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the channel',
			},
			{
				displayName: 'Public',
				name: 'public',
				type: 'boolean',
				default: false,
				description: 'Whether the channel will be marked as public',
			},

			{
				displayName: 'Temp ID',
				name: 'temp_id',
				type: 'number',
				default: -1,
				description: 'The temporary ID of the channel. It needs to be a negative number.',
			},
			{
				displayName: 'User Names or IDs',
				name: 'user_ids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['workspaceId'],
				},
				default: [],
				description:
					'The users that will participate in the channel. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  channel:get/archive/unarchive/delete      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['archive', 'delete', 'get', 'unarchive'],
				resource: ['channel'],
			},
		},
		required: true,
		description: 'The ID of the channel',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The ID of the workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['channel'],
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
				resource: ['channel'],
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description: 'Whether only archived conversations are returned',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  channel:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['channel'],
			},
		},
		required: true,
		description: 'The ID of the channel',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						name: 'Berry Red',
						value: 6,
					},
					{
						name: 'Blue',
						value: 1,
					},
					{
						name: 'Green',
						value: 4,
					},
					{
						name: 'Grey',
						value: 0,
					},
					{
						name: 'Magenta',
						value: 7,
					},
					{
						name: 'Mint Green',
						value: 9,
					},
					{
						name: 'Red',
						value: 5,
					},
					{
						name: 'Salmon',
						value: 11,
					},
					{
						name: 'Sky Blue',
						value: 8,
					},
					{
						name: 'Teal Blue',
						value: 3,
					},
					{
						name: 'Turquoise',
						value: 2,
					},
					{
						name: 'Yellow',
						value: 10,
					},
				],
				default: 0,
				description: 'The color of the channel',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the channel',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the channel',
			},
			{
				displayName: 'Public',
				name: 'public',
				type: 'boolean',
				default: false,
				description: 'Whether the channel will be marked as public',
			},
		],
	},
];
