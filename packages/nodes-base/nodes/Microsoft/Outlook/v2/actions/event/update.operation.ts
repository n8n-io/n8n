import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

import { DateTime } from 'luxon';

export const description: INodeProperties[] = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Preview',
				name: 'bodyPreview',
				type: 'string',
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Categories',
				name: 'categories',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCategoriesNames',
				},
				default: [],
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Hide Attendees',
				name: 'hideAttendees',
				type: 'boolean',
				default: false,
				description:
					'Whether set to true, each attendee only sees themselves in the meeting request and meeting Tracking list',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				default: 'low',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
			},
			{
				displayName: 'Is All Day',
				name: 'isAllDay',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Cancelled',
				name: 'isCancelled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Draft',
				name: 'isDraft',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'isOnlineMeeting',
				name: 'isOnlineMeeting',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Sensitivity',
				name: 'sensitivity',
				type: 'options',
				default: 'normal',
				options: [
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'Personal',
						value: 'personal',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Confidential',
						value: 'confidential',
					},
				],
			},
			{
				displayName: 'Show As',
				name: 'showAs',
				type: 'options',
				default: 'free',
				options: [
					{
						name: 'Busy',
						value: 'busy',
					},
					{
						name: 'Free',
						value: 'free',
					},
					{
						name: 'Oof',
						value: 'oof',
					},
					{
						name: 'Tentative',
						value: 'tentative',
					},
					{
						name: 'Working Elsewhere',
						value: 'workingElsewhere',
					},
				],
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'singleInstance',
				options: [
					{
						name: 'Single Instance',
						value: 'singleInstance',
					},
					{
						name: 'Occurrence',
						value: 'occurrence',
					},
					{
						name: 'Exception',
						value: 'exception',
					},
					{
						name: 'Series Master',
						value: 'seriesMaster',
					},
				],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;

	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	const eventId = this.getNodeParameter('eventId', index) as string;

	let timeZone = 'UTC';

	if (additionalFields.timeZone) {
		timeZone = additionalFields.timeZone as string;
		delete additionalFields.timeZone;
	}

	if (additionalFields.body) {
		additionalFields.body = {
			content: additionalFields.body,
			contentType: 'html',
		};
	}

	let startDateTime = additionalFields.start as string;
	let endDateTime = additionalFields.end as string;

	if (additionalFields.isAllDay) {
		startDateTime =
			DateTime.fromISO(startDateTime, { zone: timeZone }).toFormat('yyyy-MM-dd') ||
			DateTime.utc().toFormat('yyyy-MM-dd');
		endDateTime =
			DateTime.fromISO(endDateTime, { zone: timeZone }).toFormat('yyyy-MM-dd') ||
			DateTime.utc().toFormat('yyyy-MM-dd');

		const minimalWholeDayDuration = 24;
		const duration = DateTime.fromISO(startDateTime, { zone: timeZone }).diff(
			DateTime.fromISO(endDateTime, { zone: timeZone }),
		).hours;

		if (duration < minimalWholeDayDuration) {
			endDateTime = DateTime.fromISO(startDateTime, { zone: timeZone }).plus({ hours: 24 }).toISO();
		}
	}

	const body: IDataObject = {
		...additionalFields,
	};

	if (startDateTime) {
		body.start = {
			dateTime: startDateTime,
			timeZone,
		};
	}

	if (endDateTime) {
		body.end = {
			dateTime: endDateTime,
			timeZone,
		};
	}

	const endpoint = `/calendar/events/${eventId}`;

	responseData = await microsoftApiRequest.call(this, 'PATCH', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
