import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { eventOperations, eventFields } from './descriptions';

import {
	getPicklistCalendarOptions,
	getPicklistEventOptions,
	zohoCalendarApiRequest,
	getAttendeesList,
	datesplit,
	getDateAndTime,
	getEventDetails,
} from './GenericFunctions';

export class ZohoCalendar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho Calendar',
		name: 'zohoCalendar',
		icon: 'file:ZohoCalendar.png',
		group: ['transform'],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		version: 1,
		description: 'Consume Zoho Calendar API',
		defaults: {
			name: 'Zoho Calendar',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zohoCalendarOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Event',
						value: 'event',
					},
				],
				default: 'event',
			},
			...eventOperations,
			...eventFields,
		],
	};

	methods = {
		loadOptions: {
			async getListCalendar(this: ILoadOptionsFunctions) {
				return await getPicklistCalendarOptions.call(this);
			},
			async getListEvent(this: ILoadOptionsFunctions) {
				const calendarId = this.getCurrentNodeParameter('calendar_id', {
					extractValue: true,
				}) as string;
				return await getPicklistEventOptions.call(this, calendarId.toString());
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'event') {
					// **********************************************************************
					//                                event
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             event: create
						// ----------------------------------------

						// Get the necessary parameters
						var start = datesplit(this.getNodeParameter('start', i));
						var end = datesplit(this.getNodeParameter('end', i));
						if (
							this.getNodeParameter('isallday', i) !== undefined &&
							this.getNodeParameter('isallday', i) !== null &&
							this.getNodeParameter('isallday', i) === true
						) {
							start = getDateAndTime(start);
							end = getDateAndTime(end);
						}
						var title = this.getNodeParameter('title', i);

						var eventdata = `{"dateandtime": {"start": "${start}","end": "${end}"},"title": "${title}"`;

						if (
							this.getNodeParameter('isallday', i) !== undefined &&
							this.getNodeParameter('isallday', i) !== null
						) {
							eventdata += `, "isallday": "${this.getNodeParameter('isallday', i)}"`;
						}
						if (
							this.getNodeParameter('color', i) !== '' &&
							this.getNodeParameter('color', i) !== undefined &&
							this.getNodeParameter('color', i) !== null
						) {
							eventdata += `, "color": "${this.getNodeParameter('color', i)}"`;
						}
						if (
							this.getNodeParameter('description', i) !== '' &&
							this.getNodeParameter('description', i) !== undefined &&
							this.getNodeParameter('description', i) !== null
						) {
							eventdata += `, "description": "${this.getNodeParameter('description', i)}"`;
						}
						if (
							this.getNodeParameter('location', i) !== '' &&
							this.getNodeParameter('location', i) !== undefined &&
							this.getNodeParameter('location', i) !== null
						) {
							eventdata += `, "location": "${this.getNodeParameter('location', i)}"`;
						}
						if (
							this.getNodeParameter('isprivate', i) !== undefined &&
							this.getNodeParameter('isprivate', i) !== null
						) {
							eventdata += `, "isprivate": "${this.getNodeParameter('isprivate', i)}"`;
						}
						if (
							this.getNodeParameter('transparency', i) !== undefined &&
							this.getNodeParameter('transparency', i) !== null
						) {
							eventdata += `, "transparency": "${this.getNodeParameter('transparency', i)}"`;
						}
						if (
							this.getNodeParameter('attendees', i) !== '' &&
							this.getNodeParameter('attendees', i) !== undefined &&
							this.getNodeParameter('attendees', i) != null
						) {
							eventdata += `, "attendees": ${getAttendeesList(this.getNodeParameter('attendees', i))}`;
						}
						if (
							this.getNodeParameter('allowForwarding', i) !== undefined &&
							this.getNodeParameter('allowForwarding', i) !== null
						) {
							eventdata += `, "allowForwarding": "${this.getNodeParameter('allowForwarding', i)}"`;
						}
						eventdata += '}';
						const qs: IDataObject = { eventdata };
						responseData = await zohoCalendarApiRequest.call(
							this,
							'POST',
							`api/v1/calendars/${this.getNodeParameter('calendar_id', i)}/events`,
							{},
							qs,
						);
						responseData = responseData.events;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             event: delete
						// ----------------------------------------
						var eventdata = `{"etag": "${await getEventDetails.call(this, this.getNodeParameter('calendar_id', i), this.getNodeParameter('event', i))}"}`;
						const qs: IDataObject = { eventdata };
						responseData = await zohoCalendarApiRequest.call(
							this,
							'DELETE',
							`api/v1/calendars/${this.getNodeParameter('calendar_id', i)}/events/${this.getNodeParameter('event', i)}`,
							{},
							qs,
						);
						responseData = responseData.events;
					} else if (operation === 'update') {
						// ----------------------------------------
						//             event: update
						// ----------------------------------------
						var start = datesplit(this.getNodeParameter('start', i));
						var end = datesplit(this.getNodeParameter('end', i));
						if (
							this.getNodeParameter('isallday', i) !== undefined &&
							this.getNodeParameter('isallday', i) !== null &&
							this.getNodeParameter('isallday', i) === true
						) {
							start = getDateAndTime(start);
							end = getDateAndTime(end);
						}
						var title = this.getNodeParameter('title', i);

						var eventdata = `{"dateandtime": {"start": "${start}","end": "${end}"},"title": "${title}","etag": "${await getEventDetails.call(this, this.getNodeParameter('calendar_id', i), this.getNodeParameter('event', i))}"`;

						if (
							this.getNodeParameter('isallday', i) !== undefined &&
							this.getNodeParameter('isallday', i) !== null
						) {
							eventdata += `, "isallday": "${this.getNodeParameter('isallday', i)}"`;
						}
						if (
							this.getNodeParameter('color', i) !== '' &&
							this.getNodeParameter('color', i) !== undefined &&
							this.getNodeParameter('color', i) !== null
						) {
							eventdata += `, "color": "${this.getNodeParameter('color', i)}"`;
						}
						if (
							this.getNodeParameter('description', i) !== '' &&
							this.getNodeParameter('description', i) !== undefined &&
							this.getNodeParameter('description', i) !== null
						) {
							eventdata += `, "description": "${this.getNodeParameter('description', i)}"`;
						}
						if (
							this.getNodeParameter('location', i) !== '' &&
							this.getNodeParameter('location', i) !== undefined &&
							this.getNodeParameter('location', i) !== null
						) {
							eventdata += `, "location": "${this.getNodeParameter('location', i)}"`;
						}
						if (
							this.getNodeParameter('isprivate', i) !== undefined &&
							this.getNodeParameter('isprivate', i) !== null
						) {
							eventdata += `, "isprivate": "${this.getNodeParameter('isprivate', i)}"`;
						}
						if (
							this.getNodeParameter('transparency', i) !== undefined &&
							this.getNodeParameter('transparency', i) !== null
						) {
							eventdata += `, "transparency": "${this.getNodeParameter('transparency', i)}"`;
						}
						if (
							this.getNodeParameter('attendees', i) !== '' &&
							this.getNodeParameter('attendees', i) !== undefined &&
							this.getNodeParameter('attendees', i) != null
						) {
							eventdata += `, "attendees": ${getAttendeesList(this.getNodeParameter('attendees', i))}`;
						}
						if (
							this.getNodeParameter('allowForwarding', i) !== undefined &&
							this.getNodeParameter('allowForwarding', i) !== null
						) {
							eventdata += `, "allowForwarding": "${this.getNodeParameter('allowForwarding', i)}"`;
						}
						eventdata += '}';
						const qs: IDataObject = { eventdata };
						responseData = await zohoCalendarApiRequest.call(
							this,
							'PUT',
							`api/v1/calendars/${this.getNodeParameter('calendar_id', i)}/events/${this.getNodeParameter('event', i)}`,
							{},
							qs,
						);
						responseData = responseData.events;
					} else if (operation === 'quick_event') {
						// ----------------------------------------
						//             account: add quick event'
						// ----------------------------------------
						const saddtext = this.getNodeParameter('saddtext', i);
						const qs: IDataObject = { saddtext: saddtext };
						responseData = await zohoCalendarApiRequest.call(
							this,
							'POST',
							'api/v1/smartadd',
							{},
							qs,
						);
						responseData = responseData.events;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}
		return [returnData];
	}
}
