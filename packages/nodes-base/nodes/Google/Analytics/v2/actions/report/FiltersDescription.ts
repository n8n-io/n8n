import { INodeProperties } from 'n8n-workflow';

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
					{
						displayName: 'Dimension Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDimensionsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: '',
						description:
							'The name of the dimension. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
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
						default: 'MATCH_TYPE_UNSPECIFIED',
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
							{
								name: 'Unspecified',
								value: 'MATCH_TYPE_UNSPECIFIED',
							},
						],
					},
				],
			},
			{
				displayName: 'In List Filter',
				name: 'inListFilter',
				values: [
					{
						displayName: 'Dimension Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDimensionsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: '',
						description:
							'The name of the dimension. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
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
					{
						displayName: 'Dimension Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDimensionsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: '',
						description:
							'The name of the dimension. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
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
						default: 'OPERATION_UNSPECIFIED',
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
							{
								name: 'Unspecified',
								value: 'OPERATION_UNSPECIFIED',
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
					{
						displayName: 'Metric Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getMetricsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: '',
						description:
							'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
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
					{
						displayName: 'Metric Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getMetricsGA4',
							loadOptionsDependsOn: ['profileId'],
						},
						default: '',
						description:
							'The name of the metric. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
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
						default: 'OPERATION_UNSPECIFIED',
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
							{
								name: 'Unspecified',
								value: 'OPERATION_UNSPECIFIED',
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
