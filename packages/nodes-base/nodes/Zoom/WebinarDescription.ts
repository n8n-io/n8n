import type { INodeProperties } from 'n8n-workflow';

export const webinarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['webinar'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a webinar',
				action: 'Create a webinar',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a webinar',
				action: 'Delete a webinar',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a webinar',
				action: 'Get a webinar',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many webinars',
				action: 'Get many webinars',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a webinar',
				action: 'Update a webinar',
			},
		],
		default: 'create',
	},
];

export const webinarFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 webinar:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['webinar'],
			},
		},
		description: 'User ID or email ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['webinar'],
			},
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: 'Webinar agenda',
			},
			{
				displayName: 'Alternative Hosts',
				name: 'alternativeHosts',
				type: 'string',
				default: '',
				description: 'Alternative hosts email IDs',
			},
			{
				displayName: 'Approval Type',
				name: 'approvalType',
				type: 'options',
				options: [
					{
						name: 'Automatically Approve',
						value: 0,
					},
					{
						name: 'Manually Approve',
						value: 1,
					},
					{
						name: 'No Registration Required',
						value: 2,
					},
				],
				default: 2,
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
				description: 'Determine how participants can join audio portion of the webinar',
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
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Host Video',
				name: 'hostVideo',
				type: 'boolean',
				default: false,
				description: 'Whether to start a video when host joins the webinar',
			},
			{
				displayName: 'Panelists Video',
				name: 'panelistsVideo',
				type: 'boolean',
				default: false,
				description: 'Whether to start a video when panelists joins the webinar',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Password to join the webinar with maximum 10 characters',
			},
			{
				displayName: 'Practice Session',
				name: 'practiceSession',
				type: 'boolean',
				default: false,
				description: 'Whether to enable Practice session',
			},
			{
				displayName: 'Registration Type',
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
				description: 'Registration type. Used for recurring webinar with fixed time only.',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description:
					'Start time should be used only for scheduled or recurring webinar with fixed time',
			},
			{
				displayName: 'Timezone Name or ID',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description:
					'Time zone used in the response. The default is the time zone of the calendar. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Webinar Topic',
				name: 'topic',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Webinar Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Webinar',
						value: 5,
					},
					{
						name: 'Recurring Webinar with No Fixed Time',
						value: 6,
					},
					{
						name: 'Recurring Webinar with Fixed Time',
						value: 9,
					},
				],
				default: 5,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 webinar:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Webinar ID',
		name: 'webinarId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['webinar'],
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
				operation: ['get'],
				resource: ['webinar'],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'To view webinar details of a particular occurrence of the recurring webinar',
			},
			{
				displayName: 'Show Previous Occurrences',
				name: 'showPreviousOccurrences',
				type: 'boolean',
				default: false,
				description:
					'Whether to view webinar details of all previous occurrences of the recurring webinar',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 webinar:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['webinar'],
			},
		},
		description: 'User ID or email-ID',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['webinar'],
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
				resource: ['webinar'],
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
	/* -------------------------------------------------------------------------- */
	/*                                 webinar:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Webinar ID',
		name: 'webinarId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['webinarId'],
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
				operation: ['delete'],
				resource: ['webinar'],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Webinar occurrence ID',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 webinar:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Webinar ID',
		name: 'webinarId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['webinar'],
			},
		},
		description: 'User ID or email address of user',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['webinar'],
			},
		},
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: 'Webinar agenda',
			},
			{
				displayName: 'Alternative Hosts',
				name: 'alternativeHosts',
				type: 'string',
				default: '',
				description: 'Alternative hosts email IDs',
			},
			{
				displayName: 'Approval Type',
				name: 'approvalType',
				type: 'options',
				options: [
					{
						name: 'Automatically Approve',
						value: 0,
					},
					{
						name: 'Manually Approve',
						value: 1,
					},
					{
						name: 'No Registration Required',
						value: 2,
					},
				],
				default: 2,
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
				description: 'Determine how participants can join audio portion of the webinar',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Host Video',
				name: 'hostVideo',
				type: 'boolean',
				default: false,
				description: 'Whether to start video when host joins the webinar',
			},
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Webinar occurrence ID',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Password to join the webinar with maximum 10 characters',
			},
			{
				displayName: 'Panelists Video',
				name: 'panelistsVideo',
				type: 'boolean',
				default: false,
				description: 'Whether to start a video when panelists joins the webinar',
			},
			{
				displayName: 'Practice Session',
				name: 'practiceSession',
				type: 'boolean',
				default: false,
				description: 'Whether to enable Practice session',
			},
			{
				displayName: 'Registration Type',
				name: 'registrationType',
				type: 'options',
				options: [
					{
						name: 'Attendees Register Once and Can Attend Any of the Occurrences',
						value: 1,
					},
					{
						name: 'Attendees Need to Register for Every Occurrence',
						value: 2,
					},
					{
						name: 'Attendees Register Once and Can Choose One or More Occurrences to Attend',
						value: 3,
					},
				],
				default: 1,
				description: 'Registration type. Used for recurring webinars with fixed time only.',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description:
					'Start time should be used only for scheduled or recurring webinar with fixed time',
			},
			{
				displayName: 'Timezone Name or ID',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description:
					'Time zone used in the response. The default is the time zone of the calendar. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Webinar Topic',
				name: 'topic',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Webinar Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Webinar',
						value: 5,
					},
					{
						name: 'Recurring Webinar with No Fixed Time',
						value: 6,
					},
					{
						name: 'Recurring Webinar with Fixed Time',
						value: 9,
					},
				],
				default: 5,
			},
		],
	},
];
