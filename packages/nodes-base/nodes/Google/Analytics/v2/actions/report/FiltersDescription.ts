import type { INodeProperties } from 'n8n-workflow';

export const dimensionDropdown: INodeProperties[] = [
	{
		displayName: 'Dimension',
		name: 'listName',
		type: 'options',
		default: 'date',
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
				name: 'Device category',
				value: 'deviceCategory',
			},
			{
				name: 'Item name',
				value: 'itemName',
			},
			{
				name: 'Language',
				value: 'language',
			},
			{
				name: 'Page location',
				value: 'pageLocation',
			},
			{
				name: 'Source / medium',
				value: 'sourceMedium',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Other dimensions…',
				value: 'other',
			},
		],
	},
	{
		displayName: 'Name or ID',
		name: 'name',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDimensionsGA4',
			loadOptionsDependsOn: ['propertyId.value'],
		},
		default: 'date',
		description:
			'The name of the dimension. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				listName: ['other'],
			},
		},
	},
];

export const metricDropdown: INodeProperties[] = [
	{
		displayName: 'Metric',
		name: 'listName',
		type: 'options',
		default: 'totalUsers',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: '1 day active users',
				value: 'active1DayUsers',
			},
			{
				name: '28 day active users',
				value: 'active28DayUsers',
			},
			{
				name: '7 day active users',
				value: 'active7DayUsers',
			},
			{
				name: 'Checkouts',
				value: 'checkouts',
			},
			{
				name: 'Events',
				value: 'eventCount',
			},
			{
				name: 'Page views',
				value: 'screenPageViews',
			},
			{
				name: 'Session duration',
				value: 'userEngagementDuration',
			},
			{
				name: 'Sessions',
				value: 'sessions',
			},
			{
				name: 'Sessions per user',
				value: 'sessionsPerUser',
			},
			{
				name: 'Total users',
				value: 'totalUsers',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Other metrics…',
				value: 'other',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Custom metric…',
				value: 'custom',
			},
		],
	},
	{
		displayName: 'Name or ID',
		name: 'name',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getMetricsGA4',
			loadOptionsDependsOn: ['propertyId.value'],
		},
		default: 'totalUsers',
		hint: 'If expression is specified, name can be any string that you would like',
		description:
			'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				listName: ['other'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: 'custom_metric',
		displayOptions: {
			show: {
				listName: ['custom'],
			},
		},
	},
];

const dimensionsFilterExpressions: INodeProperties[] = [
	{
		displayName: 'Expression',
		name: 'expression',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add expression',
		options: [
			{
				displayName: 'String filter',
				name: 'stringFilter',
				values: [
					...dimensionDropdown,
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Case sensitive',
						name: 'caseSensitive',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Match type',
						name: 'matchType',
						type: 'options',
						default: 'EXACT',
						options: [
							{
								name: 'Begins with',
								value: 'BEGINS_WITH',
							},
							{
								name: 'Contains value',
								value: 'CONTAINS',
							},
							{
								name: 'Ends with',
								value: 'ENDS_WITH',
							},
							{
								name: 'Exact match',
								value: 'EXACT',
							},
							{
								name: 'Full match for the regular expression',
								value: 'FULL_REGEXP',
							},
							{
								name: 'Partial match for the regular expression',
								value: 'PARTIAL_REGEXP',
							},
						],
					},
				],
			},
			{
				displayName: 'In list filter',
				name: 'inListFilter',
				values: [
					...dimensionDropdown,
					{
						displayName: 'Values',
						name: 'values',
						type: 'string',
						default: '',
						hint: 'Comma separated list of values. Must be non-empty.',
					},
					{
						displayName: 'Case sensitive',
						name: 'caseSensitive',
						type: 'boolean',
						default: true,
					},
				],
			},
			{
				displayName: 'Numeric filter',
				name: 'numericFilter',
				values: [
					...dimensionDropdown,
					{
						displayName: 'Value type',
						name: 'valueType',
						type: 'options',
						default: 'doubleValue',
						options: [
							{
								name: 'Double value',
								value: 'doubleValue',
							},
							{
								name: 'Integer value',
								value: 'int64Value',
							},
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						default: 'EQUAL',
						options: [
							{
								name: 'Equal',
								value: 'EQUAL',
							},
							{
								name: 'Greater than',
								value: 'GREATER_THAN',
							},
							{
								name: 'Greater than or equal',
								value: 'GREATER_THAN_OR_EQUAL',
							},
							{
								name: 'Less than',
								value: 'LESS_THAN',
							},
							{
								name: 'Less than or equal',
								value: 'LESS_THAN_OR_EQUAL',
							},
						],
					},
				],
			},
		],
	},
];

export const dimensionFilterField: INodeProperties[] = [
	{
		displayName: 'Dimensions filters',
		name: 'dimensionFiltersUI',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add filter',
		options: [
			{
				displayName: 'Filter expressions',
				name: 'filterExpressions',
				values: [
					{
						displayName: 'Filter expression type',
						name: 'filterExpressionType',
						type: 'options',
						default: 'andGroup',
						options: [
							{
								name: 'And group',
								value: 'andGroup',
							},
							{
								name: 'Or group',
								value: 'orGroup',
							},
						],
					},
					...dimensionsFilterExpressions,
				],
			},
		],
	},
];

const metricsFilterExpressions: INodeProperties[] = [
	{
		displayName: 'Expression',
		name: 'expression',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add expression',
		options: [
			{
				displayName: 'Between filter',
				name: 'betweenFilter',
				values: [
					...metricDropdown,
					{
						displayName: 'Value type',
						name: 'valueType',
						type: 'options',
						default: 'doubleValue',
						options: [
							{
								name: 'Double value',
								value: 'doubleValue',
							},
							{
								name: 'Integer value',
								value: 'int64Value',
							},
						],
					},
					{
						displayName: 'From value',
						name: 'fromValue',
						type: 'string',
						default: '',
					},
					{
						displayName: 'To value',
						name: 'toValue',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'Numeric filter',
				name: 'numericFilter',
				values: [
					...metricDropdown,
					{
						displayName: 'Value type',
						name: 'valueType',
						type: 'options',
						default: 'doubleValue',
						options: [
							{
								name: 'Double value',
								value: 'doubleValue',
							},
							{
								name: 'Integer value',
								value: 'int64Value',
							},
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						default: 'EQUAL',
						options: [
							{
								name: 'Equal',
								value: 'EQUAL',
							},
							{
								name: 'Greater than',
								value: 'GREATER_THAN',
							},
							{
								name: 'Greater than or equal',
								value: 'GREATER_THAN_OR_EQUAL',
							},
							{
								name: 'Less than',
								value: 'LESS_THAN',
							},
							{
								name: 'Less than or equal',
								value: 'LESS_THAN_OR_EQUAL',
							},
						],
					},
				],
			},
		],
	},
];

export const metricsFilterField: INodeProperties[] = [
	{
		displayName: 'Metrics filters',
		name: 'metricsFiltersUI',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add filter',
		options: [
			{
				displayName: 'Filter expressions',
				name: 'filterExpressions',
				values: [
					{
						displayName: 'Filter expression type',
						name: 'filterExpressionType',
						type: 'options',
						default: 'andGroup',
						options: [
							{
								name: 'And group',
								value: 'andGroup',
							},
							{
								name: 'Or group',
								value: 'orGroup',
							},
						],
					},
					...metricsFilterExpressions,
				],
			},
		],
	},
];
