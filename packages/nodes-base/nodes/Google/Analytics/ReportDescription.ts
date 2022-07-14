import {
	INodeProperties,
} from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'report',
				],
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
				resource: [
					'report',
				],
				operation: [
					'get',
				],
			},
		},
		placeholder: '123456',
		description: 'The View ID of Google Analytics. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'report',
				],
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
				operation: [
					'get',
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
				operation: [
					'get',
				],
				resource: [
					'report',
				],
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
				resource: [
					'report',
				],
				operation: [
					'get',
				],
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
				description: 'Dimensions are attributes of your data. For example, the dimension ga:city indicates the city, for example, "Paris" or "New York", from which a session originates.',
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
								description: 'Name of the dimension to fetch, for example ga:browser. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
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
								description: 'Name of the dimension to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
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
								description: 'String or <a href="https://support.google.com/analytics/answer/1034324?hl=en">regular expression</a> to match against',
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
				description: 'Whether to hide the total of all metrics for all the matching rows, for every date range',
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
				description: 'Whether the response exclude rows if all the retrieved metrics are equal to zero',
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
								description: 'An alias for the metric expression is an alternate name for the expression. The alias can be used for filtering and sorting.',
							},
							{
								displayName: 'Expression',
								name: 'expression',
								type: 'string',
								default: 'ga:newUsers',
								description: '<p>A metric expression in the request. An expression is constructed from one or more metrics and numbers.</p><p>Accepted operators include: Plus (+), Minus (-), Negation (Unary -), Divided by (/), Multiplied by (*), Parenthesis, Positive cardinal numbers (0-9), can include decimals and is limited to 1024 characters.</p><p>Example ga:totalRefunds/ga:users, in most cases the metric expression is just a single metric name like ga:users.</p><p>Adding mixed MetricType (E.g., CURRENCY + PERCENTAGE) metrics will result in unexpected results.</p>.',
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
];
