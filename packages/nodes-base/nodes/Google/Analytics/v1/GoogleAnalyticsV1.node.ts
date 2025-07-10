import moment from 'moment-timezone';
import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IHttpRequestMethods,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { oldVersionNotice } from '@utils/descriptions';

import { googleApiRequest, googleApiRequestAllItems, merge, simplify } from './GenericFunctions';
import type { IData } from './Interfaces';
import { reportFields, reportOperations } from './ReportDescription';
import { userActivityFields, userActivityOperations } from './UserActivityDescription';

const versionDescription: INodeTypeDescription = {
	displayName: 'Google Analytics',
	name: 'googleAnalytics',
	icon: 'file:analytics.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Use the Google Analytics API',
	defaults: {
		name: 'Google Analytics',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'googleAnalyticsOAuth2',
			required: true,
		},
	],
	properties: [
		oldVersionNotice,
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

export class GoogleAnalyticsV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			// Get all the dimensions to display them to user so that they can
			// select them easily
			async getDimensions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { items: dimensions } = await googleApiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					'https://www.googleapis.com/analytics/v3/metadata/ga/columns',
				);

				for (const dimension of dimensions) {
					if (
						dimension.attributes.type === 'DIMENSION' &&
						dimension.attributes.status !== 'DEPRECATED'
					) {
						returnData.push({
							name: dimension.attributes.uiName,
							value: dimension.id,
							description: dimension.attributes.description,
						});
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) {
						return -1;
					}
					if (aName > bName) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			// Get all the views to display them to user so that they can
			// select them easily
			async getViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let method: IHttpRequestMethods = 'GET';
		const qs: IDataObject = {};
		let endpoint = '';
		let responseData;
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'report') {
					if (operation === 'get') {
						//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet
						method = 'POST';
						endpoint = '/v4/reports:batchGet';
						const viewId = this.getNodeParameter('viewId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const simple = this.getNodeParameter('simple', i) as boolean;

						const body: IData = {
							viewId,
						};

						if (additionalFields.useResourceQuotas) {
							qs.useResourceQuotas = additionalFields.useResourceQuotas;
						}
						if (additionalFields.dateRangesUi) {
							const dateValues = (additionalFields.dateRangesUi as IDataObject)
								.dateRanges as IDataObject;
							if (dateValues) {
								const start = dateValues.startDate as string;
								const end = dateValues.endDate as string;
								Object.assign(body, {
									dateRanges: [
										{
											startDate: moment(start).utc().format('YYYY-MM-DD'),
											endDate: moment(end).utc().format('YYYY-MM-DD'),
										},
									],
								});
							}
						}

						if (additionalFields.metricsUi) {
							const metrics = (additionalFields.metricsUi as IDataObject)
								.metricValues as IDataObject[];
							body.metrics = metrics;
						}
						if (additionalFields.dimensionUi) {
							const dimensions = (additionalFields.dimensionUi as IDataObject)
								.dimensionValues as IDataObject[];
							if (dimensions) {
								body.dimensions = dimensions;
							}
						}
						if (additionalFields.dimensionFiltersUi) {
							const dimensionFilters = (additionalFields.dimensionFiltersUi as IDataObject)
								.filterValues as IDataObject[];
							if (dimensionFilters) {
								dimensionFilters.forEach((filter) => (filter.expressions = [filter.expressions]));
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
					}
				}
				if (resource === 'userActivity') {
					if (operation === 'search') {
						//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/userActivity/search
						method = 'POST';
						endpoint = '/v4/userActivity:search';
						const viewId = this.getNodeParameter('viewId', i);
						const userId = this.getNodeParameter('userId', i);
						const returnAll = this.getNodeParameter('returnAll', 0);
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
							responseData = await googleApiRequestAllItems.call(
								this,
								'sessions',
								method,
								endpoint,
								body,
							);
						} else {
							body.pageSize = this.getNodeParameter('limit', 0);
							responseData = await googleApiRequest.call(this, method, endpoint, body);
							responseData = responseData.sessions;
						}
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
