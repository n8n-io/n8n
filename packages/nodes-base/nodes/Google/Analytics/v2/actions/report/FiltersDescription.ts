import { INodeProperties } from 'n8n-workflow';

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
			'The name of the dimension. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				name: 'Events',
				value: 'eventCount',
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
				name: 'Sessions per User',
				value: 'sessionsPerUser',
			},
			{
				name: 'Total Users',
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
			'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		placeholder: 'Add Expression',
		options: [
			{
				displayName: 'String Filter',
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
						displayName: 'Case Sensitive',
						name: 'caseSensitive',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Match Type',
						name: 'matchType',
						type: 'options',
						default: 'EXACT',
						options: [
							{
								name: 'Begins With',
								value: 'BEGINS_WITH',
							},
							{
								name: 'Contains Value',
								value: 'CONTAINS',
							},
							{
								name: 'Ends With',
								value: 'ENDS_WITH',
							},
							{
								name: 'Exact Match',
								value: 'EXACT',
							},
							{
								name: 'Full Match for the Regular Expression',
								value: 'FULL_REGEXP',
							},
							{
								name: 'Partial Match for the Regular Expression',
								value: 'PARTIAL_REGEXP',
							},
						],
					},
				],
			},
			{
				displayName: 'In List Filter',
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
						displayName: 'Case Sensitive',
						name: 'caseSensitive',
						type: 'boolean',
						default: true,
					},
				],
			},
			{
				displayName: 'Numeric Filter',
				name: 'numericFilter',
				values: [
					...dimensionDropdown,
					{
						displayName: 'Value Type',
						name: 'valueType',
						type: 'options',
						default: 'doubleValue',
						options: [
							{
								name: 'Double Value',
								value: 'doubleValue',
							},
							{
								name: 'Integer Value',
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
								name: 'Greater Than',
								value: 'GREATER_THAN',
							},
							{
								name: 'Greater than or Equal',
								value: 'GREATER_THAN_OR_EQUAL',
							},
							{
								name: 'Less Than',
								value: 'LESS_THAN',
							},
							{
								name: 'Less than or Equal',
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
		displayName: 'Dimensions Filters',
		name: 'dimensionFiltersUI',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Filter Expressions',
				name: 'filterExpressions',
				values: [
					{
						displayName: 'Filter Expression Type',
						name: 'filterExpressionType',
						type: 'options',
						default: 'andGroup',
						options: [
							{
								name: 'And Group',
								value: 'andGroup',
							},
							{
								name: 'Or Group',
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
		placeholder: 'Add Expression',
		options: [
			{
				displayName: 'Between Filter',
				name: 'betweenFilter',
				values: [
					...metricDropdown,
					{
						displayName: 'Value Type',
						name: 'valueType',
						type: 'options',
						default: 'doubleValue',
						options: [
							{
								name: 'Double Value',
								value: 'doubleValue',
							},
							{
								name: 'Integer Value',
								value: 'int64Value',
							},
						],
					},
					{
						displayName: 'From Value',
						name: 'fromValue',
						type: 'string',
						default: '',
					},
					{
						displayName: 'To Value',
						name: 'toValue',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'Numeric Filter',
				name: 'numericFilter',
				values: [
					...metricDropdown,
					{
						displayName: 'Value Type',
						name: 'valueType',
						type: 'options',
						default: 'doubleValue',
						options: [
							{
								name: 'Double Value',
								value: 'doubleValue',
							},
							{
								name: 'Integer Value',
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
								name: 'Greater Than',
								value: 'GREATER_THAN',
							},
							{
								name: 'Greater than or Equal',
								value: 'GREATER_THAN_OR_EQUAL',
							},
							{
								name: 'Less Than',
								value: 'LESS_THAN',
							},
							{
								name: 'Less than or Equal',
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
		displayName: 'Metrics Filters',
		name: 'metricsFiltersUI',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Filter Expressions',
				name: 'filterExpressions',
				values: [
					{
						displayName: 'Filter Expression Type',
						name: 'filterExpressionType',
						type: 'options',
						default: 'andGroup',
						options: [
							{
								name: 'And Group',
								value: 'andGroup',
							},
							{
								name: 'Or Group',
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
