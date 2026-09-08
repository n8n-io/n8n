import type { INodeProperties } from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['report'],
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
		displayName: 'View name or ID',
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
			'The View ID of Google Analytics. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['report'],
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
				resource: ['report'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Date ranges',
				name: 'dateRangesUi',
				placeholder: 'Add date range',
				type: 'fixedCollection',
				default: {},
				description: 'Date ranges in the request',
				options: [
					{
						displayName: 'Date range',
						name: 'dateRanges',
						values: [
							{
								displayName: 'Start date',
								name: 'startDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'End date',
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
				placeholder: 'Add dimension',
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
									'Name of the dimension to fetch, for example ga:browser. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
						],
					},
				],
			},
			{
				displayName: 'Dimension filters',
				name: 'dimensionFiltersUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add dimension filter',
				description: 'Dimension Filters in the request',
				options: [
					{
						displayName: 'Filters',
						name: 'filterValues',
						values: [
							{
								displayName: 'Dimension name or ID',
								name: 'dimensionName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDimensions',
								},
								default: '',
								description:
									'Name of the dimension to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
										name: 'Begins with',
										value: 'BEGINS_WITH',
									},
									{
										name: 'Ends with',
										value: 'ENDS_WITH',
									},
									{
										name: 'Equal (number)',
										value: 'NUMERIC_EQUAL',
									},
									{
										name: 'Exact',
										value: 'EXACT',
									},
									{
										name: 'Greater than (number)',
										value: 'NUMERIC_GREATER_THAN',
									},
									{
										name: 'Less than (number)',
										value: 'NUMERIC_LESS_THAN',
									},
									{
										name: 'Partial',
										value: 'PARTIAL',
									},
									{
										name: 'Regular expression',
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
				displayName: 'Hide totals',
				name: 'hideTotals',
				type: 'boolean',
				default: false,
				description:
					'Whether to hide the total of all metrics for all the matching rows, for every date range',
			},
			{
				displayName: 'Hide value ranges',
				name: 'hideValueRanges',
				type: 'boolean',
				default: false,
				description: 'Whether to hide the minimum and maximum across all matching rows',
			},
			{
				displayName: 'Include empty rows',
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
				placeholder: 'Add metrics',
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
								displayName: 'Formatting type',
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
				displayName: 'Use resource quotas',
				name: 'useResourceQuotas',
				type: 'boolean',
				default: false,
				description: 'Whether to enable resource based quotas',
			},
		],
	},
];
