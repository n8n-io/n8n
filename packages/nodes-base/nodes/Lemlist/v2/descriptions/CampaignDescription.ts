import type { INodeProperties } from 'n8n-workflow';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new campaign',
				action: 'Create a campaign',
			},
			{
				name: 'Export Leads',
				value: 'exportLeads',
				description: 'Export leads from a campaign',
				action: 'Export leads from a campaign',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific campaign',
				action: 'Get a campaign',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many campaigns',
				action: 'Get many campaigns',
			},
			{
				name: 'Get Reports',
				value: 'getReports',
				description: 'Get aggregated reports for campaigns',
				action: 'Get campaign reports',
			},
			{
				name: 'Get Stats',
				value: 'getStats',
				description: 'Get campaign statistics',
				action: 'Get campaign stats',
			},
			{
				name: 'Pause',
				value: 'pause',
				description: 'Pause a running campaign',
				action: 'Pause a campaign',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a campaign',
				action: 'Update a campaign',
			},
		],
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
	},
];

export const campaignFields: INodeProperties[] = [
	// ----------------------------------
	//        campaign: create
	// ----------------------------------
	{
		displayName: 'Campaign Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the campaign to create',
		displayOptions: {
			show: {
				resource: ['campaign'],
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
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'string',
				default: '',
				description: 'Comma-separated list of labels to add to the campaign',
			},
		],
	},

	// ----------------------------------
	//        campaign: get
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//        campaign: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: 'v2',
			},
		],
	},

	// ----------------------------------
	//        campaign: getStats
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to get stats for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getStats'],
			},
		},
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		required: true,
		placeholder: 'e.g. 2024-09-03 00:00:00Z',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getStats'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		default: '',
		placeholder: 'e.g. 2024-09-03 00:00:00Z',
		required: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getStats'],
			},
		},
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Europe/Paris',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getStats'],
			},
		},
	},

	// ----------------------------------
	//        campaign: getReports
	// ----------------------------------
	{
		displayName: 'Campaign Names or IDs',
		name: 'campaignIds',
		type: 'multiOptions',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'IDs of the campaigns to get reports for. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getReports'],
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
				resource: ['campaign'],
				operation: ['getReports'],
			},
		},
		options: [
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Start date for the report period',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'End date for the report period',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'e.g. Europe/Paris',
				description: 'Timezone for the report dates',
			},
		],
	},

	// ----------------------------------
	//        campaign: update
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
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
				resource: ['campaign'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name for the campaign',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'string',
				default: '',
				description: 'Comma-separated list of labels',
			},
		],
	},

	// ----------------------------------
	//        campaign: pause
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to pause. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['pause'],
			},
		},
	},

	// ----------------------------------
	//        campaign: exportLeads
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to export leads from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['exportLeads'],
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
				resource: ['campaign'],
				operation: ['exportLeads'],
			},
		},
		options: [
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: '',
				description: 'Filter leads by state',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Interested',
						value: 'interested',
					},
					{
						name: 'Not Interested',
						value: 'notInterested',
					},
					{
						name: 'Paused',
						value: 'paused',
					},
				],
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				default: 100,
				description: 'Number of leads per page',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number to retrieve',
			},
		],
	},
];
