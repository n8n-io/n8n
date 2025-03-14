import type { INodeProperties } from 'n8n-workflow';

export const calendarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
		options: [
			{
				name: 'Book Appointment',
				value: 'bookAppointment',
				action: 'Book appointment in a calendar',
				routing: {
					request: {
						method: 'POST',
						url: '=/calendars/events/appointments',
					},
				},
			},
			{
				name: 'Get Free Slots',
				value: 'getFreeSlots',
				action: 'Get free slots of a calendar',
				routing: {
					request: {
						method: 'GET',
						url: '=/calendars/{{$parameter.calendarId}}/free-slots',
					},
				},
			},
		],
		default: 'bookAppointment',
		noDataExpression: true,
	},
];

const bookAppointmentProperties: INodeProperties[] = [
	{
		displayName: 'Calendar ID',
		name: 'calendarId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['bookAppointment'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'calendarId',
			},
		},
	},
	{
		displayName: 'Location ID',
		name: 'locationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['bookAppointment'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'locationId',
			},
		},
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['bookAppointment'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'contactId',
			},
		},
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'string',
		required: true,
		description: 'Example: 2021-06-23T03:30:00+05:30',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['bookAppointment'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'startTime',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['bookAppointment'],
			},
		},
		options: [
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'string',
				description: 'Example: 2021-06-23T04:30:00+05:30',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'endTime',
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'title',
					},
				},
			},
			{
				displayName: 'Appointment Status',
				name: 'appointmentStatus',
				type: 'options',
				default: 'new',
				description:
					'The status of the appointment. Allowed values: new, confirmed, cancelled, showed, noshow, invalid.',
				options: [
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Confirmed',
						value: 'confirmed',
					},
					{
						name: 'Invalid',
						value: 'invalid',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'No Show',
						value: 'noshow',
					},
					{
						name: 'Showed',
						value: 'showed',
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'appointmentStatus',
					},
				},
			},
			{
				displayName: 'Assigned User ID',
				name: 'assignedUserId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'assignedUserId',
					},
				},
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'address',
					},
				},
			},
			{
				displayName: 'Ignore Date Range',
				name: 'ignoreDateRange',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'ignoreDateRange',
					},
				},
			},
			{
				displayName: 'Notify',
				name: 'toNotify',
				type: 'boolean',
				default: true,
				routing: {
					send: {
						type: 'body',
						property: 'toNotify',
					},
				},
			},
		],
	},
];

const getFreeSlotsProperties: INodeProperties[] = [
	{
		displayName: 'Calendar ID',
		name: 'calendarId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getFreeSlots'],
			},
		},
		default: '',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'number',
		//type: 'dateTime' TODO
		default: '',
		required: true,
		description: 'The start date for fetching free calendar slots. Example: 1548898600000.',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getFreeSlots'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'startDate',
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'number',
		//type: 'dateTime' TODO
		default: '',
		required: true,
		description: 'The end date for fetching free calendar slots. Example: 1601490599999.',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getFreeSlots'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'endDate',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getFreeSlots'],
			},
		},
		options: [
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description: 'The timezone to use for the returned slots. Example: America/Chihuahua.',
				routing: {
					send: {
						type: 'query',
						property: 'timezone',
					},
				},
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'User ID to filter the slots (optional)',
				routing: {
					send: {
						type: 'query',
						property: 'userId',
					},
				},
			},
			{
				displayName: 'User IDs',
				name: 'userIds',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'User IDs',
						name: 'userIds',
						type: 'string',
						default: '',
						description: 'Comma-separated list of user IDs to filter the slots',
						routing: {
							send: {
								type: 'query',
								property: 'userIds',
							},
						},
					},
				],
			},
			{
				displayName: 'Apply Look Busy',
				name: 'enableLookBusy',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Apply Look Busy to the slots',
				routing: {
					send: {
						type: 'query',
						property: 'enableLookBusy',
					},
				},
			},
		],
	},
];

export const calendarFields: INodeProperties[] = [
	...bookAppointmentProperties,
	...getFreeSlotsProperties,
];
