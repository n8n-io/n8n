import { INodeProperties } from 'n8n-workflow';
import { defaultEndDate, defaultStartDate } from '../helpers/utils';
import { dimensionFilterField, metricsFilterField } from './FiltersDescription';

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
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['ga4'],
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
				name: 'Last 7 Days',
				value: 'last7days',
			},
			{
				name: 'Last 30 Days',
				value: 'last30days',
			},
			{
				name: 'Today',
				value: 'today',
			},
			{
				name: 'Yesterday',
				value: 'yesterday',
			},
			{
				name: 'Last Complete Calendar Week',
				value: 'lastCalendarWeek',
			},
			{
				name: 'Last Complete Calendar Month',
				value: 'lastCalendarMonth',
			},
			{
				name: 'Custom',
				value: 'custom',
			},
		],
		default: 'last7days',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['ga4'],
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
				dateRange: ['custom'],
				accessDataFor: ['ga4'],
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
				dateRange: ['custom'],
				accessDataFor: ['ga4'],
			},
		},
	},
	{
		displayName: 'Metrics',
		name: 'metricsGA4',
		type: 'fixedCollection',
		default: { metricValues: [{ listName: 'active7DayUsers' }] },
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Metric',
		description:
			'The quantitative measurements of a report. For example, the metric eventCount is the total number of events. Requests are allowed up to 10 metrics.',
		options: [
			{
				displayName: 'Values',
				name: 'metricValues',
				values: [
					{
						displayName: 'Metric',
						name: 'listName',
						type: 'options',
						default: 'active7DayUsers',
						options: [
							{
								name: '1 Day Active Users',
								value: 'active1DayUsers',
							},
							{
								name: '28 Day Active Users',
								value: 'active28DayUsers',
							},
							{
								name: '7 Day Active Users',
								value: 'active7DayUsers',
							},
							{
								name: 'Checkouts',
								value: 'checkouts',
							},
							{
								name: 'Sessions per User',
								value: 'sessionsPerUser',
							},
							{
								name: 'Page Views',
								value: 'screenPageViews',
							},
							{
								name: 'Session Duration',
								value: 'userEngagementDuration',
							},
							{
								name: 'Sessions',
								value: 'sessions',
							},
							{
								name: 'Events',
								value: 'eventCount',
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
						name: 'name',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getMetricsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: 'active7DayUsers',
						hint: 'If expression is specified, name can be any string that you would like',
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
						description:
							'A mathematical expression for derived metrics. For example, the metric Event count per user is eventCount/totalUsers.',
						placeholder: 'e.g. eventCount/totalUsers',
						displayOptions: {
							show: {
								listName: ['more'],
							},
						},
					},
					{
						displayName: 'Invisible',
						name: 'invisible',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								listName: ['more'],
							},
						},
						description:
							'Whether a metric is invisible in the report response. If a metric is invisible, the metric will not produce a column in the response, but can be used in metricFilter, orderBys, or a metric expression.',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				accessDataFor: ['ga4'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: 'Dimensions to split by',
		name: 'dimensionsGA4',
		type: 'fixedCollection',
		default: { dimensionValues: [{ listName: '' }] },
		// default: {},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Dimension',
		description:
			'Dimensions are attributes of your data. For example, the dimension city indicates the city from which an event originates. Dimension values in report responses are strings; for example, the city could be "Paris" or "New York". Requests are allowed up to 9 dimensions.',
		options: [
			{
				displayName: 'Values',
				name: 'dimensionValues',
				values: [
					{
						displayName: 'Dimension',
						name: 'listName',
						type: 'options',
						default: 'deviceCategory',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'Browser',
								value: 'browser',
							},
							{
								name: 'Campaign',
								value: 'campaignName',
							},
							{
								name: 'City',
								value: 'city',
							},
							{
								name: 'Country',
								value: 'country',
							},
							{
								name: 'Date',
								value: 'date',
							},
							{
								name: 'Device Category',
								value: 'deviceCategory',
							},
							{
								name: 'Item Name',
								value: 'itemName',
							},
							{
								name: 'Language',
								value: 'language',
							},
							{
								name: 'Page Location',
								value: 'pageLocation',
							},
							{
								name: 'Source / Medium',
								value: 'sourceMedium',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Other dimensions…',
								value: 'more',
							},
						],
					},
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
				accessDataFor: ['ga4'],
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
				accessDataFor: ['ga4'],
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
				accessDataFor: ['ga4'],
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
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-simplify
		displayName: 'Simplify Output',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['report'],
				accessDataFor: ['ga4'],
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
				accessDataFor: ['ga4'],
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
