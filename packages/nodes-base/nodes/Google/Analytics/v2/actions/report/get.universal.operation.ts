import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { IData, IDimension, IMetric } from '../../helpers/Interfaces';
import {
	checkDuplicates,
	defaultEndDate,
	defaultStartDate,
	merge,
	prepareDateRange,
	simplify,
} from '../../helpers/utils';
import { googleApiRequest, googleApiRequestAllItems } from '../../transport';

const dimensionDropdown: INodeProperties[] = [
	{
		displayName: 'Dimension',
		name: 'listName',
		type: 'options',
		default: 'ga:date',
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
			loadOptionsMethod: 'getDimensions',
			loadOptionsDependsOn: ['viewId.value'],
		},
		default: 'ga:date',
		description:
			'Name of the dimension to fetch, for example ga:browser. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				listName: ['other'],
			},
		},
	},
];

export const description: INodeProperties[] = [
	{
		displayName: 'View',
		name: 'viewId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The View of Google Analytics',
		hint: "If this doesn't work, try changing the 'Property Type' field above",
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a view...',
				typeOptions: {
					searchListMethod: 'searchViews',
					searchFilterRequired: false,
					searchable: false,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://analytics.google.com/analytics/...',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*analytics.google.com/analytics.*p[0-9]{1,}.*',
							errorMessage: 'Not a valid Google Analytics URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '.*analytics.google.com/analytics.*p([0-9]{1,})',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '123456',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]{1,}',
							errorMessage: 'Not a valid Google Analytics View ID',
						},
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				propertyType: ['universal'],
			},
		},
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
				propertyType: ['universal'],
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
				propertyType: ['universal'],
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
				propertyType: ['universal'],
				dateRange: ['custom'],
			},
		},
	},
	{
		displayName: 'Metrics',
		name: 'metricsUA',
		type: 'fixedCollection',
		default: { metricValues: [{ listName: 'ga:users' }] },
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add metric',
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
						default: 'ga:users',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'Checkouts',
								value: 'ga:productCheckouts',
							},
							{
								name: 'Events',
								value: 'ga:totalEvents',
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
								name: 'Sessions per User',
								value: 'ga:sessionsPerUser',
							},
							{
								name: 'Total Users',
								value: 'ga:users',
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
							loadOptionsMethod: 'getMetrics',
							loadOptionsDependsOn: ['viewId.value'],
						},
						default: 'ga:users',
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
								listName: ['custom'],
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
								listName: ['custom'],
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
				propertyType: ['universal'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: 'Dimensions to split by',
		name: 'dimensionsUA',
		type: 'fixedCollection',
		default: { dimensionValues: [{ listName: 'ga:date' }] },
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
				values: [...dimensionDropdown],
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				propertyType: ['universal'],
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
				propertyType: ['universal'],
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
				propertyType: ['universal'],
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
				propertyType: ['universal'],
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
				propertyType: ['universal'],
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
							...dimensionDropdown,
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
								placeholder: '',
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

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet
	// const viewId = this.getNodeParameter('viewId', index) as string;
	const viewId = this.getNodeParameter('viewId', index, undefined, {
		extractValue: true,
	}) as string;
	const returnAll = this.getNodeParameter('returnAll', 0);
	const dateRange = this.getNodeParameter('dateRange', index) as string;
	const metricsUA = this.getNodeParameter('metricsUA', index) as IDataObject;
	const dimensionsUA = this.getNodeParameter('dimensionsUA', index) as IDataObject;
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const simple = this.getNodeParameter('simple', index) as boolean;

	let responseData;

	const qs: IDataObject = {};
	const body: IData = {
		viewId,
		dateRanges: prepareDateRange.call(this, dateRange, index),
	};

	if (metricsUA.metricValues) {
		const metrics = (metricsUA.metricValues as IDataObject[]).map((metric) => {
			switch (metric.listName) {
				case 'other':
					return {
						alias: metric.name,
						expression: metric.name,
					};
				case 'custom':
					const newMetric = {
						alias: metric.name,
						expression: metric.expression,
						formattingType: metric.formattingType,
					};
					return newMetric;
				default:
					return {
						alias: metric.listName,
						expression: metric.listName,
					};
			}
		});
		if (metrics.length) {
			checkDuplicates.call(this, metrics, 'alias', 'metrics');
			body.metrics = metrics as IMetric[];
		}
	}

	if (dimensionsUA.dimensionValues) {
		const dimensions = (dimensionsUA.dimensionValues as IDataObject[]).map((dimension) => {
			switch (dimension.listName) {
				case 'other':
					return { name: dimension.name };
				default:
					return { name: dimension.listName };
			}
		});
		if (dimensions.length) {
			checkDuplicates.call(this, dimensions, 'name', 'dimensions');
			body.dimensions = dimensions as IDimension[];
		}
	}

	if (additionalFields.useResourceQuotas) {
		qs.useResourceQuotas = additionalFields.useResourceQuotas;
	}

	if (additionalFields.dimensionFiltersUi) {
		const dimensionFilters = (additionalFields.dimensionFiltersUi as IDataObject)
			.filterValues as IDataObject[];
		if (dimensionFilters) {
			dimensionFilters.forEach((filter) => {
				filter.expressions = [filter.expressions];
				switch (filter.listName) {
					case 'other':
						filter.dimensionName = filter.name;
						delete filter.name;
						delete filter.listName;
						break;
					default:
						filter.dimensionName = filter.listName;
						delete filter.listName;
				}
			});
			body.dimensionFilterClauses = { filters: dimensionFilters };
		}
	}

	if (additionalFields.includeEmptyRows) {
		Object.assign(body, { includeEmptyRows: additionalFields.includeEmptyRows });
	}
	if (additionalFields.hideTotals) {
		Object.assign(body, { hideTotals: additionalFields.hideTotals });
	}
	if (additionalFields.hideValueRanges) {
		Object.assign(body, { hideTotals: additionalFields.hideTotals });
	}

	const method = 'POST';
	const endpoint = '/v4/reports:batchGet';

	if (returnAll) {
		responseData = await googleApiRequestAllItems.call(
			this,
			'reports',
			method,
			endpoint,
			{ reportRequests: [body] },
			qs,
		);
	} else {
		body.pageSize = this.getNodeParameter('limit', 0);
		responseData = await googleApiRequest.call(
			this,
			method,
			endpoint,
			{ reportRequests: [body] },
			qs,
		);
		responseData = responseData.reports;
	}

	if (simple) {
		responseData = simplify(responseData);
	} else if (returnAll && responseData.length > 1) {
		responseData = merge(responseData);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
