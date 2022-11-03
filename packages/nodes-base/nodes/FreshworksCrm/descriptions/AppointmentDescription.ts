import { tz } from 'moment-timezone';

import { INodeProperties } from 'n8n-workflow';

export const appointmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an appointment',
				action: 'Create an appointment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an appointment',
				action: 'Delete an appointment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an appointment',
				action: 'Get an appointment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many appointments',
				action: 'Get many appointments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an appointment',
				action: 'Update an appointment',
			},
		],
		default: 'create',
	},
];

export const appointmentFields: INodeProperties[] = [
	// ----------------------------------------
	//           appointment: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the appointment',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Start Date',
		name: 'fromDate',
		description:
			'Timestamp that denotes the start of appointment. Start date if this is an all-day appointment.',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		description:
			'Timestamp that denotes the end of appointment. End date if this is an all-day appointment.',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Attendees',
		name: 'attendees',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		placeholder: 'Add Attendee',
		default: {},
		options: [
			{
				name: 'attendee',
				displayName: 'Attendee',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Contact',
								value: 'contact',
							},
							{
								name: 'User',
								value: 'user',
							},
						],
						default: 'contact',
					},
					{
						displayName: 'User Name or ID',
						name: 'userId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						displayOptions: {
							show: {
								type: ['user'],
							},
						},
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						default: '',
					},
					{
						displayName: 'Contact ID',
						name: 'contactId',
						displayOptions: {
							show: {
								type: ['contact'],
							},
						},
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Creator Name or ID',
				name: 'creater_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who created the appointment. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Is All-Day',
				name: 'is_allday',
				type: 'boolean',
				default: false,
				description: 'Whether it is an all-day appointment or not',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'string',
				default: '',
				description: 'Latitude of the location when you check in for an appointment',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the appointment',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'string',
				default: '',
				description: 'Longitude of the location when you check in for an appointment',
			},
			{
				displayName: 'Outcome Name or ID',
				name: 'outcome_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getOutcomes',
				},
				description:
					'ID of outcome of Appointment sales activity type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Target ID',
				name: 'targetable_id',
				type: 'string',
				default: '',
				description: 'ID of contact/account against whom appointment is created',
			},
			{
				displayName: 'Target Type',
				name: 'targetable_type',
				type: 'options',
				default: 'Contact',
				options: [
					{
						name: 'Contact',
						value: 'Contact',
					},
					{
						name: 'Deal',
						value: 'Deal',
					},
					{
						name: 'SalesAccount',
						value: 'SalesAccount',
					},
				],
			},
			{
				displayName: 'Time Zone',
				name: 'time_zone',
				type: 'options',
				default: '',
				description: 'Timezone that the appointment is scheduled in',
				options: tz.names().map((tz) => ({ name: tz, value: tz })),
			},
		],
	},

	// ----------------------------------------
	//           appointment: delete
	// ----------------------------------------
	{
		displayName: 'Appointment ID',
		name: 'appointmentId',
		description: 'ID of the appointment to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//             appointment: get
	// ----------------------------------------
	{
		displayName: 'Appointment ID',
		name: 'appointmentId',
		description: 'ID of the appointment to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//           appointment: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				default: 'creater',
				options: [
					{
						name: 'Appointment Attendees',
						value: 'appointment_attendees',
					},
					{
						name: 'Creator',
						value: 'creater',
					},
					{
						name: 'Target',
						value: 'targetable',
					},
				],
			},
			{
				displayName: 'Time',
				name: 'filter',
				type: 'options',
				default: 'upcoming',
				options: [
					{
						name: 'Past',
						value: 'past',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//           appointment: update
	// ----------------------------------------
	{
		displayName: 'Appointment ID',
		name: 'appointmentId',
		description: 'ID of the appointment to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Attendees',
				name: 'attendees',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Attendee',
				default: {},
				options: [
					{
						name: 'attendee',
						displayName: 'Attendee',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Contact',
										value: 'contact',
									},
									{
										name: 'User',
										value: 'user',
									},
								],
								default: 'contact',
							},
							{
								displayName: 'User Name or ID',
								name: 'userId',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								displayOptions: {
									show: {
										type: ['user'],
									},
								},
								typeOptions: {
									loadOptionsMethod: 'getUsers',
								},
								default: '',
							},
							{
								displayName: 'Contact ID',
								name: 'contactId',
								displayOptions: {
									show: {
										type: ['contact'],
									},
								},
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Creator Name or ID',
				name: 'creater_id',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who created the appointment. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				description:
					'Timestamp that denotes the end of appointment. End date if this is an all-day appointment.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Is All-Day',
				name: 'is_allday',
				type: 'boolean',
				default: false,
				description: 'Whether it is an all-day appointment or not',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'string',
				default: '',
				description: 'Latitude of the location when you check in for an appointment',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the appointment',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'string',
				default: '',
				description: 'Longitude of the location when you check in for an appointment',
			},
			{
				displayName: 'Outcome Name or ID',
				name: 'outcome_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getOutcomes',
				},
				description:
					'ID of outcome of Appointment sales activity type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Start Date',
				name: 'fromDate',
				description:
					'Timestamp that denotes the start of appointment. Start date if this is an all-day appointment.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Target ID',
				name: 'targetable_id',
				type: 'string',
				default: '',
				description: 'ID of contact/account against whom appointment is created',
			},
			{
				displayName: 'Target Type',
				name: 'targetable_type',
				type: 'options',
				default: 'Contact',
				options: [
					{
						name: 'Contact',
						value: 'Contact',
					},
					{
						name: 'Deal',
						value: 'Deal',
					},
					{
						name: 'SalesAccount',
						value: 'SalesAccount',
					},
				],
			},
			{
				displayName: 'Time Zone',
				name: 'time_zone',
				type: 'options',
				default: '',
				description: 'Timezone that the appointment is scheduled in',
				options: tz.names().map((tz) => ({ name: tz, value: tz })),
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the appointment',
			},
		],
	},
];
