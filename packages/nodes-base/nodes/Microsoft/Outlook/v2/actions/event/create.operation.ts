import { DateTime } from 'luxon';
import moment from 'moment-timezone';
import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	calendarRLC,
	{
		displayName: 'Title',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Start',
		name: 'startDateTime',
		type: 'dateTime',
		default: DateTime.now().toISO(),
		required: true,
	},
	{
		displayName: 'End',
		name: 'endDateTime',
		type: 'dateTime',
		required: true,
		default: DateTime.now().plus({ minutes: 30 }).toISO(),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Categories',
				name: 'categories',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCategoriesNames',
				},
				default: [],
			},
			{
				displayName: 'Description',
				name: 'body',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
			},
			{
				displayName: 'Description Preview',
				name: 'bodyPreview',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Hide Attendees',
				name: 'hideAttendees',
				type: 'boolean',
				default: false,
				description:
					'Whether to allow each attendee to only see themselves in the meeting request and meeting tracking list',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
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
				default: 'normal',
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
				displayName: 'Is Online Meeting',
				name: 'isOnlineMeeting',
				type: 'boolean',
				default: false,
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
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				default: 'UTC',
				options: moment.tz.names().map((name) => ({
					name,
					value: name,
				})),
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

const displayOptions = {
	show: {
		resource: ['event'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	let additionalFields = this.getNodeParameter('additionalFields', index);

	additionalFields = Object.keys(additionalFields).reduce((acc: IDataObject, key: string) => {
		if (additionalFields[key] !== '' || additionalFields[key] !== undefined) {
			acc[key] = additionalFields[key];
		}
		return acc;
	}, {});

	const calendarId = this.getNodeParameter('calendarId', index, '', {
		extractValue: true,
	}) as string;

	if (calendarId === '') {
		throw new NodeOperationError(this.getNode(), 'Calendar ID is required');
	}
	const subject = this.getNodeParameter('subject', index) as string;

	const endpoint = `/calendars/${calendarId}/events`;

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

	let startDateTime = this.getNodeParameter('startDateTime', index) as string;
	let endDateTime = this.getNodeParameter('endDateTime', index) as string;

	if (additionalFields.isAllDay) {
		startDateTime = DateTime.fromISO(startDateTime, { zone: timeZone }).toFormat('yyyy-MM-dd');
		endDateTime = DateTime.fromISO(endDateTime, { zone: timeZone }).toFormat('yyyy-MM-dd');

		const minimalWholeDayDuration = 24;
		const duration = DateTime.fromISO(startDateTime, { zone: timeZone }).diff(
			DateTime.fromISO(endDateTime, { zone: timeZone }),
		).hours;

		if (duration < minimalWholeDayDuration) {
			endDateTime = DateTime.fromISO(startDateTime, { zone: timeZone }).plus({ hours: 24 }).toISO();
		}
	}

	const body: IDataObject = {
		subject,
		start: {
			dateTime: startDateTime,
			timeZone,
		},
		end: {
			dateTime: endDateTime,
			timeZone,
		},
		...additionalFields,
	};

	const responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
