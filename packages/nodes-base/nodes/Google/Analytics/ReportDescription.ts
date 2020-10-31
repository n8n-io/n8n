import {
	INodeProperties,
} from 'n8n-workflow';

export const reportOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Return the analytics data',
			},
		],
		default: 'getAll',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const reportFields = [
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'getAll',
				]
			},
		},
		placeholder: '123456',
		description: 'The View ID of Google Analytics',
	},
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
					'report',
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
					'report',
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
					'report',
				],
				operation: [
					'getAll',
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
				displayName: 'Use Resource Quotas',
				name: 'useResourceQuotas',
				type: 'boolean',
				default: false,
				description: 'Enables resource based quotas',
			},
		]
	}
] as INodeProperties[];