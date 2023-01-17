import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import {
	checkDuplicates,
	defaultEndDate,
	defaultStartDate,
	prepareDateRange,
	processFilters,
	simplifyGA4,
} from '../../helpers/utils';
import { googleApiRequest, googleApiRequestAllItems } from '../../transport';
import {
	dimensionDropdown,
	dimensionFilterField,
	metricDropdown,
	metricsFilterField,
} from './FiltersDescription';

export const description: INodeProperties[] = [
	{
		displayName: 'Property',
		name: 'propertyId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Property of Google Analytics',
		hint: "If this doesn't work, try changing the 'Property Type' field above",
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a property...',
				typeOptions: {
					searchListMethod: 'searchProperties',
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
							regex: '.*analytics\\.google\\.com\\/analytics.*\\/p([0-9]{1,})(?:\\/.*|)*',
							errorMessage: 'Not a valid Google Analytics URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '.*analytics\\.google\\.com\\/analytics.*\\/p([0-9]{1,})(?:\\/.*|)',
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
							errorMessage: 'Not a valid Google Analytics Property ID',
						},
					},
				],
				url: '=https://analytics.google.com/analytics/web/#/p{{$value}}/',
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
			},
		},
	},
	{
		displayName: 'Metrics',
		name: 'metricsGA4',
		type: 'fixedCollection',
		default: { metricValues: [{ listName: 'totalUsers' }] },
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
					...metricDropdown,
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
								listName: ['custom'],
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
								listName: ['custom'],
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
				propertyType: ['ga4'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: 'Dimensions to split by',
		name: 'dimensionsGA4',
		type: 'fixedCollection',
		default: { dimensionValues: [{ listName: 'date' }] },
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
				values: [...dimensionDropdown],
			},
		],
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
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
				propertyType: ['ga4'],
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
									loadOptionsDependsOn: ['propertyId.value'],
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
									loadOptionsDependsOn: ['propertyId.value'],
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

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	//migration guide: https://developers.google.com/analytics/devguides/migration/api/reporting-ua-to-ga4#core_reporting
	const propertyId = this.getNodeParameter('propertyId', index, undefined, {
		extractValue: true,
	}) as string;

	const returnAll = this.getNodeParameter('returnAll', 0);
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const dateRange = this.getNodeParameter('dateRange', index) as string;
	const metricsGA4 = this.getNodeParameter('metricsGA4', index, {}) as IDataObject;
	const dimensionsGA4 = this.getNodeParameter('dimensionsGA4', index, {}) as IDataObject;
	const simple = this.getNodeParameter('simple', index) as boolean;

	let responseData: IDataObject[] = [];

	const qs: IDataObject = {};
	const body: IDataObject = {
		dateRanges: prepareDateRange.call(this, dateRange, index),
	};

	if (metricsGA4.metricValues) {
		const metrics = (metricsGA4.metricValues as IDataObject[]).map((metric) => {
			switch (metric.listName) {
				case 'other':
					return { name: metric.name };
				case 'custom':
					const newMetric = {
						name: metric.name,
						expression: metric.expression,
						invisible: metric.invisible,
					};

					if (newMetric.invisible === false) {
						delete newMetric.invisible;
					}

					if (newMetric.expression === '') {
						delete newMetric.expression;
					}

					return newMetric;
				default:
					return { name: metric.listName };
			}
		});
		if (metrics.length) {
			checkDuplicates.call(this, metrics, 'name', 'metrics');
			body.metrics = metrics;
		}
	}

	if (dimensionsGA4.dimensionValues) {
		const dimensions = (dimensionsGA4.dimensionValues as IDataObject[]).map((dimension) => {
			switch (dimension.listName) {
				case 'other':
					return { name: dimension.name };
				default:
					return { name: dimension.listName };
			}
		});
		if (dimensions.length) {
			checkDuplicates.call(this, dimensions, 'name', 'dimensions');
			body.dimensions = dimensions;
		}
	}

	if (additionalFields.currencyCode) {
		body.currencyCode = additionalFields.currencyCode;
	}

	if (additionalFields.dimensionFiltersUI) {
		const { filterExpressionType, expression } = (
			additionalFields.dimensionFiltersUI as IDataObject
		).filterExpressions as IDataObject;
		if (expression) {
			body.dimensionFilter = {
				[filterExpressionType as string]: {
					expressions: processFilters(expression as IDataObject),
				},
			};
		}
	}

	if (additionalFields.metricsFiltersUI) {
		const { filterExpressionType, expression } = (additionalFields.metricsFiltersUI as IDataObject)
			.filterExpressions as IDataObject;
		if (expression) {
			body.metricFilter = {
				[filterExpressionType as string]: {
					expressions: processFilters(expression as IDataObject),
				},
			};
		}
	}

	if (additionalFields.metricAggregations) {
		body.metricAggregations = additionalFields.metricAggregations;
	}

	if (additionalFields.keepEmptyRows) {
		body.keepEmptyRows = additionalFields.keepEmptyRows;
	}

	if (additionalFields.orderByUI) {
		let orderBys: IDataObject[] = [];
		const metricOrderBy = (additionalFields.orderByUI as IDataObject)
			.metricOrderBy as IDataObject[];
		const dimmensionOrderBy = (additionalFields.orderByUI as IDataObject)
			.dimmensionOrderBy as IDataObject[];
		if (metricOrderBy) {
			orderBys = orderBys.concat(
				metricOrderBy.map((order) => {
					return {
						desc: order.desc,
						metric: {
							metricName: order.metricName,
						},
					};
				}),
			);
		}
		if (dimmensionOrderBy) {
			orderBys = orderBys.concat(
				dimmensionOrderBy.map((order) => {
					return {
						desc: order.desc,
						dimension: {
							dimensionName: order.dimensionName,
							orderType: order.orderType,
						},
					};
				}),
			);
		}
		body.orderBys = orderBys;
	}

	if (additionalFields.returnPropertyQuota) {
		body.returnPropertyQuota = additionalFields.returnPropertyQuota;
	}

	const method = 'POST';
	const endpoint = `/v1beta/properties/${propertyId}:runReport`;

	if (returnAll) {
		responseData = await googleApiRequestAllItems.call(this, '', method, endpoint, body, qs);
	} else {
		body.limit = this.getNodeParameter('limit', 0);
		responseData = [await googleApiRequest.call(this, method, endpoint, body, qs)];
	}

	if (responseData?.length && simple) {
		responseData = simplifyGA4(responseData[0]);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
