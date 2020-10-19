import {
	INodeProperties,
} from 'n8n-workflow';

export const reportsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'reports',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'batchGet',
				description: 'Returns the Analytics data',
			},
		],
		default: 'batchGet',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const reportsFields = [
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'reports',
				],
				operation: [
					'batchGet',
				]
			},
		},
		placeholder: '123456',
		description: 'The View ID of Google Analytics',
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
					'reports',
				],
				operation: [
					'batchGet',
				]
			},
		},
		options: [
			{
				displayName: 'Date Ranges',
				name: 'dateRangesUi',
				placeholder:'Add Date Range',
				type: 'fixedCollection',
				default: {},
				description: 'Date ranges in the request',
				options: [
					{
						displayName: 'Date Range',
						name: 'dateRanges',
						values:[
							{
								displayName: 'Start Date',
								name: 'startDate',
								type: 'dateTime',
								default:'',
								description: 'Start date'
							},
							{
								displayName: 'End Date',
								name: 'endDate',
								type: 'dateTime',
								default:'',
								description: 'End date'
							}
						]
					}
				]
			},
			{
				displayName: 'Dimension Name',
				name: 'dimensionName',
				type: 'string',
				default: '',
				description: 'Name of the dimension to fetch',
			},
			{
				displayName: 'Hide Totals',
				name: 'hideTotals',
				type: 'boolean',
				default: false,
				description: 'If set to true, hides the total of all metrics for all the matching rows, for every date range.',
			},
			{
				displayName: 'Hide Value Ranges',
				name: 'hideValueRanges',
				type: 'boolean',
				default: false,
				description: 'If set to true, hides the minimum and maximum across all matching rows.',
			},
			{
				displayName: 'Include Empty Rows',
				name: 'includeEmptyRows',
				type: 'boolean',
				default: false,
				description: 'If set to false, the response exclude rows if all the retrieved metrics are equal to zero.',
			},
			{
				displayName: 'Metrics',
				name: 'metrics',
				type: 'collection',
				default: {},
				placeholder:'Add Metrics',
				description: 'Metrics in the request',
				options: [
					{
						displayName: 'Expression',
						name: 'expression',
						type: 'string',
						default:'ga:users',
						description: 'A metric expression'
					},
					{
						displayName: 'Formatting Type',
						name: 'formattingType',
						type: 'options',
						default:'INTEGER',
						description: 'Specifies how the metric expression should be formatted',
						options: [
							{
								name: 'Currency',
								value:'CURRENCY'
							},
							{
								name: 'Float',
								value:'FLOAT'
							},
							{
								name: 'Integer',
								value:'INTEGER'
							},
							{
								name: 'Percent',
								value:'PERCENT'
							},
							{
								name: 'Time',
								value:'TIME'
							}
						]
					}
				]
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 50,
				description: 'Page size is for paging and specifies the maximum number of returned rows.',
			},
			{
				displayName: 'Use Resource Quotas',
				name: 'useResourceQuotas',
				type: 'boolean',
				default: false,
				description: 'Enables resource based quotas',
			},
		]
	}
] as INodeProperties[];