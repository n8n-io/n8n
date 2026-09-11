import * as ics from 'ics';
import moment from 'moment-timezone';
import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { promisify } from 'util';

const createEvent = promisify(ics.createEvent);

export const description: INodeProperties[] = [
	{ displayName: 'Event Title', name: 'title', type: 'string', default: '' },
	{ displayName: 'Start', name: 'start', type: 'dateTime', default: '', required: true },
	{ displayName: 'End', name: 'end', type: 'dateTime', default: '', required: true },
	{ displayName: 'All Day', name: 'allDay', type: 'boolean', default: false },
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Attendees',
				name: 'attendeesUi',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						displayName: 'Attendees',
						name: 'attendeeValues',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', required: true, default: '' },
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'name@email.com',
								required: true,
								default: '',
							},
							{ displayName: 'RSVP', name: 'rsvp', type: 'boolean', default: false },
						],
					},
				],
			},
			{
				displayName: 'Busy Status',
				name: 'busyStatus',
				type: 'options',
				options: [
					{ name: 'Busy', value: 'BUSY' },
					{ name: 'Tentative', value: 'TENTATIVE' },
				],
				default: '',
			},
			{ displayName: 'Calendar Name', name: 'calName', type: 'string', default: '' },
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'File Name', name: 'fileName', type: 'string', default: '' },
			{
				displayName: 'Geolocation',
				name: 'geolocationUi',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Geolocation',
						name: 'geolocationValues',
						values: [
							{ displayName: 'Latitude', name: 'lat', type: 'string', default: '' },
							{ displayName: 'Longitude', name: 'lon', type: 'string', default: '' },
						],
					},
				],
			},
			{ displayName: 'Location', name: 'location', type: 'string', default: '' },
			{ displayName: 'Recurrence Rule', name: 'recurrenceRule', type: 'string', default: '' },
			{
				displayName: 'Organizer',
				name: 'organizerUi',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Organizer',
						name: 'organizerValues',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', required: true, default: '' },
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'name@email.com',
								required: true,
								default: '',
							},
						],
					},
				],
			},
			{ displayName: 'Sequence', name: 'sequence', type: 'number', default: 0 },
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Confirmed', value: 'CONFIRMED' },
					{ name: 'Cancelled', value: 'CANCELLED' },
					{ name: 'Tentative', value: 'TENTATIVE' },
				],
				default: 'CONFIRMED',
			},
			{ displayName: 'UID', name: 'uid', type: 'string', default: '' },
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'Use Workflow Timezone',
				name: 'useWorkflowTimezone',
				type: 'boolean',
				default: false,
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	const workflowTimezone = this.getTimezone();

	for (let i = 0; i < items.length; i++) {
		try {
			const title = this.getNodeParameter('title', i) as string;
			const allDay = this.getNodeParameter('allDay', i) as boolean;
			let start = this.getNodeParameter('start', i) as string;
			let end = this.getNodeParameter('end', i) as string;
			if (!end) end = start;
			end = allDay ? moment(end).utc().add(1, 'day').format() : end;

			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const options = this.getNodeParameter('additionalFields', i) as IDataObject;
			if (options.useWorkflowTimezone) {
				start = moment(start).tz(workflowTimezone).format();
				end = moment(end).tz(workflowTimezone).format();
				delete options.useWorkflowTimezone;
			}

			let fileName = 'event.ics';
			const eventStart = moment(start)
				.toArray()
				.splice(0, allDay ? 3 : 6) as ics.DateArray;
			const eventEnd = moment(end)
				.toArray()
				.splice(0, allDay ? 3 : 6) as ics.DateArray;
			eventStart[1]++;
			eventEnd[1]++;

			if (options.fileName) {
				fileName = options.fileName as string;
				delete options.fileName;
			}

			const data: ics.EventAttributes = {
				title,
				start: eventStart,
				end: eventEnd,
				startInputType: 'utc',
				endInputType: 'utc',
			};
			if (options.geolocationUi) {
				data.geo = (options.geolocationUi as IDataObject).geolocationValues as ics.GeoCoordinates;
				delete options.geolocationUi;
			}
			if (options.organizerUi) {
				data.organizer = (options.organizerUi as IDataObject).organizerValues as ics.Person;
				delete options.organizerUi;
			}
			if (options.attendeesUi) {
				data.attendees = (options.attendeesUi as IDataObject).attendeeValues as ics.Attendee[];
				delete options.attendeesUi;
			}
			Object.assign(data, options);

			const buffer = Buffer.from((await createEvent(data)) as string);
			const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, 'text/calendar');
			returnData.push({
				json: {},
				binary: { [binaryPropertyName]: binaryData },
				pairedItem: { item: i },
			});
		} catch (error) {
			const errorDescription = error.description;
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description: errorDescription,
			});
		}
	}

	return returnData;
}
