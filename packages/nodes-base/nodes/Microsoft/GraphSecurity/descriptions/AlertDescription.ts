import {
	INodeProperties,
} from 'n8n-workflow';

export const alertOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'get',
	},
];

export const alertFields: INodeProperties[] = [
	// ----------------------------------------
	//                alert: get
	// ----------------------------------------
	{
		displayName: 'Alert ID',
		name: 'alertId',
		description: 'ID of the alert to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              alert: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'alert',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fields to Return',
				name: '$select',
				description: 'Comma-separated list of fields to return in the response',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter Expression',
				name: '$filter',
				description: '<a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">Expression</a> to filter results by, e.g. <code>startswith(id,\'AATP\')</code>',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Sort Options',
				name: 'sortOptions',
				values: [
					{
						displayName: 'Sort Field',
						name: 'sortField',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Sort Direction',
						name: 'sortDirection',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'asc',
							},
							{
								name: 'Descending',
								value: 'desc',
							},
						],
						default: 'asc',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//              alert: update
	// ----------------------------------------
	{
		displayName: 'Alert ID',
		name: 'alertId',
		description: 'ID of the alert to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Vendor',
		name: 'vendor',
		type: 'string',
		description: 'Name of the security product vendor',
		placeholder: 'e.g. Microsoft, Dell, FireEye',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'string',
		description: 'Name of the security product provider',
		placeholder: 'e.g. SecureScore, Azure Security Center',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'update',
				],
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
				resource: [
					'alert',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'string',
				default: '',
				description: 'Name of the analyst who the alert is assigned to for triage, investigation, or remediation',
			},
			{
				displayName: 'Closing Comments',
				name: 'comments',
				type: 'multiOptions',
				default: [],
				description: 'Analyst comments on how the alert was closed, for customer alert management',
				options: [
					{
						name: 'Closed in Identity Protection (IPC)',
						value: 'Closed in IPC',
					},
					{
						name: 'Closed in Cloud App Security (MCAS)',
						value: 'Closed in MCAS',
					},
				],
			},
			{
				displayName: 'Closing Date & Time',
				name: 'closedDateTime',
				type: 'dateTime',
				default: '',
				description: 'Timestamp at which the alert was closed, using ISO 8601 format and in UTC. For example, midnight UTC on Jan 1, 2014 is <code>2014-01-01T00:00:00Z</code>',
			},
			{
				displayName: 'Feedback',
				name: 'feedback',
				type: 'options',
				default: 'unknown',
				description: 'Analyst feedback on the alert',
				options: [
					{
						name: 'Unknown',
						value: 'unknown',
					},
					{
						name: 'True Positive',
						value: 'truePositive',
					},
					{
						name: 'False Positive',
						value: 'falsePositive',
					},
					{
						name: 'Benign Positive',
						value: 'benignPositive',
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'unknown',
				description: 'Alert lifecycle status (stage)',
				options: [
					{
						name: 'Unknown',
						value: 'unknown',
					},
					{
						name: 'New Alert',
						value: 'newAlert',
					},
					{
						name: 'In Progress',
						value: 'inProgress',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'User-definable labels that can be applied to an alert and can serve as filter conditions. For example: "HVA", "SAW".',
			},
		],
	},
];
