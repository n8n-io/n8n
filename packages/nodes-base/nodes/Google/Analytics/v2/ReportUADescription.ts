import { INodeProperties } from 'n8n-workflow';

import { defaultEndDate, defaultStartDate } from '../GenericFunctions';

export const reportUAFields: INodeProperties[] = [
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getViews',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
			},
		},
		placeholder: '123456',
		description:
			'The View ID of Google Analytics. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Date Range',
		name: 'dateRange',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Today',
				value: 'today',
			},
			{
				name: 'Yesterday',
				value: 'yesterday',
			},
			{
				name: 'Last Calendar Week',
				value: 'lastCalendarWeek',
			},
			{
				name: 'Last Calendar Month',
				value: 'lastCalendarMonth',
			},
			{
				name: 'Last 7 Days',
				value: 'last7days',
			},
			{
				name: 'Last 30 Days',
				value: 'last30days',
			},
			{
				name: 'Custom',
				value: 'custom',
			},
		],
		default: 'today',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
			},
		},
	},
	{
		displayName: 'Start',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: defaultStartDate(),
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
				dateRange: ['custom'],
			},
		},
	},
	{
		displayName: 'End',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: defaultEndDate(),
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
				dateRange: ['custom'],
			},
		},
	},
	{
		displayName: 'Metrics',
		name: 'metricsUA',
		type: 'fixedCollection',
		// default: {},
		default: { metricValues: [{ listName: 'ga:sessions' }] },
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Metrics',
		description: 'Metrics in the request',
		options: [
			{
				displayName: 'Metric',
				name: 'metricValues',
				values: [
					{
						displayName: 'Metric',
						name: 'listName',
						type: 'options',
						default: 'ga:sessions',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'Checkouts',
								value: 'ga:productCheckouts',
							},
							{
								name: 'Number of Sessions per User',
								value: 'ga:sessionsPerUser',
							},
							{
								name: 'Page Views',
								value: 'ga:pageviews',
							},
							{
								name: 'Session Duration',
								value: 'ga:sessionDuration',
							},
							{
								name: 'Sessions',
								value: 'ga:sessions',
							},
							{
								name: 'Total Events',
								value: 'ga:totalEvents',
							},
							{
								name: 'Total Users',
								value: 'ga:users',
							},
							{
								name: 'More…',
								value: 'more',
							},
						],
					},
					{
						displayName: 'Name or ID',
						name: 'name',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getMetrics',
						},
						default: 'ga:newUsers',
						description:
							'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						displayOptions: {
							show: {
								listName: ['more'],
							},
						},
					},
					{
						displayName: 'Expression',
						name: 'expression',
						type: 'string',
						default: '',
						placeholder: 'e.g. ga:totalRefunds/ga:users',
						description:
							'Learn more about Google Analytics <a href="https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet#Metric">metric expressions</a>',
						displayOptions: {
							show: {
								listName: ['more'],
							},
						},
					},
					{
						displayName: 'Formatting Type',
						name: 'formattingType',
						type: 'options',
						default: 'INTEGER',
						description: 'Specifies how the metric expression should be formatted',
						options: [
							{
								name: 'Currency',
								value: 'CURRENCY',
							},
							{
								name: 'Float',
								value: 'FLOAT',
							},
							{
								name: 'Integer',
								value: 'INTEGER',
							},
							{
								name: 'Percent',
								value: 'PERCENT',
							},
							{
								name: 'Time',
								value: 'TIME',
							},
						],
						displayOptions: {
							show: {
								listName: ['more'],
							},
						},
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
			},
		},
	},
	{
		displayName: 'Dimensions',
		name: 'dimensionsUA',
		type: 'fixedCollection',
		default: { dimensionValues: [{ listName: 'ga:deviceCategory' }] },
		// default: {},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Dimension',
		description:
			'Dimensions are attributes of your data. For example, the dimension ga:city indicates the city, for example, "Paris" or "New York", from which a session originates.',
		options: [
			{
				displayName: 'Values',
				name: 'dimensionValues',
				values: [
					{
						displayName: 'Dimension',
						name: 'listName',
						type: 'options',
						default: 'ga:deviceCategory',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'Browser',
								value: 'ga:browser',
							},
							{
								name: 'Campaign',
								value: 'ga:campaign',
							},
							{
								name: 'City',
								value: 'ga:city',
							},
							{
								name: 'Country',
								value: 'ga:country',
							},
							{
								name: 'Date',
								value: 'ga:date',
							},
							{
								name: 'Device Category',
								value: 'ga:deviceCategory',
							},
							{
								name: 'Item Name',
								value: 'ga:productName',
							},
							{
								name: 'Language',
								value: 'ga:language',
							},
							{
								name: 'Page',
								value: 'ga:pagePath',
							},
							{
								name: 'Source / Medium',
								value: 'ga:sourceMedium',
							},
							{
								name: 'More…',
								value: 'more',
							},
						],
					},
					{
						displayName: 'Name or ID',
						name: 'name',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDimensions',
						},
						default: '',
						description:
							'Name of the dimension to fetch, for example ga:browser. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						displayOptions: {
							show: {
								listName: ['more'],
							},
						},
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['report'],
				accessDataFor: ['universal'],
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
				operation: ['get'],
				resource: ['report'],
				accessDataFor: ['universal'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['report'],
				accessDataFor: ['universal'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['universal'],
			},
		},
		options: [
			{
				displayName: 'Dimension Filters',
				name: 'dimensionFiltersUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Dimension Filter',
				description: 'Dimension Filters in the request',
				options: [
					{
						displayName: 'Filters',
						name: 'filterValues',
						values: [
							{
								displayName: 'Dimension Name or ID',
								name: 'dimensionName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDimensions',
								},
								default: '',
								description:
									'Name of the dimension to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							// https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet#Operator
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'EXACT',
								description: 'Operator to use in combination with value',
								options: [
									{
										name: 'Begins With',
										value: 'BEGINS_WITH',
									},
									{
										name: 'Ends With',
										value: 'ENDS_WITH',
									},
									{
										name: 'Equals (Number)',
										value: 'NUMERIC_EQUAL',
									},
									{
										name: 'Exactly Matches',
										value: 'EXACT',
									},
									{
										name: 'Greater Than (Number)',
										value: 'NUMERIC_GREATER_THAN',
									},
									{
										name: 'Less Than (Number)',
										value: 'NUMERIC_LESS_THAN',
									},
									{
										name: 'Partly Matches',
										value: 'PARTIAL',
									},
									{
										name: 'Regular Expression',
										value: 'REGEXP',
									},
								],
							},
							{
								displayName: 'Value',
								name: 'expressions',
								type: 'string',
								default: '',
								placeholder: 'ga:newUsers',
								description:
									'String or <a href="https://support.google.com/analytics/answer/1034324?hl=en">regular expression</a> to match against',
							},
						],
					},
				],
			},
			{
				displayName: 'Hide Totals',
				name: 'hideTotals',
				type: 'boolean',
				default: false,
				description:
					'Whether to hide the total of all metrics for all the matching rows, for every date range',
				displayOptions: {
					show: {
						'/simple': [false],
					},
				},
			},
			{
				displayName: 'Hide Value Ranges',
				name: 'hideValueRanges',
				type: 'boolean',
				default: false,
				description: 'Whether to hide the minimum and maximum across all matching rows',
				displayOptions: {
					show: {
						'/simple': [false],
					},
				},
			},
			{
				displayName: 'Include Empty Rows',
				name: 'includeEmptyRows',
				type: 'boolean',
				default: false,
				description:
					'Whether the response exclude rows if all the retrieved metrics are equal to zero',
			},
			{
				displayName: 'Use Resource Quotas',
				name: 'useResourceQuotas',
				type: 'boolean',
				default: false,
				description: 'Whether to enable resource based quotas',
				displayOptions: {
					show: {
						'/simple': [false],
					},
				},
			},
		],
	},
];
