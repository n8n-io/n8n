import {
	INodeProperties,
} from 'n8n-workflow';

export const meetingOperations = [
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
			}
		],
		default: 'create',
		description: 'The operation to perform.',
	}
] as INodeProperties[];

export const meetingFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
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
		description: 'User ID or email address of user.',
	},
	{
		displayName: 'Additional settings',
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
			}
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: 'Meeting agenda.',
			},
			{
				displayName: 'Alternative Hosts',
				name: 'alternative_hosts',
				type: 'string',
				default: '',
				description: 'Alternative hosts email IDs.',
			},
			{
				displayName: 'Auto recording',
				name: 'auto_recording',
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
				description: 'Auto recording.',
			},
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
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				default: '',
				description: 'Duration.',
			},
			{
				displayName: 'Host Meeting in China',
				name: 'cn_meeting',
				type: 'boolean',
				default: false,
				description: 'Host Meeting in China.',
			},
			{
				displayName: 'Host Meeting in India',
				name: 'in_meeting',
				type: 'boolean',
				default: false,
				description: 'Host Meeting in India.',
			},
			{
				displayName: 'Host Video',
				name: 'host_video',
				type: 'boolean',
				default: false,
				description: 'Start video when host joins the meeting.',
			},
			{
				displayName: 'Join before Host',
				name: 'join_before_host',
				type: 'boolean',
				default: false,
				description: 'Allow participants to join the meeting before host starts it.',
			},
			{
				displayName: 'Meeting topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: `Meeting topic.`,
			},
			{
				displayName: 'Meeting type',
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
						name: 'Recurring meeting with no fixed time',
						value: 3,
					},
					{
						name: 'Recurring meeting with no fixed time',
						value: 8,
					},

				],
				default: 2,
				description: 'Meeting type.'
			},
			{
				displayName: 'Muting before entry',
				name: 'mute_upon_entry',
				type: 'boolean',
				default: false,
				description: 'Mute participants upon entry.',
			},
			{
				displayName: 'Participant Video',
				name: 'participant_video',
				type: 'boolean',
				default: false,
				description: 'Start video when participant joins the meeting.',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'Password to join the meeting with maximum 10 characters.',
			},
			{
				displayName: 'Registration type',
				name: 'registration_type',
				type: 'options',
				options: [
					{
						name: 'Attendees register once and can attend any of the occurences',
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
				displayName: 'Schedule for',
				name: 'scheduleFor',
				type: 'string',
				default: '',
				description: 'Schedule meeting for someone else from your account, provide their email id.',
			},
			{
				displayName: 'Start time',
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
				displayName: 'Watermark',
				name: 'watermark',
				type: 'boolean',
				default: false,
				description: 'Adds watermark when viewing a shared screen.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting Id',
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
		displayName: 'Additional settings',
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
	/*                                 meeting:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
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
		description: 'User ID or email-ID.',
	},
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
			maxValue: 300
		},
		default: 30,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional settings',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
					},
					{
						name: 'Live',
						value: 'live',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
					},
				],
				default: 'live',
				description: `Meeting type.`,
			},
		]
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting Id',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete'
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
				displayName: 'Occurence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Meeting occurrence ID.',
			},
			{
				displayName: 'Schedule a reminder',
				name: 'scheduleForReminder',
				type: 'boolean',
				default: false,
				description: 'Notify hosts and alternative hosts about meeting cancellation via email',
			},
		],

	},
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting ID',
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
		displayName: 'Additional settings',
		name: 'additionalFields',
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
				default: '',
				description: 'Meeting agenda.',
			},
			{
				displayName: 'Alternative Hosts',
				name: 'alternative_hosts',
				type: 'string',
				default: '',
				description: 'Alternative hosts email ids.',
			},
			{
				displayName: 'Audio',
				name: 'auto_recording',
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
				displayName: 'Auto recording',
				name: 'auto_recording',
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
				description: 'Auto recording.',
			},

			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				default: '',
				description: 'Duration.',
			},
			{
				displayName: 'Join before Host',
				name: 'join_before_host',
				type: 'boolean',
				default: false,
				description: 'Allow participants to join the meeting before host starts it.',
			},
			{
				displayName: 'Host Meeting in China',
				name: 'cn_meeting',
				type: 'boolean',
				default: false,
				description: 'Host Meeting in China.',
			},
			{
				displayName: 'Host Meeting in India',
				name: 'in_meeting',
				type: 'boolean',
				default: false,
				description: 'Host Meeting in India.',
			},
			{
				displayName: 'Host Video',
				name: 'host_video',
				type: 'boolean',
				default: false,
				description: 'Start video when host joins the meeting.',
			},
			{
				displayName: 'Occurrence Id',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Occurrence ID.',
			},
			{
				displayName: 'Meeting topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: `Meeting topic.`,
			},
			{
				displayName: 'Meeting type',
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
						name: 'Recurring meeting with no fixed time',
						value: 3,
					},
					{
						name: 'Recurring meeting with no fixed time',
						value: 8,
					},

				],
				default: 2,
				description: 'Meeting type.'
			},
			{
				displayName: 'Muting before entry',
				name: 'mute_upon_entry',
				type: 'boolean',
				default: false,
				description: 'Mute participants upon entry.',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'Password to join the meeting with maximum 10 characters.',
			},
			{
				displayName: 'Participant Video',
				name: 'participant_video',
				type: 'boolean',
				default: false,
				description: 'Start video when participant joins the meeting.',
			},
			{
				displayName: 'Registration type',
				name: 'registration_type',
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
				displayName: 'Schedule for',
				name: 'scheduleFor',
				type: 'string',
				default: '',
				description: 'Schedule meeting for someone else from your account, provide their email id.',
			},
			{
				displayName: 'Start time',
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
				displayName: 'Watermark',
				name: 'watermark',
				type: 'boolean',
				default: false,
				description: 'Adds watermark when viewing a shared screen.',
			},


		],
	},

] as INodeProperties[];
