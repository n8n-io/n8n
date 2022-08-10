import { INodeProperties } from 'n8n-workflow';

import { dimensionFilterField, metricsFilterField } from './FiltersDescription';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['report', 'reportGA4'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Return the analytics data',
				action: 'Get a report',
			},
		],
		default: 'get',
	},
];

export const reportFields: INodeProperties[] = [
	//------------------------ Reporting API V4 ------------------------//
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
			},
		},
		placeholder: '123456',
		description:
			'The View ID of Google Analytics. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	//------------------------ Data API V1 ------------------------//
	{
		displayName: 'Property Name or ID',
		name: 'propertyId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProperties',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['reportGA4'],
				operation: ['get'],
			},
		},
		placeholder: '123456',
		description:
			'The Property ID of Google Analytics. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	//-------------------------------------------------------------------//
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['report', 'reportGA4'],
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
				resource: ['report', 'reportGA4'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 1000,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['report', 'reportGA4'],
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
			},
		},
		options: [
			{
				displayName: 'Date Ranges',
				name: 'dateRangesUi',
				placeholder: 'Add Date Range',
				type: 'fixedCollection',
				default: {},
				description: 'Date ranges in the request',
				options: [
					{
						displayName: 'Date Range',
						name: 'dateRanges',
						values: [
							{
								displayName: 'Start Date',
								name: 'startDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'End Date',
								name: 'endDate',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Dimensions',
				name: 'dimensionUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Dimension',
				description:
					'Dimensions are attributes of your data. For example, the dimension ga:city indicates the city, for example, "Paris" or "New York", from which a session originates.',
				options: [
					{
						displayName: 'Dimension',
						name: 'dimensionValues',
						values: [
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
							},
						],
					},
				],
			},
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
										name: 'Equal (Number)',
										value: 'NUMERIC_EQUAL',
									},
									{
										name: 'Exact',
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
										name: 'Partial',
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
			},
			{
				displayName: 'Hide Value Ranges',
				name: 'hideValueRanges',
				type: 'boolean',
				default: false,
				description: 'Whether to hide the minimum and maximum across all matching rows',
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
				displayName: 'Metrics',
				name: 'metricsUi',
				type: 'fixedCollection',
				default: {},
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
								displayName: 'Alias',
								name: 'alias',
								type: 'string',
								default: '',
								description:
									'An alias for the metric expression is an alternate name for the expression. The alias can be used for filtering and sorting.',
							},
							{
								displayName: 'Expression',
								name: 'expression',
								type: 'string',
								default: 'ga:newUsers',
								description:
									'<p>A metric expression in the request. An expression is constructed from one or more metrics and numbers.</p><p>Accepted operators include: Plus (+), Minus (-), Negation (Unary -), Divided by (/), Multiplied by (*), Parenthesis, Positive cardinal numbers (0-9), can include decimals and is limited to 1024 characters.</p><p>Example ga:totalRefunds/ga:users, in most cases the metric expression is just a single metric name like ga:users.</p><p>Adding mixed MetricType (E.g., CURRENCY + PERCENTAGE) metrics will result in unexpected results.</p>.',
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
							},
						],
					},
				],
			},
			{
				displayName: 'Use Resource Quotas',
				name: 'useResourceQuotas',
				type: 'boolean',
				default: false,
				description: 'Whether to enable resource based quotas',
			},
		],
	},
	//------------------------ Data API V1 ------------------------//
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['reportGA4'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Currency Code',
				name: 'currencyCode',
				type: 'string',
				default: '',
				description:
					'A currency code in ISO4217 format, such as "AED", "USD", "JPY". If the field is empty, the report uses the property\'s default currency.',
			},
			{
				displayName: 'Date Ranges',
				name: 'dateRangesUi',
				placeholder: 'Add Date Range',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description: 'Date ranges in the request',
				options: [
					{
						displayName: 'Date Range',
						name: 'dateRanges',
						values: [
							{
								displayName: 'Start Date',
								name: 'startDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'End Date',
								name: 'endDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								hint: 'Optional name to this date range',
								description:
									'If set, cannot begin with date_range_ or RESERVED_. If not set, date ranges are named by their zero based index in the request: date_range_0, date_range_1, etc.',
							},
						],
					},
				],
			},
			{
				displayName: 'Dimensions',
				name: 'dimensionUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Dimension',
				description:
					'Dimensions are attributes of your data. For example, the dimension city indicates the city from which an event originates. Dimension values in report responses are strings; for example, the city could be "Paris" or "New York". Requests are allowed up to 9 dimensions.',
				options: [
					{
						displayName: 'Dimension',
						name: 'dimensionValues',
						values: [
							{
								displayName: 'Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDimensionsGA4',
									loadOptionsDependsOn: ['profileId'],
								},
								default: '',
								description:
									'The name of the dimension. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
						],
					},
				],
			},
			...dimensionFilterField,
			{
				displayName: 'Metric Aggregation',
				name: 'metricAggregations',
				type: 'multiOptions',
				hint: 'Simplify need to be turned off for this to be shown in output',
				default: [],
				options: [
					{
						name: 'MAXIMUM',
						value: 'MAXIMUM',
					},
					{
						name: 'MINIMUM',
						value: 'MINIMUM',
					},
					{
						name: 'TOTAL',
						value: 'TOTAL',
					},
				],
			},
			{
				displayName: 'Metrics',
				name: 'metricUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Metric',
				description:
					'The quantitative measurements of a report. For example, the metric eventCount is the total number of events. Requests are allowed up to 10 metrics.',
				options: [
					{
						displayName: 'Metric',
						name: 'metricValues',
						values: [
							{
								displayName: 'Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getMetricsGA4',
									loadOptionsDependsOn: ['profileId'],
								},
								default: '',
								description:
									'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
						],
					},
				],
			},
			...metricsFilterField,
			{
				displayName: 'Keep Empty Rows',
				name: 'keepEmptyRows',
				type: 'boolean',
				default: false,
				description:
					'Whether false or unspecified, each row with all metrics equal to 0 will not be returned. If true, these rows will be returned if they are not separately removed by a filter.',
			},
			{
				displayName: 'Order By',
				name: 'orderByUI',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Order',
				description: 'Specifies how rows are ordered in the response',
				options: [
					{
						displayName: 'Metric Order By',
						name: 'metricOrderBy',
						values: [
							{
								displayName: 'Descending',
								name: 'desc',
								type: 'boolean',
								default: false,
								description: 'Whether true, sorts by descending order',
							},
							{
								displayName: 'Metric Name or ID',
								name: 'metricName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getMetricsGA4',
									loadOptionsDependsOn: ['profileId'],
								},
								default: '',
								description:
									'Sorts by metric values. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
						],
					},
					{
						displayName: 'Dimmension Order By',
						name: 'dimmensionOrderBy',
						values: [
							{
								displayName: 'Descending',
								name: 'desc',
								type: 'boolean',
								default: false,
								description: 'Whether true, sorts by descending order',
							},
							{
								displayName: 'Dimmension Name or ID',
								name: 'dimensionName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDimensionsGA4',
									loadOptionsDependsOn: ['profileId'],
								},
								default: '',
								description:
									'Sorts by metric values. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Order Type',
								name: 'orderType',
								type: 'options',
								default: 'ORDER_TYPE_UNSPECIFIED',
								options: [
									{
										name: 'Alphanumeric',
										value: 'ALPHANUMERIC',
										description: 'Alphanumeric sort by Unicode code point',
									},
									{
										name: 'Case Insensitive Alphanumeric',
										value: 'CASE_INSENSITIVE_ALPHANUMERIC',
										description:
											'Case insensitive alphanumeric sort by lower case Unicode code point',
									},
									{
										name: 'Numeric',
										value: 'NUMERIC',
										description: 'Dimension values are converted to numbers before sorting',
									},
									{
										name: 'Unspecified',
										value: 'ORDER_TYPE_UNSPECIFIED',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Return Property Quota',
				name: 'returnPropertyQuota',
				type: 'boolean',
				default: false,
				description:
					"Whether to return the current state of this Analytics Property's quota. Quota is returned in PropertyQuota.",
				hint: 'Simplify need to be turned off for this to be shown in output',
			},
		],
	},
];
