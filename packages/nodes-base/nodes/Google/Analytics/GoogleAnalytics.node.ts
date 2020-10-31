import { 
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { 
	reportFields,
	reportOperations,
} from './reportDescription';

import { 
	userActivityFields,
	userActivityOperations,
} from './userActivityDescription';

import { 
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import * as moment from 'moment-timezone';

export class GoogleAnalytics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Analytics',
		name: 'googleAnalytics',
		icon: 'file:analytics.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Google Analytics API',
		defaults: {
			name: 'Google Analytics',
			color: '#772244',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
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
				default:'report',
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


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let method = '';
		const qs: IDataObject = {};
		let endpoint = '';
		let responseData;
		for (let i = 0; i < items.length; i++) {
			if(resource === 'reports') {
				if(operation === 'getAll') {
					//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet
					method = 'POST';
					endpoint = '/v4/reports:batchGet';
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const viewId = this.getNodeParameter('viewId', i) as string;
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i,
					) as IDataObject;
					const body: IDataObject = {
							viewId,
					};
					if(additionalFields.useResourceQuotas){
						qs.useResourceQuotas = additionalFields.useResourceQuotas;
					}
					if(additionalFields.dateRangesUi){
						const dateValues = (additionalFields.dateRangesUi as IDataObject).dateRanges as IDataObject;
						if(dateValues){
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
					if(additionalFields.metrics){
						const expression = (additionalFields.metrics as IDataObject).expression as string;
						const formattingType = (additionalFields.metrics as IDataObject).formattingType as string;
						let metricsValues: IDataObject[] = [];
						if(expression){
							metricsValues = [ { ...metricsValues[0], expression } ];
						}
						if(formattingType){
							metricsValues = [ { ...metricsValues[0], formattingType }];
						}
						Object.assign(body, { metrics: metricsValues });
					}
					if(additionalFields.dimensionName){
						Object.assign(body, {dimensions:[{name:additionalFields.dimensionName}]});
					}
					if(additionalFields.includeEmptyRows){
						Object.assign(body, {includeEmptyRows: additionalFields.includeEmptyRows});
					}
					if(additionalFields.hideTotals){
						Object.assign(body, {hideTotals: additionalFields.hideTotals});
					}
					if(additionalFields.hideValueRanges){
						Object.assign(body, {hideTotals: additionalFields.hideTotals});
					}

					if (returnAll === true) {
						responseData = await googleApiRequestAllItems.call(this, 'reports', method, endpoint, { reportRequests: [body] }, qs);
					} else {
						body.pageSize = this.getNodeParameter('limit', 0) as number;
						responseData = await googleApiRequest.call(this, method, endpoint,  { reportRequests: [body] }, qs);
						responseData = responseData.reports;
					}
				}
			}
			if(resource === 'userActivity') {
				if(operation === 'search') {
					// https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/userActivity/search
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
					if(additionalFields.activityTypes){
						Object.assign(body,{activityTypes:additionalFields.activityTypes});
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
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
