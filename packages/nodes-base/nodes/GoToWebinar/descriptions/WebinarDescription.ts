import {
	INodeProperties,
} from 'n8n-workflow';

export const webinarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			// {
			// 	name: 'Delete',
			// 	value: 'delete',
			// },
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
			},
		},
	},
];

export const webinarFields: INodeProperties[] = [
	// ----------------------------------
	//         webinar: create
	// ----------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Time Range',
		name: 'times',
		type: 'fixedCollection',
		required: true,
		placeholder: 'Add Time Range',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Times Properties',
				name: 'timesProperties',
				values: [
					{
						displayName: 'Start Time',
						name: 'startTime',
						type: 'dateTime',
						required: true,
						default: '',
					},
					{
						displayName: 'End Time',
						name: 'endTime',
						type: 'dateTime',
						required: true,
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
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Experience Type',
				name: 'experienceType',
				type: 'options',
				default: 'CLASSIC',
				options: [
					{
						name: 'Classic',
						value: 'CLASSIC',
					},
					{
						name: 'Broadcast',
						value: 'BROADCAST',
					},
					{
						name: 'Simulive',
						value: 'SIMULIVE',
					},
				],
			},
			{
				displayName: 'Is On-Demand',
				name: 'isOnDemand',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Password Protected',
				name: 'isPasswordProtected',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'options',
				required: true,
				default: '',
				placeholder: '2020-12-11T09:00:00Z',
				typeOptions: {
					alwaysOpenEditWindow: true,
					loadOptionsMethod: 'getTimezones',
				},
			},
			{
				displayName: 'Webinar Type',
				name: 'type',
				type: 'options',
				default: 'single_session',
				options: [
					{
						name: 'Single Session',
						value: 'single_session',
						description: 'Webinar with one single meeting.',
					},
					{
						name: 'Series',
						value: 'series',
						description: 'Webinar with multiple meetings times where attendees choose only one to attend.',
					},
					{
						name: 'Sequence',
						value: 'sequence',
						description: 'Webinar with multiple meeting times where attendees are expected to be the same for all sessions.',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         webinar: delete
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the webinar to delete.',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'delete',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Send Cancellation E-mails',
				name: 'sendCancellationEmails',
				type: 'boolean',
				default: false,
			},
		],
	},

	// ----------------------------------
	//         webinar: get
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the webinar to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//         webinar: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Time Range',
				name: 'times',
				type: 'fixedCollection',
				placeholder: 'Add Time Range',
				required: true,
				default: {},
				options: [
					{
						displayName: 'Times Properties',
						name: 'timesProperties',
						values: [
							{
								displayName: 'Start Time',
								name: 'fromTime',
								type: 'dateTime',
								description: 'Start of the datetime range for the webinar.',
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'toTime',
								type: 'dateTime',
								description: 'End of the datetime range for the webinar.',
								default: '',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//         webinar: update
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the webinar to update.',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Notify Participants',
		name: 'notifyParticipants',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Experience Type',
				name: 'experienceType',
				type: 'options',
				default: 'CLASSIC',
				options: [
					{
						name: 'Classic',
						value: 'CLASSIC',
					},
					{
						name: 'Broadcast',
						value: 'BROADCAST',
					},
					{
						name: 'Simulive',
						value: 'SIMULIVE',
					},
				],
			},
			{
				displayName: 'Is On-Demand',
				name: 'isOnDemand',
				type: 'boolean',
				default: false,
				description: 'Whether the webinar may be watched anytime.',
			},
			{
				displayName: 'Is Password Protected',
				name: 'isPasswordProtected',
				type: 'boolean',
				default: false,
				description: 'Whether the webinar requires a password for attendees to join.',
			},
			{
				displayName: 'Times',
				name: 'times',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Times Properties',
						name: 'timesProperties',
						values: [
							{
								displayName: 'Start Time',
								name: 'startTime',
								type: 'dateTime',
								required: true,
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'endTime',
								type: 'dateTime',
								required: true,
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Name or topic of the webinar.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'options',
				required: true,
				default: '',
				placeholder: '2020-12-11T09:00:00Z',
				description: 'Timezone where the webinar is to take place.',
				typeOptions: {
					alwaysOpenEditWindow: true,
					loadOptionsMethod: 'getTimezones',
				},
			},
			{
				displayName: 'Webinar Type',
				name: 'type',
				type: 'options',
				default: 'single_session',
				options: [
					{
						name: 'Single Session',
						value: 'single_session',
						description: 'Webinar with one single meeting.',
					},
					{
						name: 'Series',
						value: 'series',
						description: 'Webinar with multiple meetings times where attendees choose only one to attend.',
					},
					{
						name: 'Sequence',
						value: 'sequence',
						description: 'Webinar with multiple meeting times where attendees are expected to be the same for all sessions.',
					},
				],
			},
		],
	},
];
