import * as ics from 'ics';
import moment from 'moment-timezone';
import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { promisify } from 'util';

const createEvent = promisify(ics.createEvent);

export const description: INodeProperties[] = [
	{
		displayName: 'Event Title',
		name: 'title',
		type: 'string',
		default: '',
		placeholder: 'e.g. New Event',
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Date and time at which the event begins. (For all-day events, the time will be ignored.).',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Date and time at which the event ends. (For all-day events, the time will be ignored.).',
		hint: 'If not set, will be equal to the start date',
	},
	{
		displayName: 'All Day',
		name: 'allDay',
		type: 'boolean',
		default: false,
		description: 'Whether the event lasts all day or not',
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the output binary field to put the file in',
		description: 'The field that your iCalendar file will be available under in the output',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Attendees',
				name: 'attendeesUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Attendee',
				default: {},
				options: [
					{
						displayName: 'Attendees',
						name: 'attendeeValues',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'e.g. name@email.com',
								required: true,
								default: '',
							},
							{
								displayName: 'RSVP',
								name: 'rsvp',
								type: 'boolean',
								default: false,
								description: 'Whether the attendee has to confirm attendance or not',
							},
						],
					},
				],
			},
			{
				displayName: 'Busy Status',
				name: 'busyStatus',
				type: 'options',
				options: [
					{
						name: 'Busy',
						value: 'BUSY',
					},
					{
						name: 'Tentative',
						value: 'TENTATIVE',
					},
				],
				default: '',
				description: 'Used to specify busy status for Microsoft applications, like Outlook',
			},
			{
				displayName: 'Calendar Name',
				name: 'calName',
				type: 'string',
				default: '',
				description:
					'Specifies the calendar (not event) name. Used by Apple iCal and Microsoft Outlook. <a href="https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxcical/1da58449-b97e-46bd-b018-a1ce576f3e6d">More info</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. event.ics',
				description: 'The name of the file to be generated. Default name is event.ics.',
			},
			{
				displayName: 'Geolocation',
				name: 'geolocationUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Geolocation',
				default: {},
				options: [
					{
						displayName: 'Geolocation',
						name: 'geolocationValues',
						values: [
							{
								displayName: 'Latitude',
								name: 'lat',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Longitude',
								name: 'lon',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'The intended venue',
			},
			{
				displayName: 'Recurrence Rule',
				name: 'recurrenceRule',
				type: 'string',
				default: '',
				description:
					'A rule to define the repeat pattern of the event (RRULE). (<a href="https://icalendar.org/rrule-tool.html">Rule generator</a>).',
			},
			{
				displayName: 'Organizer',
				name: 'organizerUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Organizer',
				default: {},
				options: [
					{
						displayName: 'Organizer',
						name: 'organizerValues',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'e.g. name@email.com',
								default: '',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Sequence',
				name: 'sequence',
				type: 'number',
				default: 0,
				description:
					'When sending an update for an event (with the same uid), defines the revision sequence number',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Confirmed',
						value: 'CONFIRMED',
					},
					{
						name: 'Cancelled',
						value: 'CANCELLED',
					},
					{
						name: 'Tentative',
						value: 'TENTATIVE',
					},
				],
				default: 'CONFIRMED',
			},
			{
				displayName: 'UID',
				name: 'uid',
				type: 'string',
				default: '',
				description:
					'Universally unique ID for the event (will be auto-generated if not specified here). Should be globally unique.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL associated with event',
			},
			{
				displayName: 'Use Workflow Timezone',
				name: 'useWorkflowTimezone',
				type: 'boolean',
				default: false,
				description: "Whether to use the workflow timezone set in node's settings rather than UTC",
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

			if (!end) {
				end = start;
			}

			end = allDay ? moment(end).utc().add(1, 'day').format() : end;

			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
			const options = this.getNodeParameter('additionalFields', i);

			if (options.useWorkflowTimezone) {
				start = moment(start).tz(workflowTimezone).format();
				end = moment(end).tz(workflowTimezone).format();
				delete options.useWorkflowTimezone;
			}

			let fileName = 'event.ics';

			const eventStart = moment(start)
				.toArray()
				.splice(0, allDay ? 3 : 6) as ics.DateArray;
			eventStart[1]++;

			const eventEnd = moment(end)
				.toArray()
				.splice(0, allDay ? 3 : 6) as ics.DateArray;
			eventEnd[1]++;

			if (options.fileName) {
				fileName = options.fileName as string;
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
				binary: {
					[binaryPropertyName]: binaryData,
				},
				pairedItem: {
					item: i,
				},
			});
		} catch (error) {
			const errorDescription = error.description;
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: i,
					},
				});
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
