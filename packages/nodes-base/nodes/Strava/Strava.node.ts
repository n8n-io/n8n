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
	stravaApiRequest,
	stravaApiRequestAllItems,
} from './GenericFunctions';

import {
	activityFields,
	activityOperations,
} from './ActivityDescription';

import moment from 'moment';

export class Strava implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strava',
		name: 'strava',
		icon: 'file:strava.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Strava API',
		defaults: {
			name: 'Strava',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'stravaOAuth2Api',
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
						name: 'Activity',
						value: 'activity',
					},
				],
				default: 'activity',
				description: 'The resource to operate on.',
			},
			...activityOperations,
			...activityFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {

			try {
				if (resource === 'activity') {
					//https://developers.strava.com/docs/reference/#api-Activities-createActivity
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i);

						const type = this.getNodeParameter('type', i) as string;

						const startDate = this.getNodeParameter('startDate', i);

						const elapsedTime = this.getNodeParameter('elapsedTime', i) as number;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.trainer === true) {
							additionalFields.trainer = 1;
						}

						if (additionalFields.commute === true) {
							additionalFields.commute = 1;
						}

						const body: IDataObject = {
							name,
							type,
							start_date_local: moment(startDate).toISOString(),
							elapsed_time: elapsedTime,
						};

						Object.assign(body, additionalFields);

						responseData = await stravaApiRequest.call(this, 'POST', '/activities', body);
					}
					//https://developers.strava.com/docs/reference/#api-Activities-getActivityById
					if (operation === 'get') {
						const activityId = this.getNodeParameter('activityId', i);

						responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}`);
					}
					if (['getLaps', 'getZones', 'getKudos', 'getComments'].includes(operation)) {

						const path: IDataObject = {
							'getComments': 'comments',
							'getZones': 'zones',
							'getKudos': 'kudos',
							'getLaps': 'laps',
						};

						const activityId = this.getNodeParameter('activityId', i);

						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/${path[operation]}`);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					//https://developers.strava.com/docs/reference/#api-Streams-getActivityStreams
					if (operation === 'getStreams') {
						const activityId = this.getNodeParameter('activityId', i);
						const keys = this.getNodeParameter('keys', i) as string[];
						qs.keys = keys.toString();
						qs.key_by_type = true;

						responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/streams`, {}, qs);
					}
					//https://developers.mailerlite.com/reference#subscribers
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {

							responseData = await stravaApiRequestAllItems.call(this, 'GET', `/activities`, {}, qs);
						} else {
							qs.per_page = this.getNodeParameter('limit', i);

							responseData = await stravaApiRequest.call(this, 'GET', `/activities`, {}, qs);
						}
					}
					//https://developers.strava.com/docs/reference/#api-Activities-updateActivityById
					if (operation === 'update') {
						const activityId = this.getNodeParameter('activityId', i);

						const updateFields = this.getNodeParameter('updateFields', i);

						if (updateFields.trainer === true) {
							updateFields.trainer = 1;
						}

						if (updateFields.commute === true) {
							updateFields.commute = 1;
						}

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						responseData = await stravaApiRequest.call(this, 'PUT', `/activities/${activityId}`, body);
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
