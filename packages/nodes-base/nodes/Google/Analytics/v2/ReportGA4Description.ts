import { INodeProperties } from 'n8n-workflow';

import { defaultEndDate, defaultStartDate } from '../GenericFunctions';

import { dimensionFilterField, metricsFilterField } from './FiltersDescription';

export const reportGA4Operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['reportGA4'],
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

export const reportGA4Fields: INodeProperties[] = [
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
				resource: ['reportGA4'],
				operation: ['get'],
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
				resource: ['reportGA4'],
				operation: ['get'],
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
				resource: ['reportGA4'],
				operation: ['get'],
				dateRange: ['custom'],
			},
		},
	},
	// {
	// 	displayName: 'Date Ranges',
	// 	name: 'dateRangesUi',
	// 	placeholder: 'Add Date Range',
	// 	type: 'fixedCollection',
	// 	default: {},
	// 	typeOptions: {
	// 		multipleValues: true,
	// 	},
	// 	description: 'Date ranges in the request',
	// 	options: [
	// 		{
	// 			displayName: 'Date Range',
	// 			name: 'dateRanges',
	// 			values: [
	// 				{
	// 					displayName: 'Start Date',
	// 					name: 'startDate',
	// 					type: 'dateTime',
	// 					default: '',
	// 				},
	// 				{
	// 					displayName: 'End Date',
	// 					name: 'endDate',
	// 					type: 'dateTime',
	// 					default: '',
	// 				},
	// 				{
	// 					displayName: 'Name',
	// 					name: 'name',
	// 					type: 'string',
	// 					default: '',
	// 					hint: 'Optional name to this date range',
	// 					description:
	// 						'If set, cannot begin with date_range_ or RESERVED_. If not set, date ranges are named by their zero based index in the request: date_range_0, date_range_1, etc.',
	// 				},
	// 			],
	// 		},
	// 	],
	// 	displayOptions: {
	// 		show: {
	// 			resource: ['reportGA4'],
	// 			operation: ['get'],
	// 		},
	// 	},
	// },
	{
		displayName: 'Metrics',
		name: 'metricUi',
		type: 'fixedCollection',
		default: {metricValues: [{metricListName: 'totalUsers'}]},
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
						displayName: 'Name',
						name: 'metricListName',
						type: 'options',
						default: 'totalUsers',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'Average Session Duration',
								value: 'averageSessionDuration',
							},
							{
								name: 'Conversions',
								value: 'conversions',
							},
							{
								name: 'Page Views',
								value: 'screenPageViews',
							},
							{
								name: 'Page Views Per Session',
								value: 'screenPageViewsPerSession',
							},
							{
								name: 'Sessions',
								value: 'sessions',
							},
							{
								name: 'Total Users',
								value: 'totalUsers',
							},
							{
								name: 'More…',
								value: 'more',
							},
						],
					},
					{
						displayName: 'Name or ID',
						name: 'metricLoadedName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getMetricsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: '',
						description:
							'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						displayOptions: {
							show: {
								metricListName: ['more'],
							},
						},
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['reportGA4'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Dimensions',
		name: 'dimensionUi',
		type: 'fixedCollection',
		default: {dimensionValues: [{name: 'achievementId'}]},
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
		displayOptions: {
			show: {
				resource: ['reportGA4'],
				operation: ['get'],
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
				resource: ['reportGA4'],
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
				resource: ['reportGA4'],
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
				resource: ['reportGA4'],
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
			...dimensionFilterField,
			{
				displayName: 'Metric Aggregation',
				name: 'metricAggregations',
				type: 'multiOptions',
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
				displayOptions: {
					show: {
						'/simple': [false],
					},
				},
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
				displayOptions: {
					show: {
						'/simple': [false],
					},
				},
			},
		],
	},
];
