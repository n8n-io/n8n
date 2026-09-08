import type { INodeProperties } from 'n8n-workflow';

export const feedOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['feed'],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a feed',
			},
			{
				name: 'Disable',
				value: 'disable',
				action: 'Disable a feed',
			},
			{
				name: 'Enable',
				value: 'enable',
				action: 'Enable a feed',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a feed',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many feeds',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a feed',
			},
		],
		default: 'create',
	},
];

export const feedFields: INodeProperties[] = [
	// ----------------------------------------
	//               feed: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		placeholder: 'https://example.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Distribution',
				name: 'distribution',
				type: 'options',
				default: 0,
				description: 'Who will be able to see this event once published',
				options: [
					{
						name: 'All communities',
						value: 3,
					},
					{
						name: 'Connected communities',
						value: 2,
					},
					{
						name: 'Inherit event',
						value: 5,
					},
					{
						name: 'Sharing group',
						value: 4,
					},
					{
						name: 'This community only',
						value: 1,
					},
					{
						name: 'Your organization only',
						value: 0,
					},
				],
			},
			{
				displayName: 'Rules',
				name: 'json',
				type: 'string',
				default: '',
				description: 'Filter rules for the feed',
			},
		],
	},

	// ----------------------------------------
	//              feed: disable
	// ----------------------------------------
	{
		displayName: 'Feed ID',
		name: 'feedId',
		description: 'UUID or numeric ID of the feed',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['disable'],
			},
		},
	},

	// ----------------------------------------
	//               feed: enable
	// ----------------------------------------
	{
		displayName: 'Feed ID',
		name: 'feedId',
		description: 'UUID or numeric ID of the feed',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['enable'],
			},
		},
	},

	// ----------------------------------------
	//                feed: get
	// ----------------------------------------
	{
		displayName: 'Feed ID',
		name: 'feedId',
		description: 'UUID or numeric ID of the feed',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['feed'],
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
				resource: ['feed'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//               feed: update
	// ----------------------------------------
	{
		displayName: 'Feed ID',
		name: 'feedId',
		description: 'ID of the feed to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Distribution',
				name: 'distribution',
				type: 'options',
				default: 0,
				description: 'Who will be able to see this event once published',
				options: [
					{
						name: 'All communities',
						value: 3,
					},
					{
						name: 'Connected communities',
						value: 2,
					},
					{
						name: 'Inherit event',
						value: 5,
					},
					{
						name: 'Sharing group',
						value: 4,
					},
					{
						name: 'This community only',
						value: 1,
					},
					{
						name: 'Your organization only',
						value: 0,
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
				displayName: 'Provider',
				name: 'provider',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Rules',
				name: 'rules',
				type: 'json',
				default: '',
				description: 'Filter rules for the feed',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
			},
		],
	},
];
