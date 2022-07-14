import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	reportFields,
	reportOperations,
} from './ReportDescription';

import {
	userActivityFields,
	userActivityOperations,
} from './UserActivityDescription';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	merge,
	processFilters,
	simplify,
} from './GenericFunctions';

import moment from 'moment-timezone';

import {
	IData,
} from './Interfaces';

export class GoogleAnalytics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Analytics',
		name: 'googleAnalytics',
		icon: 'file:analytics.svg',
		group: ['transform'],
		version: [1, 2],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Google Analytics API',
		defaults: {
			name: 'Google Analytics',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleAnalyticsOAuth2',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [
							1,
						],
					},
				},
				options: [
					{
						name: 'Reporting API V4',
						value: 'reportingAPI',
					},
					{
						name: 'Data API V1',
						value: 'dataAPI',
					},
				],
				default: 'reportingAPI',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [
							2,
						],
					},
				},
				options: [
					{
						name: 'Reporting API V4',
						value: 'reportingAPI',
					},
					{
						name: 'Data API V1',
						value: 'dataAPI',
					},
				],
				default: 'dataAPI',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Report',
						value: 'report',
					},
					{
						name: 'User Activity',
						value: 'userActivity',
					},
				],
				default: 'report',
			},
			//-------------------------------
			// Reports Operations
			//-------------------------------
			...reportOperations,
			...reportFields,

			//-------------------------------
			// User Activity Operations
			//-------------------------------
			...userActivityOperations,
			...userActivityFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the dimensions to display them to user so that he can
			// select them easily
			async getDimensions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { items: dimensions } = await googleApiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					'https://www.googleapis.com/analytics/v3/metadata/ga/columns',
				);

				for (const dimesion of dimensions) {
					if (dimesion.attributes.type === 'DIMENSION' && dimesion.attributes.status !== 'DEPRECATED') {
						returnData.push({
							name: dimesion.attributes.uiName,
							value: dimesion.id,
							description: dimesion.attributes.description,
						});
					}
				}

				returnData.sort((a, b) => {
					const aName= a.name.toLowerCase();
					const bName= b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the views to display them to user so that he can
			// select them easily
			async getViews(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { items } = await googleApiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					'https://www.googleapis.com/analytics/v3/management/accounts/~all/webproperties/~all/profiles',
				);

				for (const item of items) {
					returnData.push({
						name: item.name,
						value: item.id,
						description: item.websiteUrl,
					});
				}
				return returnData;
			},

			async getProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const {accounts} = await googleApiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					'https://analyticsadmin.googleapis.com/v1alpha/accounts',
				);

				for (const acount of accounts || []) {
					const { properties } = await googleApiRequest.call(
						this,
						'GET',
						'',
						{},
						{ filter: `parent:${acount.name}` },
						`https://analyticsadmin.googleapis.com/v1alpha/properties`,
					);

					if (properties && properties.length > 0) {
						for (const property of properties) {
							returnData.push({
								name: property.displayName,
								value: property.name,
							});
						}
					}
				}

				return returnData;
			},

			async getDimensionsGA4(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const propertyId = this.getCurrentNodeParameter('propertyId');
				const { dimensions } = await googleApiRequest.call(
					this,
					'GET',
					`/v1beta/${propertyId}/metadata`,
					{},
					{fields: 'dimensions'},
				);

				for (const dimesion of dimensions) {
					returnData.push(
						{
							name: dimesion.uiName as string,
							value: dimesion.apiName as string,
							description: dimesion.description as string,
						},
					);
				}

				returnData.sort((a, b) => {
					const aName= a.name.toLowerCase();
					const bName= b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},

			async getMetricsGA4(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const propertyId = this.getCurrentNodeParameter('propertyId');
				const { metrics } = await googleApiRequest.call(
					this,
					'GET',
					`/v1beta/${propertyId}/metadata`,
					{},
					{fields: 'metrics'},
				);

				for (const metric of metrics) {
					returnData.push(
						{
							name: metric.uiName as string,
							value: metric.apiName as string,
							description: metric.description as string,
						},
					);
				}

				returnData.sort((a, b) => {
					const aName= a.name.toLowerCase();
					const bName= b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

		let method = '';
		const qs: IDataObject = {};
		let endpoint = '';
		let responseData;
		for (let i = 0; i < items.length; i++) {
			try {
				if(resource === 'report') {
					if(operation === 'get' && apiVersion === 'reportingAPI') {
						//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet
						method = 'POST';
						endpoint = '/v4/reports:batchGet';
						const viewId = this.getNodeParameter('viewId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						const simple = this.getNodeParameter('simple', i) as boolean;

						const body: IData = {
							viewId,
						};

						if (additionalFields.useResourceQuotas) {
							qs.useResourceQuotas = additionalFields.useResourceQuotas;
						}
						if (additionalFields.dateRangesUi) {
							const dateValues = (additionalFields.dateRangesUi as IDataObject).dateRanges as IDataObject;
							if (dateValues) {
								const start = dateValues.startDate as string;
								const end = dateValues.endDate as string;
								Object.assign(
									body,
									{
										dateRanges:
											[
												{
													startDate: moment(start).utc().format('YYYY-MM-DD'),
													endDate: moment(end).utc().format('YYYY-MM-DD'),
												},
											],
									},
								);
							}
						}

						if (additionalFields.metricsUi) {
							const metrics = (additionalFields.metricsUi as IDataObject).metricValues as IDataObject[];
							body.metrics = metrics;
						}
						if (additionalFields.dimensionUi) {
							const dimensions = (additionalFields.dimensionUi as IDataObject).dimensionValues as IDataObject[];
							if (dimensions) {
								body.dimensions = dimensions;
							}
						}
						if (additionalFields.dimensionFiltersUi) {
							const dimensionFilters = (additionalFields.dimensionFiltersUi as IDataObject).filterValues as IDataObject[];
							if (dimensionFilters) {
								dimensionFilters.forEach(filter => filter.expressions = [filter.expressions]);
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

						if (returnAll === true) {
							responseData = await googleApiRequestAllItems.call(this, 'reports', method, endpoint, { reportRequests: [body] }, qs);
						} else {
							responseData = await googleApiRequest.call(this, method, endpoint, { reportRequests: [body] }, qs);
							responseData = responseData.reports;
						}

						if (simple === true) {
							responseData = simplify(responseData);
						} else if (returnAll === true && responseData.length > 1) {
							responseData = merge(responseData);
						}
					}

					if(operation === 'get' && apiVersion === 'dataAPI') {
						//migration guide: https://developers.google.com/analytics/devguides/migration/api/reporting-ua-to-ga4#core_reporting
						const propertyId = this.getNodeParameter('propertyId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						method = 'POST';
						endpoint = `/v1beta/${propertyId}:runReport`;

						const body: IDataObject = {};

						if (additionalFields.currencyCode) {
							body.currencyCode = additionalFields.currencyCode;
						}

						if (additionalFields.dateRangesUi) {
							const dateRanges = (additionalFields.dateRangesUi as IDataObject).dateRanges as IDataObject[];
							if(dateRanges) {
								body.dateRanges = dateRanges.map(range => {
									const dateRange: IDataObject = {
										startDate: moment(range.startDate as string).utc().format('YYYY-MM-DD'),
										endDate: moment(range.endDate as string).utc().format('YYYY-MM-DD'),
									};

									if (range.name) {
										dateRange.name = range.name;
									}

									return dateRange;
								});
							}
						}

						if (additionalFields.dimensionFiltersUI) {
							const {filterExpressionType, expression} = (additionalFields.dimensionFiltersUI as IDataObject).filterExpressions as IDataObject;
							if (expression) {
								body.dimensionFilter = {
									[filterExpressionType as string]: {expressions: processFilters(expression as IDataObject)},
								};
							}
						}

						if (additionalFields.dimensionUi) {
							const dimensions = (additionalFields.dimensionUi as IDataObject).dimensionValues as IDataObject[];
							if (dimensions) {
								body.dimensions = dimensions;
							}
						}

						if (additionalFields.metricUi) {
							const metrics = (additionalFields.metricUi as IDataObject).metricValues as IDataObject[];
							if (metrics) {
								body.metrics = metrics;
							}
						}

						if (additionalFields.metricsFiltersUI) {
							const {filterExpressionType, expression} = (additionalFields.metricsFiltersUI as IDataObject).filterExpressions as IDataObject;
							if (expression) {
								body.metricFilter = {
									[filterExpressionType as string]: {expressions: processFilters(expression as IDataObject)},
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
							const metricOrderBy = (additionalFields.orderByUI as IDataObject).metricOrderBy as IDataObject[];
							const dimmensionOrderBy = (additionalFields.orderByUI as IDataObject).dimmensionOrderBy as IDataObject[];
							if (metricOrderBy) {
								orderBys = orderBys.concat(metricOrderBy.map(order => {
									return {
										desc: order.desc,
										metric: {
											metricName: order.metricName,
										},
									};
								}));
							}
							if (dimmensionOrderBy) {
								orderBys = orderBys.concat(dimmensionOrderBy.map(order => {
									return {
										desc: order.desc,
										dimension: {
											dimensionName: order.dimensionName,
											orderType: order.orderType,
										},
									};
								}));
							}
							body.orderBys = orderBys;
						}

						if (additionalFields.returnPropertyQuota) {
							body.returnPropertyQuota = additionalFields.returnPropertyQuota;
						}

						if (returnAll === true) {
							// responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
							responseData = await googleApiRequestAllItems.call(this, '', method, endpoint, body, qs);
							// responseData = responseData.rows;
						} else {
							body.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
							// responseData = responseData.rows;
						}
					}
				}
				if (resource === 'userActivity') {
					if (operation === 'search') {
						//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/userActivity/search
						method = 'POST';
						endpoint = '/v4/userActivity:search';
						const viewId = this.getNodeParameter('viewId', i);
						const userId = this.getNodeParameter('userId', i);
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						const body: IDataObject = {
							viewId,
							user: {
								userId,
							},
						};
						if (additionalFields.activityTypes) {
							Object.assign(body, { activityTypes: additionalFields.activityTypes });
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(this, 'sessions', method, endpoint, body);
						} else {
							body.pageSize = this.getNodeParameter('limit', 0) as number;
							responseData = await googleApiRequest.call(this, method, endpoint, body);
							responseData = responseData.sessions;
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
