import {
	INodeProperties,
} from 'n8n-workflow';

export const attendeeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Get Details',
				value: 'getDetails',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},
];

export const attendeeFields: INodeProperties[] = [
	// ----------------------------------
	//     attendee: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: '',
		description: 'Key of the webinar that the attendee attended.',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},
	{
		displayName: 'Session Key',
		name: 'sessionKey',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getWebinarSessions',
			loadOptionsDependsOn: [
				'webinarKey',
			],
		},
		default: '',
		description: 'Key of the session that the attendee attended.',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},

	// ----------------------------------
	//          attendee: get
	// ----------------------------------
	{
		displayName: 'Registrant Key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Registrant key of the attendee at the webinar session.',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//       attendee: getDetails
	// ----------------------------------
	{
		displayName: 'Registrant Key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Registrant key of the attendee at the webinar session.',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'getDetails',
				],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		required: true,
		default: '',
		description: 'The details to retrieve for the attendee.',
		options: [
			{
				name: 'Polls',
				value: 'polls',
				description: 'Poll answers from the attendee in a webinar session.',
			},
			{
				name: 'Questions',
				value: 'questions',
				description: 'Questions asked by the attendee in a webinar session.',
			},
			{
				name: 'Survey Answers',
				value: 'surveyAnswers',
				description: 'Survey answers from the attendee in a webinar session.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'getDetails',
				],
			},
		},
	},

	// ----------------------------------
	//         attendee: getAll
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
					'attendee',
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
					'attendee',
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
];
