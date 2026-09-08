import type { INodeProperties } from 'n8n-workflow';

export const sessionOperations: INodeProperties[] = [
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
				action: 'Get a session',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many sessions',
			},
			{
				name: 'Get details',
				value: 'getDetails',
				action: 'Get details on a session',
			},
		],
		displayOptions: {
			show: {
				resource: ['session'],
			},
		},
	},
];

export const sessionFields: INodeProperties[] = [
	// ----------------------------------
	//         session: getAll
	// ----------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['session'],
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
				resource: ['session'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Time range',
				name: 'times',
				type: 'fixedCollection',
				placeholder: 'Add time range',
				required: true,
				default: {},
				options: [
					{
						displayName: 'Times properties',
						name: 'timesProperties',
						values: [
							{
								displayName: 'Start time',
								name: 'fromTime',
								type: 'dateTime',
								description: 'Start of the datetime range for the session',
								default: '',
							},
							{
								displayName: 'End time',
								name: 'toTime',
								type: 'dateTime',
								description: 'End of the datetime range for the session',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Webinar key name or ID',
				name: 'webinarKey',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWebinars',
				},
				default: {},
				description:
					'Webinar by which to filter the sessions to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	// ----------------------------------
	//      session: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar key name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar to which the session belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['get', 'getDetails'],
			},
		},
	},
	{
		displayName: 'Session key',
		name: 'sessionKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['get', 'getDetails'],
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
				description: 'Performance details for a webinar session',
			},
			{
				name: 'Polls',
				value: 'polls',
				description: 'Questions and answers for polls from a webinar session',
			},
			{
				name: 'Questions',
				value: 'questions',
				description: 'Questions and answers for a past webinar session',
			},
			{
				name: 'Surveys',
				value: 'surveys',
				description: 'Surveys for a past webinar session',
			},
		],
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['getDetails'],
			},
		},
	},
];
