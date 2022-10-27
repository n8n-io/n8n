import { INodeProperties } from 'n8n-workflow';

export const calendarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
		options: [
			{
				name: 'Availability',
				value: 'availability',
				description: 'If a time-slot is available in a calendar',
				action: 'Get availability in a calendar',
			},
		],
		default: 'availability',
	},
];

export const calendarFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 calendar:availability                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Calendar',
		name: 'calendar',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'Google Calendar to operate on',
		modes: [
			{
				displayName: 'Calendar',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Calendar...',
				typeOptions: {
					searchListMethod: 'getCalendars',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							// calendar ids are emails. W3C email regex with optional trailing whitespace.
							regex: '(^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:[ \t]+)*$)',
							errorMessage: 'Not a valid Google Calendar ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '(^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)',
				},
				placeholder: 'name@google.com',
			},
		],
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
	},
	{
		displayName: 'Start Time',
		name: 'timeMin',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: ['availability'],
				resource: ['calendar'],
			},
		},
		default: '',
		description: 'Start of the interval',
	},
	{
		displayName: 'End Time',
		name: 'timeMax',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: ['availability'],
				resource: ['calendar'],
			},
		},
		default: '',
		description: 'End of the interval',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		displayOptions: {
			show: {
				operation: ['availability'],
				resource: ['calendar'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'Availability',
						value: 'availability',
						description: 'Returns if there are any events in the given time or not',
					},
					{
						name: 'Booked Slots',
						value: 'bookedSlots',
						description: 'Returns the booked slots',
					},
					{
						name: 'RAW',
						value: 'raw',
						description: 'Returns the RAW data from the API',
					},
				],
				default: 'availability',
				description: 'The format to return the data in',
			},
			{
				displayName: 'Timezone Name or ID',
				name: 'timezone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description:
					'Time zone used in the response. By default n8n timezone is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
