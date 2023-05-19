import type { INodeProperties } from 'n8n-workflow';

export const attendeeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an attendee',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many attendees',
			},
			{
				name: 'Get Details',
				value: 'getDetails',
				action: 'Get details of an attendee',
			},
		],
		displayOptions: {
			show: {
				resource: ['attendee'],
			},
		},
	},
];

export const attendeeFields: INodeProperties[] = [
	// ----------------------------------
	//     attendee: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: '',
		description:
			'Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['attendee'],
			},
		},
	},
	{
		displayName: 'Session Key Name or ID',
		name: 'sessionKey',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getWebinarSessions',
			loadOptionsDependsOn: ['webinarKey'],
		},
		default: '',
		description:
			'Key of the session that the attendee attended. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['attendee'],
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
		description: 'Registrant key of the attendee at the webinar session',
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['get'],
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
		description: 'Registrant key of the attendee at the webinar session',
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['getDetails'],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		required: true,
		default: '',
		description: 'The details to retrieve for the attendee',
		options: [
			{
				name: 'Polls',
				value: 'polls',
				description: 'Poll answers from the attendee in a webinar session',
			},
			{
				name: 'Questions',
				value: 'questions',
				description: 'Questions asked by the attendee in a webinar session',
			},
			{
				name: 'Survey Answers',
				value: 'surveyAnswers',
				description: 'Survey answers from the attendee in a webinar session',
			},
		],
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['getDetails'],
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
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
