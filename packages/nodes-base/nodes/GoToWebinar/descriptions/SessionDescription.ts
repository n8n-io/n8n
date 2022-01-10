import {
	INodeProperties,
} from 'n8n-workflow';

export const sessionOperations: INodeProperties[] = [
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
					'session',
				],
			},
		},
	},
];

export const sessionFields: INodeProperties[] = [
	// ----------------------------------
	//         session: getAll
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
					'session',
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
					'session',
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
					'session',
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
								description: 'Start of the datetime range for the session.',
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'toTime',
								type: 'dateTime',
								description: 'End of the datetime range for the session.',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Webinar Key',
				name: 'webinarKey',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWebinars',
				},
				default: {},
				description: 'Webinar by which to filter the sessions to retrieve.',
			},
		],
	},

	// ----------------------------------
	//      session: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description: 'Key of the webinar to which the session belongs.',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'get',
					'getDetails',
				],
			},
		},
	},
	{
		displayName: 'Session Key',
		name: 'sessionKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'get',
					'getDetails',
				],
			},
		},
	},

	// ----------------------------------
	//        session: getDetails
	// ----------------------------------
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		default: 'performance',
		options: [
			{
				name: 'Performance',
				value: 'performance',
				description: 'Performance details for a webinar session.',
			},
			{
				name: 'Polls',
				value: 'polls',
				description: 'Questions and answers for polls from a webinar session.',
			},
			{
				name: 'Questions',
				value: 'questions',
				description: 'Questions and answers for a past webinar session.',
			},
			{
				name: 'Surveys',
				value: 'surveys',
				description: 'Surveys for a past webinar session.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'getDetails',
				],
			},
		},
	},
];
