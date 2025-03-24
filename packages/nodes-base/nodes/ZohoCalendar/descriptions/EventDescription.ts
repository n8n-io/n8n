import type { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Create an Event',
				value: 'create',
				description: 'Creates an event in the specified calendar.',
				action: 'Create New Event',
			},
			{
				name: 'Update an Event',
				value: 'update',
				description: 'Updates an event in the specified calendar.',
				action: 'Update Event',
			},
			{
				name: 'Delete an Event',
				value: 'delete',
				description: 'Deletes an event from the specified calendar.',
				action: 'Delete Event',
			},
			{
				name: 'Quick Add an Event',
				value: 'quick_event',
				description: 'Creates an event from a piece of text.',
				action: 'Quick Add Event',
			},
		],
		default: 'create',
	},
];

export const eventFields: INodeProperties[] = [
	// ----------------------------------------
	//     event: Create, Update and Delete
	// ----------------------------------------

	{
		displayName: 'Calendar',
		name: 'calendar_id',
		type: 'options',
		default: '',
		placeholder: 'Select a calendar to connect',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update', 'delete'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getListCalendar',
		},
		required: true,
	},
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		default: '',
		placeholder: 'Enter the event name you want to update or delete',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['update', 'delete'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getListEvent',
			loadOptionsDependsOn: ['calendar_id'],
		},
		required: true,
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		placeholder: 'Enter a new name for the event',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Start time',
		name: 'start',
		type: 'dateTime',
		placeholder: 'Select a start date and time for the event',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
		required: true,
	},
	{
		displayName: 'End time',
		name: 'end',
		type: 'dateTime',
		placeholder: 'Select a date and time for when the event ends',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Is an all-day event?',
		name: 'isallday',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'options',
		hint: 'Choose a preferred color for the event',
		default: '#008000',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				name: 'Red',
				value: '#FF0000',
			},
			{
				name: 'Blue',
				value: '#0000FF',
			},
			{
				name: 'Green',
				value: '#008000',
			},
			{
				name: 'Yellow',
				value: '#FFFF00',
			},
			{
				name: 'Pink',
				value: '#FFC0CB',
			},
			{
				name: 'Lavender',
				value: '#E6E6FA',
			},
			{
				name: 'Turquoise',
				value: '#40E0D0',
			},
		],
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		placeholder: 'Description of the event',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'string',
		placeholder: 'Select a location for the event',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Is a private event?',
		name: 'isprivate',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
	},

	{
		displayName: 'Attendees',
		name: 'attendees',
		type: 'string',
		placeholder: 'Select attendees for the event',
		hint: ' Note: In case of multiple attendees, separate them with a comma.',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Add to free/busy schedule',
		name: 'transparency',
		type: 'options',
		default: '0',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				name: 'True',
				value: '0',
			},
			{
				name: 'False',
				value: '1',
			},
		],
	},
	{
		displayName: 'Allow to be forwarded by attendees?',
		name: 'allowForwarding',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create', 'update'],
			},
		},
	},

	// ----------------------------------------
	//         event: Add quick event
	// ----------------------------------------

	{
		displayName: 'Describe',
		name: 'saddtext',
		type: 'string',
		placeholder: 'Description of the event',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['quick_event'],
			},
		},
		required: true,
	},
];
