import type { INodeProperties } from 'n8n-workflow';

export const meetingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['meeting'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a meeting',
				action: 'Create a meeting',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a meeting',
				action: 'Delete a meeting',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a meeting',
				action: 'Get a meeting',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many meetings',
				action: 'Get many meetings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a meeting',
				action: 'Update a meeting',
			},
		],
		default: 'create',
	},
];

export const meetingFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['meeting'],
			},
		},
		description: 'Topic of the meeting',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['meeting'],
			},
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: 'Meeting agenda',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Meeting duration (minutes)',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Password to join the meeting with maximum 10 characters',
			},
			{
				displayName: 'Schedule for',
				name: 'scheduleFor',
				type: 'string',
				default: '',
				description: 'Schedule meeting for someone else from your account, provide their email ID',
			},
			{
				displayName: 'Settings',
				name: 'settings',
				type: 'collection',
				placeholder: 'Add setting',
				default: {},
				options: [
					{
						displayName: 'Audio',
						name: 'audio',
						type: 'options',
						options: [
							{
								name: 'Both telephony and VoiP',
								value: 'both',
							},
							{
								name: 'Telephony',
								value: 'telephony',
							},
							{
								name: 'VOIP',
								value: 'voip',
							},
						],
						default: 'both',
						description: 'Determine how participants can join audio portion of the meeting',
					},
					{
						displayName: 'Alternative hosts',
						name: 'alternativeHosts',
						type: 'string',
						default: '',
						description: 'Alternative hosts email IDs',
					},
					{
						displayName: 'Auto recording',
						name: 'autoRecording',
						type: 'options',
						options: [
							{
								name: 'Record on local',
								value: 'local',
							},
							{
								name: 'Record on cloud',
								value: 'cloud',
							},
							{
								name: 'Disabled',
								value: 'none',
							},
						],
						default: 'none',
					},
					{
						displayName: 'Host meeting in China',
						name: 'cnMeeting',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Host meeting in India',
						name: 'inMeeting',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Host video',
						name: 'hostVideo',
						type: 'boolean',
						default: false,
						description: 'Whether to start a video when host joins the meeting',
					},
					{
						displayName: 'Join before host',
						name: 'joinBeforeHost',
						type: 'boolean',
						default: false,
						description: 'Whether to allow participants to join the meeting before host starts it',
					},
					{
						displayName: 'Muting upon entry',
						name: 'muteUponEntry',
						type: 'boolean',
						default: false,
						description: 'Whether to mute participants upon entry',
					},
					{
						displayName: 'Participant video',
						name: 'participantVideo',
						type: 'boolean',
						default: false,
						description: 'Whether to start a video when participant joins the meeting',
					},
					{
						displayName: 'Registration type',
						name: 'registrationType',
						type: 'options',
						options: [
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Attendees register once and can attend any of the occurrences',
								value: 1,
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Attendees need to register for every occurrence',
								value: 2,
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Attendees register once and can choose one or more occurrences to attend',
								value: 3,
							},
						],
						default: 1,
						description: 'Registration type. Used for recurring meetings with fixed time only.',
					},
					{
						displayName: 'Watermark',
						name: 'watermark',
						type: 'boolean',
						default: false,
						description: 'Whether to add a watermark when viewing a shared screen',
					},
				],
			},
			{
				displayName: 'Start time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description:
					'Start time should be used only for scheduled or recurring meetings with fixed time',
			},
			{
				displayName: 'Timezone name or ID',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description:
					'Time zone used in the response. The default is the time zone of the calendar. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Instant meeting',
						value: 1,
					},
					{
						name: 'Scheduled meeting',
						value: 2,
					},
					{
						name: 'Recurring meeting with no fixed time',
						value: 3,
					},
					{
						name: 'Recurring meeting with fixed time',
						value: 8,
					},
				],
				default: 2,
				description: 'Meeting type',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['meeting'],
			},
		},
		description: 'Meeting ID',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['meeting'],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'To view meeting details of a particular occurrence of the recurring meeting',
			},
			{
				displayName: 'Show previous occurrences',
				name: 'showPreviousOccurrences',
				type: 'boolean',
				default: false,
				description:
					'Whether to view meeting details of all previous occurrences of the recurring meeting',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['meeting'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['meeting'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['meeting'],
			},
		},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Scheduled',
						value: 'scheduled',
						description:
							'This includes all valid past meetings, live meetings and upcoming scheduled meetings',
					},
					{
						name: 'Live',
						value: 'live',
						description: 'All ongoing meetings',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
						description: 'All upcoming meetings including live meetings',
					},
				],
				default: 'live',
				description: 'Meeting type',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['meeting'],
			},
		},
		description: 'Meeting ID',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['meeting'],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Meeting occurrence ID',
			},
			{
				displayName: 'Schedule reminder',
				name: 'scheduleForReminder',
				type: 'boolean',
				default: false,
				description:
					'Whether to notify hosts and alternative hosts about meeting cancellation via email',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['meeting'],
			},
		},
		description: 'Meeting ID',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['meeting'],
			},
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: 'Meeting agenda',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Meeting duration (minutes)',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Password to join the meeting with maximum 10 characters',
			},
			{
				displayName: 'Schedule for',
				name: 'scheduleFor',
				type: 'string',
				default: '',
				description: 'Schedule meeting for someone else from your account, provide their email ID',
			},
			{
				displayName: 'Settings',
				name: 'settings',
				type: 'collection',
				placeholder: 'Add setting',
				default: {},
				options: [
					{
						displayName: 'Audio',
						name: 'audio',
						type: 'options',
						options: [
							{
								name: 'Both telephony and VoiP',
								value: 'both',
							},
							{
								name: 'Telephony',
								value: 'telephony',
							},
							{
								name: 'VOIP',
								value: 'voip',
							},
						],
						default: 'both',
						description: 'Determine how participants can join audio portion of the meeting',
					},
					{
						displayName: 'Alternative hosts',
						name: 'alternativeHosts',
						type: 'string',
						default: '',
						description: 'Alternative hosts email IDs',
					},
					{
						displayName: 'Auto recording',
						name: 'autoRecording',
						type: 'options',
						options: [
							{
								name: 'Record on local',
								value: 'local',
							},
							{
								name: 'Record on cloud',
								value: 'cloud',
							},
							{
								name: 'Disabled',
								value: 'none',
							},
						],
						default: 'none',
					},
					{
						displayName: 'Host meeting in China',
						name: 'cnMeeting',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Host meeting in India',
						name: 'inMeeting',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Host video',
						name: 'hostVideo',
						type: 'boolean',
						default: false,
						description: 'Whether to start a video when host joins the meeting',
					},
					{
						displayName: 'Join before host',
						name: 'joinBeforeHost',
						type: 'boolean',
						default: false,
						description: 'Whether to allow participants to join the meeting before host starts it',
					},
					{
						displayName: 'Muting upon entry',
						name: 'muteUponEntry',
						type: 'boolean',
						default: false,
						description: 'Whether to mute participants upon entry',
					},
					{
						displayName: 'Participant video',
						name: 'participantVideo',
						type: 'boolean',
						default: false,
						description: 'Whether to start a video when participant joins the meeting',
					},
					{
						displayName: 'Registration type',
						name: 'registrationType',
						type: 'options',
						options: [
							{
								name: 'Attendees register once and can attend any of the occurrences',
								value: 1,
							},
							{
								name: 'Attendees need to register for every occurrence',
								value: 2,
							},
							{
								name: 'Attendees register once and can choose one or more occurrences to attend',
								value: 3,
							},
						],
						default: 1,
						description: 'Registration type. Used for recurring meetings with fixed time only.',
					},
					{
						displayName: 'Watermark',
						name: 'watermark',
						type: 'boolean',
						default: false,
						description: 'Whether to add watermark when viewing a shared screen',
					},
				],
			},
			{
				displayName: 'Start time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description:
					'Start time should be used only for scheduled or recurring meetings with fixed time',
			},
			{
				displayName: 'Timezone name or ID',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description:
					'Time zone used in the response. The default is the time zone of the calendar. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: 'Meeting topic',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Instant meeting',
						value: 1,
					},
					{
						name: 'Scheduled meeting',
						value: 2,
					},
					{
						name: 'Recurring meeting with no fixed time',
						value: 3,
					},
					{
						name: 'Recurring meeting with fixed time',
						value: 8,
					},
				],
				default: 2,
				description: 'Meeting type',
			},
		],
	},
];
