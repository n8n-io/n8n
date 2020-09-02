import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	venafiApiRequest,
	venafiApiRequestAllItems,
} from './GenericFunctions';

import {
	certificateOperations,
	certificateFields,
} from './CertificateDescription';

import * as moment from 'moment-timezone';

export class VenafiTpp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TPP',
		name: 'venafiTpp',
		icon: 'file:venafi.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Venafi TPP API.',
		defaults: {
			name: 'Venafi TPP',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'venafiTppApi',
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
						name: 'Certificate',
						value: 'certificate',
					},
				],
				default: 'certificate',
				description: 'The resource to operate on.'
			},
			...certificateOperations,
			...certificateFields,
		],
	};

	// methods = {
	// 	loadOptions: {
	// 		// Get all the calendars to display them to user so that he can
	// 		// select them easily
	// 		async getCalendars(
	// 			this: ILoadOptionsFunctions
	// 		): Promise<INodePropertyOptions[]> {
	// 			const returnData: INodePropertyOptions[] = [];
	// 			const calendars = await googleApiRequestAllItems.call(
	// 				this,
	// 				'items',
	// 				'GET',
	// 				'/calendar/v3/users/me/calendarList'
	// 			);
	// 			for (const calendar of calendars) {
	// 				const calendarName = calendar.summary;
	// 				const calendarId = calendar.id;
	// 				returnData.push({
	// 					name: calendarName,
	// 					value: calendarId
	// 				});
	// 			}
	// 			return returnData;
	// 		},
	// 		// Get all the colors to display them to user so that he can
	// 		// select them easily
	// 		async getColors(
	// 			this: ILoadOptionsFunctions
	// 		): Promise<INodePropertyOptions[]> {
	// 			const returnData: INodePropertyOptions[] = [];
	// 			const { event } = await googleApiRequest.call(
	// 				this,
	// 				'GET',
	// 				'/calendar/v3/colors'
	// 			);
	// 			for (const key of Object.keys(event)) {
	// 				const colorName = `Background: ${event[key].background} - Foreground: ${event[key].foreground}`;
	// 				const colorId = key;
	// 				returnData.push({
	// 					name: `${colorName}`,
	// 					value: colorId
	// 				});
	// 			}
	// 			return returnData;
	// 		},
	// 		// Get all the timezones to display them to user so that he can
	// 		// select them easily
	// 		async getTimezones(
	// 			this: ILoadOptionsFunctions
	// 		): Promise<INodePropertyOptions[]> {
	// 			const returnData: INodePropertyOptions[] = [];
	// 			for (const timezone of moment.tz.names()) {
	// 				const timezoneName = timezone;
	// 				const timezoneId = timezone;
	// 				returnData.push({
	// 					name: timezoneName,
	// 					value: timezoneId
	// 				});
	// 			}
	// 			return returnData;
	// 		}
	// 	}
	// };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'certificate') {
				//https://developers.google.com/calendar/v3/reference/events/list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (returnAll) {
						// responseData = await googleApiRequestAllItems.call(
						// 	this,
						// 	'items',
						// 	'GET',
						// 	`/calendar/v3/calendars/${calendarId}/events`,
						// 	{},
						// 	qs
						// );
					} else {
						//qs.maxResults = this.getNodeParameter('limit', i) as number;
						responseData = await venafiApiRequest.call(
							this,
							'GET',
							`/Certificates/Retrieve`,
							{},
							qs
						);
						// responseData = responseData.items;
					}
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
