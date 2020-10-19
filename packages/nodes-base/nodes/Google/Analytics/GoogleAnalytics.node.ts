import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import * as moment from 'moment-timezone';
import { reportsOperations, reportsFields } from './reportsDescription';
import { userActivityOperations, userActivityFields } from './userActivityDescription';
import { googleApiRequest } from './GenericFunctions';

export class GoogleAnalytics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Analytics',
		name: 'googleAnalytics',
		icon: 'file:analytics.svg',
		group: ['transform'],
		version: 1,
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
						name: 'Reports',
						value: 'reports'
					},
					{
						name: 'User Activity',
						value: 'userActivity'
					}
				],
				default:'reports'
			},
			//-------------------------------
			// Reports Operations
			//-------------------------------
			...reportsOperations,
			...reportsFields,

			//-------------------------------
			// User Activity Operations
			//-------------------------------
			...userActivityOperations,
			...userActivityFields
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let method = '';
		let body: IDataObject = {};
		let qs: IDataObject = {};
		let endpoint = '';
		let responseData;
		for (let i = 0; i < items.length; i++) {
			if(resource === 'reports') {
				if(operation === 'batchGet') {
					//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet
					method = 'POST';
					endpoint = '/v4/reports:batchGet';
					const viewId = this.getNodeParameter('viewId', i);
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					body = {
						"reportRequests":{
							viewId
						}
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
								body.reportRequests, 
								{
									dateRanges:
									[
										{
											startDate: moment(start).utc().format('YYYY-MM-DD'),
											endDate: moment(end).utc().format('YYYY-MM-DD')
										}
									]
								}
							)
						}
					}
					if(additionalFields.metrics){
						const expression = (additionalFields.metrics as IDataObject).expression as string;
						const formattingType = (additionalFields.metrics as IDataObject).formattingType as string;
						let metricsValues: IDataObject[] = [];
						if(expression){
							metricsValues = [{...metricsValues[0], expression:expression}]
						}
						if(formattingType){
							metricsValues = [{...metricsValues[0], formattingType:formattingType}]
						}
						Object.assign(body.reportRequests,{metrics: metricsValues})
					}
					if(additionalFields.dimensionName){
						Object.assign(body.reportRequests,{dimensions:[{name:additionalFields.dimensionName}]});
					}
					if(additionalFields.pageSize){
						Object.assign(body.reportRequests,{pageSize: additionalFields.pageSize});
					}
					if(additionalFields.includeEmptyRows){
						Object.assign(body.reportRequests,{includeEmptyRows: additionalFields.includeEmptyRows});
					}
					if(additionalFields.hideTotals){
						Object.assign(body.reportRequests,{hideTotals: additionalFields.hideTotals});
					}
					if(additionalFields.hideValueRanges){
						body.reportRequests = {...(body.reportRequests as IDataObject), hideValueRanges: additionalFields.hideValueRanges}
					}
					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					responseData = responseData.reports;
				}
			}
			if(resource === 'userActivity') {
				if(operation === 'search') {
					// https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/userActivity/search
					method = 'POST';
					endpoint = '/v4/userActivity:search';
					const viewId = this.getNodeParameter('viewId', i);
					const userId = this.getNodeParameter('userId', i);
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					body = {
						viewId,
						user: {
							userId
						}
					};
					if(additionalFields.activityTypes){
						Object.assign(body,{activityTypes:additionalFields.activityTypes})
					}
					if(additionalFields.pageSize) {
						Object.assign(body,{pageSize:additionalFields.pageSize})
					}
					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					responseData = responseData.reports;
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];

	}
}
