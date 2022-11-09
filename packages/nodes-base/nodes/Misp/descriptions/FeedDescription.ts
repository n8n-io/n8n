import { INodeProperties } from 'n8n-workflow';

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
				name: 'Get Many',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
						name: 'All Communities',
						value: 3,
					},
					{
						name: 'Connected Communities',
						value: 2,
					},
					{
						name: 'Inherit Event',
						value: 5,
					},
					{
						name: 'Sharing Group',
						value: 4,
					},
					{
						name: 'This Community Only',
						value: 1,
					},
					{
						name: 'Your Organization Only',
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
		displayName: 'Return All',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
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
						name: 'All Communities',
						value: 3,
					},
					{
						name: 'Connected Communities',
						value: 2,
					},
					{
						name: 'Inherit Event',
						value: 5,
					},
					{
						name: 'Sharing Group',
						value: 4,
					},
					{
						name: 'This Community Only',
						value: 1,
					},
					{
						name: 'Your Organization Only',
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
