import {
	INodeProperties,
} from 'n8n-workflow';

export const meetingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a meeting',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a meeting',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a meeting',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all meetings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a meeting',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',

				],
				resource: [
					'meeting',
				],
			},
		},
		description: `Topic of the meeting.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',

				],
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Meeting agenda.',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Meeting duration (minutes).',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'Password to join the meeting with maximum 10 characters.',
			},
			{
				displayName: 'Schedule For',
				name: 'scheduleFor',
				type: 'string',
				default: '',
				description: 'Schedule meeting for someone else from your account, provide their email ID.',
			},
			{
				displayName: 'Settings',
				name: 'settings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Audio',
						name: 'audio',
						type: 'options',
						options: [
							{
								name: 'Both Telephony and VoiP',
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
						description: 'Determine how participants can join audio portion of the meeting.',
					},
					{
						displayName: 'Alternative Hosts',
						name: 'alternativeHosts',
						type: 'string',
						default: '',
						description: 'Alternative hosts email IDs.',
					},
					{
						displayName: 'Auto Recording',
						name: 'autoRecording',
						type: 'options',
						options: [
							{
								name: 'Record on Local',
								value: 'local',
							},
							{
								name: 'Record on Cloud',
								value: 'cloud',
							},
							{
								name: 'Disabled',
								value: 'none',
							},
						],
						default: 'none',
						description: 'Auto recording.',
					},
					{
						displayName: 'Host Meeting in China',
						name: 'cnMeeting',
						type: 'boolean',
						default: false,
						description: 'Host Meeting in China.',
					},
					{
						displayName: 'Host Meeting in India',
						name: 'inMeeting',
						type: 'boolean',
						default: false,
						description: 'Host Meeting in India.',
					},
					{
						displayName: 'Host Video',
						name: 'hostVideo',
						type: 'boolean',
						default: false,
						description: 'Start video when host joins the meeting.',
					},
					{
						displayName: 'Join Before Host',
						name: 'joinBeforeHost',
						type: 'boolean',
						default: false,
						description: 'Allow participants to join the meeting before host starts it.',
					},
					{
						displayName: 'Muting Upon Entry',
						name: 'muteUponEntry',
						type: 'boolean',
						default: false,
						description: 'Mute participants upon entry.',
					},
					{
						displayName: 'Participant Video',
						name: 'participantVideo',
						type: 'boolean',
						default: false,
						description: 'Start video when participant joins the meeting.',
					},
					{
						displayName: 'Registration Type',
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
						description: 'Registration type. Used for recurring meetings with fixed time only',
					},
					{
						displayName: 'Watermark',
						name: 'watermark',
						type: 'boolean',
						default: false,
						description: 'Adds watermark when viewing a shared screen.',
					},
				],
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'Start time should be used only for scheduled or recurring meetings with fixed time',
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: `Time zone used in the response. The default is the time zone of the calendar.`,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Instant Meeting',
						value: 1,
					},
					{
						name: 'Scheduled Meeting',
						value: 2,
					},
					{
						name: 'Recurring Meeting with no fixed time',
						value: 3,
					},
					{
						name: 'Recurring Meeting with fixed time',
						value: 8,
					},

				],
				default: 2,
				description: 'Meeting type.',
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
				operation: [
					'get',
				],
				resource: [
					'meeting',
				],
			},
		},
		description: 'Meeting ID.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',

				],
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'To view meeting details of a particular occurrence of the recurring meeting.',
			},
			{
				displayName: 'Show Previous Occurrences',
				name: 'showPreviousOccurrences',
				type: 'boolean',
				default: '',
				description: 'To view meeting details of all previous occurrences of the recurring meeting.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'meeting',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'meeting',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',

				],
				resource: [
					'meeting',
				],
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
						description: 'This includes all valid past meetings, live meetings and upcoming scheduled meetings',
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
				description: `Meeting type.`,
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
				operation: [
					'delete',
				],
				resource: [
					'meeting',
				],
			},
		},
		description: 'Meeting ID.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Meeting occurrence ID.',
			},
			{
				displayName: 'Schedule Reminder',
				name: 'scheduleForReminder',
				type: 'boolean',
				default: false,
				description: 'Notify hosts and alternative hosts about meeting cancellation via email',
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
				operation: [
					'update',
				],
				resource: [
					'meeting',
				],
			},
		},
		description: 'Meeting ID.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Meeting agenda.',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Meeting duration (minutes).',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'Password to join the meeting with maximum 10 characters.',
			},
			{
				displayName: 'Schedule For',
				name: 'scheduleFor',
				type: 'string',
				default: '',
				description: 'Schedule meeting for someone else from your account, provide their email ID.',
			},
			{
				displayName: 'Settings',
				name: 'settings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Audio',
						name: 'audio',
						type: 'options',
						options: [
							{
								name: 'Both Telephony and VoiP',
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
						description: 'Determine how participants can join audio portion of the meeting.',
					},
					{
						displayName: 'Alternative Hosts',
						name: 'alternativeHosts',
						type: 'string',
						default: '',
						description: 'Alternative hosts email IDs.',
					},
					{
						displayName: 'Auto Recording',
						name: 'autoRecording',
						type: 'options',
						options: [
							{
								name: 'Record on Local',
								value: 'local',
							},
							{
								name: 'Record on Cloud',
								value: 'cloud',
							},
							{
								name: 'Disabled',
								value: 'none',
							},
						],
						default: 'none',
						description: 'Auto recording.',
					},
					{
						displayName: 'Host Meeting in China',
						name: 'cnMeeting',
						type: 'boolean',
						default: false,
						description: 'Host Meeting in China.',
					},
					{
						displayName: 'Host Meeting in India',
						name: 'inMeeting',
						type: 'boolean',
						default: false,
						description: 'Host Meeting in India.',
					},
					{
						displayName: 'Host Video',
						name: 'hostVideo',
						type: 'boolean',
						default: false,
						description: 'Start video when host joins the meeting.',
					},
					{
						displayName: 'Join Before Host',
						name: 'joinBeforeHost',
						type: 'boolean',
						default: false,
						description: 'Allow participants to join the meeting before host starts it.',
					},
					{
						displayName: 'Muting Upon Entry',
						name: 'muteUponEntry',
						type: 'boolean',
						default: false,
						description: 'Mute participants upon entry.',
					},
					{
						displayName: 'Participant Video',
						name: 'participantVideo',
						type: 'boolean',
						default: false,
						description: 'Start video when participant joins the meeting.',
					},
					{
						displayName: 'Registration Type',
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
						description: 'Registration type. Used for recurring meetings with fixed time only',
					},
					{
						displayName: 'Watermark',
						name: 'watermark',
						type: 'boolean',
						default: false,
						description: 'Adds watermark when viewing a shared screen.',
					},
				],
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'Start time should be used only for scheduled or recurring meetings with fixed time',
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: `Time zone used in the response. The default is the time zone of the calendar.`,
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: `Meeting topic.`,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Instant Meeting',
						value: 1,
					},
					{
						name: 'Scheduled Meeting',
						value: 2,
					},
					{
						name: 'Recurring Meeting with no fixed time',
						value: 3,
					},
					{
						name: 'Recurring Meeting with fixed time',
						value: 8,
					},

				],
				default: 2,
				description: 'Meeting type.',
			},
		],
	},
];
